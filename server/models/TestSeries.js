import mongoose from 'mongoose';

const testSeriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Test Series title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    maxViolationsAllowed: {
      type: Number,
      default: 3,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

testSeriesSchema.index({ isPremium: 1 });

const TestSeries = mongoose.model('TestSeries', testSeriesSchema);
export default TestSeries;
