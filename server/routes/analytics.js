import express from 'express';
import { protect } from '../middleware/auth.js';
import TestSession from '../models/TestSession.js';

const router = express.Router();

// 1. GET /api/analytics/report/:sessionId
// Get individual session report with score, accuracy, time
router.get('/report/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TestSession.findById(sessionId).populate('testSeries', 'title description');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied to session report' });
    }

    const totalQuestions = session.responses.length;
    const correctAnswers = session.responses.filter(r => r.isCorrect).length;
    const wrongAnswers = totalQuestions - correctAnswers;
    
    let totalTime = 0;
    session.responses.forEach(r => totalTime += (r.timeSpent || 0));

    return res.status(200).json({
      sessionId: session._id,
      title: session.testSeries?.title || 'Unknown Test',
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      score: session.totalScore,
      percentile: session.percentile,
      totalTimeSpent: totalTime, // in seconds
      currentTheta: session.currentTheta
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 2. GET /api/analytics/skills/:sessionId
// Get category-wise/skill-wise performance report
router.get('/skills/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TestSession.findById(sessionId).populate('responses.questionId');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Grouping responses by category
    const categories = {};

    session.responses.forEach((resp) => {
      const q = resp.questionId;
      if (!q) return;

      const cat = q.category || 'general';
      if (!categories[cat]) {
        categories[cat] = {
          category: cat,
          total: 0,
          correct: 0,
          timeSpent: 0,
        };
      }

      categories[cat].total += 1;
      if (resp.isCorrect) categories[cat].correct += 1;
      categories[cat].timeSpent += resp.timeSpent || 0;
    });

    const categoryBreakdown = Object.values(categories).map((c) => ({
      category: c.category,
      total: c.total,
      correct: c.correct,
      accuracy: parseFloat(((c.correct / c.total) * 100).toFixed(2)),
      averageTime: parseFloat((c.timeSpent / c.total).toFixed(1)),
    }));

    return res.status(200).json({ categoryBreakdown });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


// 6. GET /api/analytics/export-pdf/:sessionId
// Generate download token for PDF score card
router.get('/export-pdf/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TestSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Mock generation token
    const pdfToken = `pdf-report-token-${session._id}-${Date.now()}`;
    return res.status(200).json({
      downloadUrl: `/api/analytics/download-report?token=${pdfToken}`,
      sessionId: session._id,
      exportDate: new Date()
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
