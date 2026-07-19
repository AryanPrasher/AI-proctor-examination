import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import TestSession from '../models/TestSession.js';
import TestSeries from '../models/TestSeries.js';
import Question from '../models/Question.js';

const router = express.Router();

// Helper to calculate score and accuracy
const calculateSessionScore = (responses) => {
  const correctCount = responses.filter(r => r.isCorrect).length;
  const totalCount = responses.length;
  const score = totalCount > 0 ? parseFloat(((correctCount / totalCount) * 100).toFixed(2)) : 0;
  return score;
};

// 1. POST /api/sessions/start
// Start standard or adaptive test session
router.post('/start', protect, async (req, res) => {
  try {
    const { testSeriesId } = req.body;

    const testSeries = await TestSeries.findById(testSeriesId);
    if (!testSeries) {
      return res.status(404).json({ message: 'Test Series not found' });
    }

    // Verify purchase for premium tests
    if (testSeries.isPremium && !req.user.purchasedTestSeries.includes(testSeriesId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Premium test series must be purchased' });
    }

    // Check if an active session already exists for this test series
    let session = await TestSession.findOne({
      user: req.user._id,
      testSeries: testSeriesId,
      status: 'active'
    });

    if (session) {
      return res.status(200).json({ message: 'Active session resumed', session });
    }

    session = new TestSession({
      user: req.user._id,
      testSeries: testSeriesId,
      currentTheta: 0.0,
      abilityHistory: [0.0],
      responses: [],
      currentQuestionIndex: 0,
      startTime: new Date(),
      status: 'active',
      reviewStatus: 'clean',
    });

    await session.save();
    return res.status(201).json({ message: 'Session started successfully', session });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


// 3. POST /api/sessions/resume
// Resume an existing active session, fetch progress
router.post('/resume', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await TestSession.findById(sessionId).populate('testSeries');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized session access' });
    }

    return res.status(200).json({ message: 'Session loaded', session });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. POST /api/sessions/end
// Submit/finish test session, calculate final score and percentile rank
router.post('/end', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await TestSession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access to end session' });
    }

    if (req.body.action === 'disqualify') {
      session.status = 'disqualified';
      session.reviewStatus = 'confirmed-cheat';
      session.totalScore = 0;
      session.percentile = 0;
      session.endTime = new Date();
      await session.save();
      return res.status(200).json({ message: 'Session auto-disqualified due to security violations', session });
    }

    if (session.status === 'completed' || session.status === 'disqualified') {
      return res.status(200).json({ message: 'Session already finalized', session });
    }

    session.status = 'completed';
    session.endTime = new Date();
    session.totalScore = calculateSessionScore(session.responses);

    // Calculate Percentile
    // Percentile = (Number of sessions with score < currentScore) / Total completed sessions * 100
    const otherCompletedSessions = await TestSession.find({
      testSeries: session.testSeries,
      status: 'completed',
      _id: { $ne: session._id }
    });

    const totalCompetitors = otherCompletedSessions.length;
    if (totalCompetitors > 0) {
      const scoringLower = otherCompletedSessions.filter(s => s.totalScore < session.totalScore).length;
      session.percentile = parseFloat(((scoringLower / totalCompetitors) * 100).toFixed(2));
    } else {
      session.percentile = 100.0; // Solo test taker gets 100th percentile
    }

    await session.save();
    return res.status(200).json({ message: 'Session completed successfully', session });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 5. GET /api/sessions/my-sessions
// Get list of sessions taken by the current test-taker
router.get('/my-sessions', protect, async (req, res) => {
  try {
    const sessions = await TestSession.find({ user: req.user._id })
      .populate('testSeries', 'title description isPremium')
      .sort({ createdAt: -1 });

    return res.status(200).json({ sessions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


export default router;
