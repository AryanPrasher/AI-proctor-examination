import User from './models/User.js';
import Question from './models/Question.js';
import TestSeries from './models/TestSeries.js';

const seedInline = async () => {
  try {
    console.log('Automatic seed sequence: Seeding initial data...');
    
    // Create Admin
    await User.create({
      name: 'Admin User',
      email: 'admin@apex.com',
      password: 'password',
      role: 'admin',
    });

    // Create Creator
    const creator = await User.create({
      name: 'Content Creator',
      email: 'creator@apex.com',
      password: 'password',
      role: 'content-creator',
    });

    // Create Candidate
    await User.create({
      name: 'Demo Candidate',
      email: 'candidate@apex.com',
      password: 'password',
      role: 'test-taker',
    });

    console.log('Seeded Users: admin@apex.com, creator@apex.com, candidate@apex.com (password: password)');

    const questionsData = [
      {
        text: 'What is the value of 5x - 3 when x = 4?',
        options: ['17', '12', '23', '9'],
        correctOptionIndex: 0,
        difficulty: -1.5,
        discrimination: 1.2,
        guessing: 0.25,
        category: 'math',
        creatorId: creator._id,
      },
      {
        text: 'Solve for x: x / 3 = 12',
        options: ['4', '36', '15', '9'],
        correctOptionIndex: 1,
        difficulty: -1.2,
        discrimination: 1.1,
        guessing: 0.25,
        category: 'math',
        creatorId: creator._id,
      },
      {
        text: 'If 3x + 7 = 31, what is the value of x^2?',
        options: ['64', '49', '36', '81'],
        correctOptionIndex: 0,
        difficulty: 0.0,
        discrimination: 1.4,
        guessing: 0.25,
        category: 'math',
        creatorId: creator._id,
      },
      {
        text: 'A train travels at 60 mph. How many miles does it cover in 150 minutes?',
        options: ['120', '150', '90', '180'],
        correctOptionIndex: 1,
        difficulty: 0.2,
        discrimination: 1.3,
        guessing: 0.25,
        category: 'math',
        creatorId: creator._id,
      },
      {
        text: 'What is the sum of the infinite geometric series: 12 + 4 + 4/3 + 4/9 + ...?',
        options: ['16', '18', '24', '20'],
        correctOptionIndex: 1,
        difficulty: 1.5,
        discrimination: 1.6,
        guessing: 0.25,
        category: 'math',
        creatorId: creator._id,
      },
      {
        text: 'Determine the probability of drawing 2 aces consecutively from a deck of 52 cards without replacement.',
        options: ['1 / 221', '1 / 169', '4 / 663', '1 / 13'],
        correctOptionIndex: 0,
        difficulty: 1.8,
        discrimination: 1.5,
        guessing: 0.25,
        category: 'math',
        creatorId: creator._id,
      },
      {
        text: 'Choose the antonym of "Amicable".',
        options: ['Friendly', 'Hostile', 'Quiet', 'Active'],
        correctOptionIndex: 1,
        difficulty: -1.4,
        discrimination: 1.2,
        guessing: 0.25,
        category: 'verbal',
        creatorId: creator._id,
      },
      {
        text: 'Identify the synonym of "Candid".',
        options: ['Honest', 'Secretive', 'Vague', 'Sweet'],
        correctOptionIndex: 0,
        difficulty: -1.0,
        discrimination: 1.0,
        guessing: 0.25,
        category: 'verbal',
        creatorId: creator._id,
      },
      {
        text: 'Complete the sentence: Her arguments were ________, leaving no room for disagreement.',
        options: ['Ambiguous', 'Cogent', 'Frivolous', 'Elusive'],
        correctOptionIndex: 1,
        difficulty: 0.1,
        discrimination: 1.3,
        guessing: 0.25,
        category: 'verbal',
        creatorId: creator._id,
      },
      {
        text: 'Choose the synonym of "Pusillanimous".',
        options: ['Brave', 'Timorous', 'Generous', 'Indifferent'],
        correctOptionIndex: 1,
        difficulty: 1.6,
        discrimination: 1.5,
        guessing: 0.25,
        category: 'verbal',
        creatorId: creator._id,
      }
    ];

    const questions = await Question.insertMany(questionsData);
    console.log(`Seeded ${questions.length} questions.`);

    // Create Free Test Series
    await TestSeries.create({
      title: 'Free Basic Mock Test Series',
      description: 'Introductory adaptive Mock Test covering general Math and Verbal questions.',
      price: 0,
      isPremium: false,
      questions: [questions[0]._id, questions[2]._id, questions[4]._id, questions[6]._id, questions[8]._id],
      creatorId: creator._id
    });

    // Create Premium Test Series
    await TestSeries.create({
      title: 'Advanced GMAT Premium Prep Series',
      description: 'High-discrimination math and verbal items tailored for top percentile scores.',
      price: 19.99,
      isPremium: true,
      questions: [questions[1]._id, questions[3]._id, questions[5]._id, questions[7]._id, questions[9]._id],
      creatorId: creator._id
    });

    console.log('Seeded mock test packages.');
  } catch (error) {
    console.error('Seeding inline error:', error.message);
  }
};

export default seedInline;
