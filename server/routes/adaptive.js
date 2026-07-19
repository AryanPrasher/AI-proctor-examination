import express from 'express';
import { protect } from '../middleware/auth.js';
import TestSession from '../models/TestSession.js';
import Question from '../models/Question.js';
import TestSeries from '../models/TestSeries.js';
import { estimateThetaEAP, getItemInformation } from '../services/irtEngine.js';

const router = express.Router();


// a. GET /api/adaptive/next-question – Start/resume and fetch next item
router.get('/next-question', protect, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    const session = await TestSession.findById(sessionId).populate('testSeries');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Auto-resume if paused
    if (session.status === 'paused') {
      session.status = 'active';
      await session.save();
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: `Session status is ${session.status}` });
    }

    // Filter out answered and skipped questions
    const answeredIds = session.responses.map(r => r.questionId.toString());
    const skippedIds = (session.skippedQuestions || []).map(id => id.toString());
    const excludedIds = [...answeredIds, ...skippedIds];

    const testSeries = await TestSeries.findById(session.testSeries._id).populate('questions');
    const availableQuestions = (testSeries.questions || []).filter(
      (q) => !excludedIds.includes(q._id.toString())
    );

    if (availableQuestions.length === 0) {
      // Completed - auto finalize
      session.status = 'completed';
      session.endTime = new Date();
      await session.save();
      return res.status(200).json({ message: 'No more questions available. Test completed.', finished: true });
    }

    // Select the question with the maximum Item Information Function (IIF) at current theta
    let bestQuestion = null;
    let maxInfo = -Infinity;

    for (const q of availableQuestions) {
      const info = getItemInformation(session.currentTheta, q.discrimination, q.difficulty, q.guessing);
      if (info > maxInfo) {
        maxInfo = info;
        bestQuestion = q;
      }
    }

    if (!bestQuestion) {
      return res.status(500).json({ message: 'Could not select an appropriate question.' });
    }

    // Hide correct answer index from the client for security
    const questionObj = {
      _id: bestQuestion._id,
      text: bestQuestion.text,
      options: bestQuestion.options,
      category: bestQuestion.category,
      difficulty: bestQuestion.difficulty,
      discrimination: bestQuestion.discrimination,
    };

    return res.status(200).json({ question: questionObj, finished: false });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// b. POST /api/adaptive/submit-response – Submit answer, update theta, receive feedback
router.post('/submit-response', protect, async (req, res) => {
  try {
    const { sessionId, questionId, selectedOptionIndex, timeSpent } = req.body;
    if (!sessionId || !questionId || selectedOptionIndex === undefined) {
      return res.status(400).json({ message: 'Session ID, question ID, and answer index are required' });
    }

    const session = await TestSession.findById(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(404).json({ message: 'Active session not found' });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Verify question is not already answered or skipped
    const alreadyAnswered = session.responses.some(r => r.questionId.toString() === questionId);
    if (alreadyAnswered) {
      return res.status(400).json({ message: 'Question already answered' });
    }

    const isCorrect = question.correctOptionIndex === Number(selectedOptionIndex);

    // Fetch parameters for all answered questions, including this new response
    const previousResponses = [];
    for (const resItem of session.responses) {
      const q = await Question.findById(resItem.questionId);
      if (q) {
        previousResponses.push({
          isCorrect: resItem.isCorrect,
          a: q.discrimination,
          b: q.difficulty,
          c: q.guessing,
        });
      }
    }
    previousResponses.push({
      isCorrect,
      a: question.discrimination,
      b: question.difficulty,
      c: question.guessing,
    });

    // Estimate new theta ability and Standard Error (SE)
    const { theta, standardError } = estimateThetaEAP(previousResponses);

    // Record response details
    session.responses.push({
      questionId,
      selectedOptionIndex: Number(selectedOptionIndex),
      isCorrect,
      timeSpent: Number(timeSpent) || 0,
      thetaAfter: theta,
    });

    session.currentTheta = theta;
    session.abilityHistory.push(theta);
    session.currentQuestionIndex += 1;

    await session.save();

    return res.status(200).json({
      message: 'Response submitted successfully',
      isCorrect,
      correctOptionIndex: question.correctOptionIndex,
      newTheta: theta,
      standardError,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
