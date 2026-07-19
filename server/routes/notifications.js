import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';


const router = express.Router();

// Mock Notification preferences database object


// 1. GET /api/notifications/my
// Get in-app notifications for logged-in user
router.get('/my', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 2. PUT /api/notifications/read/:id
// Mark a notification as read
router.put('/read/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized status update' });
    }

    notification.isRead = true;
    await notification.save();
    return res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});



export default router;
