import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  selectedOptionIndex: {
    type: Number,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  timeSpent: {
    type: Number, // In seconds
    default: 0,
  },
  thetaAfter: {
    type: Number, // Estimated ability level after this response
    required: true,
  },
});

const flagSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['tab-switch', 'face-not-visible', 'multiple-faces', 'device-detected'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  adminComment: {
    type: String,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
});

const testSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    testSeries: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSeries',
      required: true,
    },
    currentTheta: {
      type: Number, // User's estimated ability level
      default: 0.0,
    },
    abilityHistory: {
      type: [Number],
      default: [0.0],
    },
    responses: [responseSchema],
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'disqualified'],
      default: 'active',
    },
    reviewStatus: {
      type: String,
      enum: ['clean', 'pending', 'confirmed-cheat', 'dismissed'],
      default: 'clean',
    },
    proctoringFlags: [flagSchema],
    totalScore: {
      type: Number,
      default: 0,
    },
    percentile: {
      type: Number,
      default: 0.0,
    },
    bookmarkedQuestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      }
    ],
    skippedQuestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      }
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for user session queries and analytics
testSessionSchema.index({ user: 1, testSeries: 1 });
testSessionSchema.index({ status: 1 });
testSessionSchema.index({ reviewStatus: 1 });
testSessionSchema.index({ percentile: 1 });

const TestSession = mongoose.model('TestSession', testSessionSchema);
export default TestSession;
