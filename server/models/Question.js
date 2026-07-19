import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: [
        (val) => val.length >= 2,
        'A question must have at least 2 options',
      ],
    },
    correctOptionIndex: {
      type: Number,
      required: [true, 'Correct option index is required'],
      min: [0, 'Index cannot be negative'],
    },
    difficulty: {
      type: Number, // b parameter in IRT (default standard range -3.0 to +3.0)
      default: 0.0,
    },
    discrimination: {
      type: Number, // a parameter in IRT (default range 0.5 to 2.5)
      default: 1.0,
    },
    guessing: {
      type: Number, // c parameter in IRT (default range 0.0 to 0.25)
      default: 0.25,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast retrieval by category/status during adaptive tests
questionSchema.index({ category: 1, status: 1 });
questionSchema.index({ status: 1 });

const Question = mongoose.model('Question', questionSchema);
export default Question;
