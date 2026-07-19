import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import User from '../models/User.js';
import TestSession from '../models/TestSession.js';
import AuditLog from '../models/AuditLog.js';
import Question from '../models/Question.js';

const router = express.Router();

// 1. GET /api/admin/dashboard-stats
// Get overall system stats: active users, total sales, flagged tests count
router.get('/dashboard-stats', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSessions = await TestSession.countDocuments({ status: 'active' });
    const pendingFlags = await TestSession.countDocuments({ reviewStatus: 'pending' });
    
    // Calculate total mock revenue (free + premium sales summary)
    const completedPremiumSessions = await TestSession.find({ status: 'completed' })
      .populate('testSeries', 'price isPremium');
    
    let totalRevenue = 0;
    completedPremiumSessions.forEach((s) => {
      if (s.testSeries && s.testSeries.isPremium) {
        totalRevenue += s.testSeries.price || 0;
      }
    });

    const totalQuestions = await Question.countDocuments({ status: 'active' });

    return res.status(200).json({
      totalUsers,
      activeSessions,
      pendingFlags,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalQuestions
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 2. GET /api/admin/users
// List all registered users with filters
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, limit, skip } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const queryLimit = limit ? Number(limit) : 50;
    const querySkip = skip ? Number(skip) : 0;

    const users = await User.find(filter)
      .select('-password')
      .skip(querySkip)
      .limit(queryLimit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return res.status(200).json({ users, total, limit: queryLimit, skip: querySkip });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 3. PUT /api/admin/users/:userId/role
// Update a user's role
router.put('/users/:userId/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['test-taker', 'content-creator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selection' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    // Log admin activity
    const audit = new AuditLog({
      action: 'CHANGE_USER_ROLE',
      performedBy: req.user._id,
      details: { userId, previousRole, newRole: role }
    });
    await audit.save();

    return res.status(200).json({ message: 'User role updated successfully', user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. GET /api/admin/audit-logs
// View system audit logs
router.get('/audit-logs', protect, authorize('admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({ logs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 5. GET /api/admin/export-data
// Export platform data to JSON/CSV
router.get('/export-data', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('name email role createdAt');
    const sessionsCount = await TestSession.countDocuments();
    const questionsCount = await Question.countDocuments();

    const exportPayload = {
      exportTimestamp: new Date(),
      systemSummary: {
        totalUsers: users.length,
        totalSessions: sessionsCount,
        totalQuestions: questionsCount
      },
      users
    };

    return res.status(200).json({
      fileName: `ai-proctor-export-${Date.now()}.json`,
      payload: exportPayload
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
