import express from 'express';
import { protect } from '../middleware/auth.js';
import TestSession from '../models/TestSession.js';
import User from '../models/User.js';

const router = express.Router();

// 1. GET /api/leaderboards/global
// Get global leaderboard ranking by overall estimated ability/score
router.get('/global', protect, async (req, res) => {
  try {
    // Group completed sessions by user, get the maximum currentTheta of each user
    const usersRank = await TestSession.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$user',
          maxTheta: { $max: '$currentTheta' },
          maxScore: { $max: '$totalScore' },
          sessionsCount: { $sum: 1 },
          lastSessionAt: { $max: '$endTime' }
        }
      },
      { $sort: { maxTheta: -1, maxScore: -1 } },
      { $limit: 100 }
    ]);

    // Populate user names and emails manually
    const leaderboard = [];
    for (let i = 0; i < usersRank.length; i++) {
      const entry = usersRank[i];
      const user = await User.findById(entry._id).select('name email role');
      if (user && user.role !== 'admin') {
        leaderboard.push({
          rank: leaderboard.length + 1,
          userId: entry._id,
          name: user.name,
          email: user.email,
          maxTheta: entry.maxTheta,
          maxScore: entry.maxScore,
          sessionsCount: entry.sessionsCount,
          lastSessionAt: entry.lastSessionAt
        });
      }
    }

    return res.status(200).json({ leaderboard });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 2. GET /api/leaderboards/test-series/:testSeriesId
// Get leaderboard for a specific test series
router.get('/test-series/:testSeriesId', protect, async (req, res) => {
  try {
    const { testSeriesId } = req.params;

    // Retrieve best completed attempt for each user in this test series
    const sessions = await TestSession.aggregate([
      { $match: { testSeries: testSeriesId, status: 'completed' } },
      {
        $group: {
          _id: '$user',
          sessionId: { $first: '$_id' },
          bestScore: { $max: '$totalScore' },
          theta: { $max: '$currentTheta' },
          completedAt: { $max: '$endTime' }
        }
      },
      { $sort: { bestScore: -1, theta: -1 } },
      { $limit: 50 }
    ]);

    const leaderboard = [];
    for (let i = 0; i < sessions.length; i++) {
      const entry = sessions[i];
      const user = await User.findById(entry._id).select('name email');
      if (user) {
        leaderboard.push({
          rank: i + 1,
          userId: entry._id,
          sessionId: entry.sessionId,
          name: user.name,
          bestScore: entry.bestScore,
          theta: entry.theta,
          completedAt: entry.completedAt
        });
      }
    }

    return res.status(200).json({ leaderboard });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 3. GET /api/leaderboards/user-rank/:testSeriesId
// Get specific user's rank, score, and surrounding peer list (neighbors)
router.get('/user-rank/:testSeriesId', protect, async (req, res) => {
  try {
    const { testSeriesId } = req.params;
    const userId = req.user._id;

    // Get all completed scores sorted descending
    const allScores = await TestSession.aggregate([
      { $match: { testSeries: testSeriesId, status: 'completed' } },
      {
        $group: {
          _id: '$user',
          bestScore: { $max: '$totalScore' },
          theta: { $max: '$currentTheta' }
        }
      },
      { $sort: { bestScore: -1, theta: -1 } }
    ]);

    const userIndex = allScores.findIndex(s => s._id.toString() === userId.toString());
    
    if (userIndex === -1) {
      return res.status(200).json({
        userRank: null,
        message: 'No completed session found for this user in this series',
        peers: []
      });
    }

    const userRank = userIndex + 1;
    const userBest = allScores[userIndex];

    // Get adjacent peers: up to 2 above and 2 below
    const startIdx = Math.max(0, userIndex - 2);
    const endIdx = Math.min(allScores.length - 1, userIndex + 2);
    
    const peers = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const entry = allScores[i];
      const user = await User.findById(entry._id).select('name');
      peers.push({
        rank: i + 1,
        userId: entry._id,
        name: user ? user.name : 'Unknown',
        bestScore: entry.bestScore,
        theta: entry.theta,
        isCurrentUser: entry._id.toString() === userId.toString()
      });
    }

    return res.status(200).json({
      userRank,
      bestScore: userBest.bestScore,
      theta: userBest.theta,
      peers
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. GET /api/leaderboards/trends
// Get top performers of the week/month (sessions completed in last 30 days)
router.get('/trends', protect, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendSessions = await TestSession.find({
      status: 'completed',
      endTime: { $gte: thirtyDaysAgo }
    })
    .populate('user', 'name email')
    .populate('testSeries', 'title')
    .sort({ totalScore: -1, currentTheta: -1 })
    .limit(10);

    const trends = trendSessions.map((s, index) => ({
      rank: index + 1,
      name: s.user?.name || 'Anonymous',
      testTitle: s.testSeries?.title || 'Mock Test',
      score: s.totalScore,
      theta: s.currentTheta,
      date: s.endTime
    }));

    return res.status(200).json({ trends });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});



export default router;
