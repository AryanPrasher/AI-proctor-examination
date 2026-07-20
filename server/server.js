import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/auth.js';
import adaptiveRoutes from './routes/adaptive.js';
import sessionRoutes from './routes/sessions.js';
import proctoringRoutes from './routes/proctoring.js';
import reviewRoutes from './routes/reviews.js';
import questionRoutes from './routes/questions.js';
import analyticsRoutes from './routes/analytics.js';
import paymentRoutes from './routes/payments.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import leaderboardRoutes from './routes/leaderboards.js';

// Load config
dotenv.config();

// Connect Database
connectDB().then(async () => {
  try {
    const count = await (await import('./models/User.js')).default.countDocuments();
    if (count === 0) {
      await (await import('./seedInline.js')).default();
    }
  } catch (err) {
    console.error('Auto seeding failed:', err);
  }
});

const app = express();

// Middleware
app.use(cors());

// Special stripe webhook raw body parser requirement (must run before standard json parser)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboards', leaderboardRoutes);

// Root & Health Check API
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'AI Proctor Examination Backend API is running!',
    status: 'healthy',
    documentation: '/api',
    health: '/health'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const startServer = (port) => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && process.env.NODE_ENV !== 'production') {
      console.warn(`Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(err);
    }
  });
};

const PORT = process.env.PORT || 5000;
startServer(Number(PORT));

export { app };
