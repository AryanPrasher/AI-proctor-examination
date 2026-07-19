import express from 'express';
import Stripe from 'stripe';
import { protect } from '../middleware/auth.js';
import TestSeries from '../models/TestSeries.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Initialize Stripe (gracefully fallback if key is missing)
const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_12345';
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2023-10-16',
});

// 1. GET /api/payments/products
// List available premium test series and pricing
router.get('/products', async (req, res) => {
  try {
    const products = await TestSeries.find().select('title description price isPremium questions');
    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 2. POST /api/payments/checkout-session
// Create Stripe checkout session for a premium test series
router.post('/checkout-session', protect, async (req, res) => {
  try {
    const { testSeriesId } = req.body;
    const testSeries = await TestSeries.findById(testSeriesId);
    
    if (!testSeries) {
      return res.status(404).json({ message: 'Test series not found' });
    }

    if (!testSeries.isPremium) {
      return res.status(400).json({ message: 'This is a free test series' });
    }

    // Check if already purchased
    if (req.user.purchasedTestSeries.includes(testSeriesId)) {
      return res.status(400).json({ message: 'Test series already purchased' });
    }

    // Fallback Mock Payment for testing when standard keys are missing
    if (stripeSecret.startsWith('sk_test_mock')) {
      // Simulate successful payment instantly in local dev mode
      const user = await User.findById(req.user._id);
      user.purchasedTestSeries.push(testSeriesId);
      await user.save();

      // Create notification
      const purchaseNotification = new Notification({
        user: user._id,
        title: 'Premium Test Series Unlocked',
        message: `Payment successful (Sandbox). You now have full access to '${testSeries.title}'!`,
        type: 'purchase',
      });
      await purchaseNotification.save();

      return res.status(200).json({
        message: 'Mock Payment successful. Test series unlocked.',
        sandbox: true,
        sessionUrl: '/dashboard?purchase_success=true'
      });
    }

    // Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: testSeries.title,
              description: testSeries.description || 'Premium Mock Test Package',
            },
            unit_amount: Math.round(testSeries.price * 100), // In cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'http://localhost:5173'}/dashboard?purchase_success=true`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/dashboard?purchase_cancelled=true`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
        testSeriesId: testSeries._id.toString(),
      },
    });

    return res.status(200).json({ sessionUrl: session.url, sessionId: session.id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 3. POST /api/payments/webhook
// Stripe Webhook handler to listen for successful checkout events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // If stripe is running in mock mode, bypass signature validation
    if (stripeSecret.startsWith('sk_test_mock')) {
      return res.status(200).json({ received: true, mock: true });
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the completed checkout event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, testSeriesId } = session.metadata;

    try {
      const user = await User.findById(userId);
      if (user && !user.purchasedTestSeries.includes(testSeriesId)) {
        user.purchasedTestSeries.push(testSeriesId);
        await user.save();

        const test = await TestSeries.findById(testSeriesId);
        
        // Push notification
        const notif = new Notification({
          user: user._id,
          title: 'Premium Test Series Unlocked',
          message: `Stripe payment confirmed! You now have full access to '${test?.title || 'Premium Test Series'}'.`,
          type: 'purchase',
        });
        await notif.save();
      }
    } catch (error) {
      console.error(`Webhook db update error: ${error.message}`);
      return res.status(500).send('Database update error');
    }
  }

  return res.status(200).json({ received: true });
});

// 4. GET /api/payments/purchases
// Get user's purchased test series history
router.get('/purchases', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('purchasedTestSeries', 'title description price');
    return res.status(200).json({ purchases: user.purchasedTestSeries });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});



export default router;
