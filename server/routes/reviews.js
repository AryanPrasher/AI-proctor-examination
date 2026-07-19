import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import TestSession from '../models/TestSession.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// 1. GET /api/reviews/flagged-sessions
// Admin: Get all sessions flagged for cheating/review (or containing flags)
router.get('/flagged-sessions', protect, authorize('admin'), async (req, res) => {
  try {
    const flagged = await TestSession.find({
      $or: [
        { reviewStatus: 'pending' },
        { reviewStatus: 'confirmed-cheat' },
        { 'proctoringFlags.0': { $exists: true } }
      ]
    })
    .populate('user', 'name email')
    .populate('testSeries', 'title')
    .sort({ updatedAt: -1 });

    return res.status(200).json({ flagged });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 2. GET /api/reviews/session-timeline/:sessionId
// Admin: Get detailed temporal timeline of flags for a session
router.get('/session-timeline/:sessionId', protect, authorize('admin'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TestSession.findById(sessionId)
      .populate('user', 'name email')
      .populate('testSeries', 'title')
      .populate('responses.questionId', 'text category');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Merge answers and proctoring flags into a single chronological timeline
    const timeline = [];

    // Add start event
    timeline.push({
      time: session.startTime,
      type: 'session-start',
      description: 'Test session started'
    });

    // Add responses
    session.responses.forEach((resItem, index) => {
      // Calculate approximate timestamp based on accumulated times or just order
      timeline.push({
        time: new Date(session.startTime.getTime() + (index * 60 * 1000)), // Approximate slot
        type: 'answer',
        description: `Answered question ${index + 1} (${resItem.isCorrect ? 'Correct' : 'Incorrect'})`,
        details: {
          question: resItem.questionId?.text || 'N/A',
          category: resItem.questionId?.category || 'N/A',
          timeSpent: resItem.timeSpent,
          thetaAfter: resItem.thetaAfter
        }
      });
    });

    // Add proctoring flags
    session.proctoringFlags.forEach((flag) => {
      timeline.push({
        time: flag.timestamp,
        type: 'violation-flag',
        description: `Proctoring Flag: ${flag.eventType}`,
        details: {
          severity: flag.severity,
          resolved: flag.resolved,
          adminComment: flag.adminComment,
          metadata: flag.metadata || null
        }
      });
    });

    // Add end event
    if (session.endTime) {
      timeline.push({
        time: session.endTime,
        type: 'session-end',
        description: `Session completed. Final Score: ${session.totalScore}%, Percentile: ${session.percentile}`
      });
    }

    // Sort timeline chronologically
    timeline.sort((a, b) => new Date(a.time) - new Date(b.time));

    return res.status(200).json({ session, timeline });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 3. PUT /api/reviews/status/:sessionId
// Admin: Update review status of a session (clean, pending, confirmed-cheat, dismissed)
router.put('/status/:sessionId', protect, authorize('admin'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reviewStatus } = req.body;

    if (!['clean', 'pending', 'confirmed-cheat', 'dismissed'].includes(reviewStatus)) {
      return res.status(400).json({ message: 'Invalid review status value' });
    }

    const session = await TestSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.reviewStatus = reviewStatus;
    if (reviewStatus === 'confirmed-cheat') {
      session.status = 'disqualified';
    } else if (reviewStatus === 'dismissed' && session.status === 'disqualified') {
      session.status = 'completed'; // Revert if dismissed
    }

    await session.save();

    // Log admin action
    const log = new AuditLog({
      action: 'UPDATE_REVIEW_STATUS',
      performedBy: req.user._id,
      details: { sessionId, reviewStatus }
    });
    await log.save();

    return res.status(200).json({ message: 'Review status updated successfully', session });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. POST /api/reviews/comment/:sessionId
// Admin: Add notes/comments to the review history or individual flag
router.post('/comment/:sessionId', protect, authorize('admin'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { commentText, flagId } = req.body;

    const session = await TestSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (flagId) {
      // Commenting on a specific flag
      const flag = session.proctoringFlags.id(flagId);
      if (flag) {
        flag.adminComment = commentText;
        flag.resolved = true;
      }
    } else {
      // General comment on session review
      session.proctoringFlags.push({
        eventType: 'tab-switch', // Dummy trigger type to store note in flags
        severity: 'low',
        resolved: true,
        adminComment: `[General Admin Note] ${commentText}`
      });
    }

    await session.save();
    return res.status(200).json({ message: 'Comment saved successfully', session });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 5. PUT /api/reviews/disqualify/:sessionId
// Admin: Disqualify a candidate and void their test score
router.put('/disqualify/:sessionId', protect, authorize('admin'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = await TestSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'disqualified';
    session.reviewStatus = 'confirmed-cheat';
    session.totalScore = 0;
    session.percentile = 0;

    // Log general note
    session.proctoringFlags.push({
      eventType: 'tab-switch',
      severity: 'high',
      resolved: true,
      adminComment: `Disqualified by Admin. Reason: ${reason || 'Cheating confirmed'}`
    });

    await session.save();

    // Log admin action
    const log = new AuditLog({
      action: 'DISQUALIFY_SESSION',
      performedBy: req.user._id,
      details: { sessionId, reason }
    });
    await log.save();

    return res.status(200).json({ message: 'Candidate disqualified, score nullified', session });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
