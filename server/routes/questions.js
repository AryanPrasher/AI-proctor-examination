import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import Question from '../models/Question.js';
import TestSeries from '../models/TestSeries.js';

const router = express.Router();

// 1. POST /api/questions/create
// Creator/Admin: Create a new question with IRT parameters
router.post('/create', protect, authorize('admin', 'content-creator'), async (req, res) => {
  try {
    const { text, options, correctOptionIndex, difficulty, discrimination, guessing, category } = req.body;

    const question = new Question({
      text,
      options,
      correctOptionIndex,
      difficulty: difficulty !== undefined ? Number(difficulty) : 0.0,
      discrimination: discrimination !== undefined ? Number(discrimination) : 1.0,
      guessing: guessing !== undefined ? Number(guessing) : 0.25,
      category,
      creatorId: req.user._id,
      status: 'active'
    });

    await question.save();
    return res.status(201).json({ message: 'Question created successfully', question });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


// 3. DELETE /api/questions/delete/:id
// Creator/Admin: Delete or archive a question
router.delete('/delete/:id', protect, authorize('admin', 'content-creator'), async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.creatorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized delete action' });
    }

    question.status = 'archived';
    await question.save();
    return res.status(200).json({ message: 'Question archived/deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. GET /api/questions/list
// Creator/Admin: List/search questions
router.get('/list', protect, authorize('admin', 'content-creator'), async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    else filter.status = 'active';

    const questions = await Question.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ questions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 5. POST /api/questions/bulk-import
// Creator/Admin: Bulk upload questions via JSON array
router.post('/bulk-import', protect, authorize('admin', 'content-creator'), async (req, res) => {
  try {
    const { questions } = req.body; // Expect array of questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty questions array' });
    }

    const docs = questions.map((q) => ({
      text: q.text,
      options: q.options,
      correctOptionIndex: Number(q.correctOptionIndex),
      difficulty: q.difficulty !== undefined ? Number(q.difficulty) : 0.0,
      discrimination: q.discrimination !== undefined ? Number(q.discrimination) : 1.0,
      guessing: q.guessing !== undefined ? Number(q.guessing) : 0.25,
      category: q.category || 'general',
      creatorId: req.user._id,
      status: 'active'
    }));

    const imported = await Question.insertMany(docs);
    return res.status(201).json({ message: `Successfully imported ${imported.length} questions`, count: imported.length });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 6. POST /api/test-series/create
// Creator/Admin: Create/edit a Test Series package including pricing
router.post('/test-series/create', protect, authorize('admin', 'content-creator'), async (req, res) => {
  try {
    const { id, title, description, price, isPremium, questions, maxViolationsAllowed } = req.body;

    if (id) {
      // Update
      const series = await TestSeries.findById(id);
      if (!series) {
        return res.status(404).json({ message: 'Test Series not found' });
      }
      if (series.creatorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized test series modification' });
      }

      series.title = title || series.title;
      series.description = description || series.description;
      series.price = price !== undefined ? Number(price) : series.price;
      series.isPremium = isPremium !== undefined ? Boolean(isPremium) : series.isPremium;
      series.maxViolationsAllowed = maxViolationsAllowed !== undefined ? Number(maxViolationsAllowed) : series.maxViolationsAllowed;
      if (questions) series.questions = questions;

      await series.save();
      return res.status(200).json({ message: 'Test Series updated', testSeries: series });
    } else {
      // Create new
      const series = new TestSeries({
        title,
        description,
        price: price !== undefined ? Number(price) : 0.0,
        isPremium: isPremium !== undefined ? Boolean(isPremium) : false,
        maxViolationsAllowed: maxViolationsAllowed !== undefined ? Number(maxViolationsAllowed) : 3,
        questions: questions || [],
        creatorId: req.user._id
      });

      await series.save();
      return res.status(201).json({ message: 'Test Series created successfully', testSeries: series });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
