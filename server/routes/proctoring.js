import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import TestSession from '../models/TestSession.js';
import Notification from '../models/Notification.js';

const router = express.Router();


// 1. POST /api/proctoring/log-event
// Log a cheat/violation flag: tab-switch, face-not-visible, multiple-faces
router.post('/log-event', protect, async (req, res) => {
  try {
    const { sessionId, eventType, severity, metadata } = req.body;

    const session = await TestSession.findById(sessionId).populate('testSeries');
    if (!session || (session.status !== 'active' && session.status !== 'paused')) {
      return res.status(404).json({ message: 'Active session not found' });
    }

    if (session.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized session modification' });
    }

    let normalizedEventType = eventType;
    if (eventType === 'DEVICE_DETECTED') {
      normalizedEventType = 'device-detected';
    }

    // Append flag
    session.proctoringFlags.push({
      eventType: normalizedEventType,
      timestamp: new Date(),
      severity: severity || 'medium',
      resolved: false,
      metadata: metadata || null,
    });

    // Check thresholds for auto alert
    const flagsCount = session.proctoringFlags.filter(f => f.eventType === normalizedEventType).length;
    
    // Create an in-app notification alert for warning the user
    if (flagsCount >= 2) {
      const alertNotification = new Notification({
        user: req.user._id,
        title: 'Proctoring Warning',
        message: `System flagged repeated '${normalizedEventType}' events during your session. Continuous violations may lead to disqualification.`,
        type: 'alert',
      });
      await alertNotification.save();
    }

    // Trigger auto-disqualify if total flags exceed specific test-series threshold
    const maxAllowed = session.testSeries?.maxViolationsAllowed || 3;
    const totalViolations = session.proctoringFlags.length;
    if (totalViolations >= maxAllowed) {
      session.status = 'disqualified';
      session.reviewStatus = 'confirmed-cheat';
    } else if (totalViolations >= Math.ceil(maxAllowed / 2) && session.reviewStatus === 'clean') {
      // Flag for review when violations reach 50% of the limit
      session.reviewStatus = 'pending';
    }

    await session.save();
    return res.status(201).json({ message: 'Proctoring event logged successfully', session });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


// 4. POST /api/proctoring/verify-webcam
// Verify webcam availability and pre-check face visibility before starting test
router.post('/verify-webcam', protect, async (req, res) => {
  try {
    const { status } = req.body; // e.g. "success", "failed"
    if (status === 'success') {
      return res.status(200).json({ message: 'Webcam verification checklist complete', verified: true });
    }
    return res.status(400).json({ message: 'Webcam verification failed. Access is required to start.', verified: false });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


export default router;
