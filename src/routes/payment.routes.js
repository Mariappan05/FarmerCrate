const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth');

router.post('/create-order',
  authenticate,
  body('amount').isDecimal().withMessage('Valid amount required'),
  paymentController.createPaymentOrder
);

router.post('/verify',
  authenticate,
  body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID required'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID required'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay signature required'),
  paymentController.verifyPayment
);

router.get('/razorpay-key', paymentController.getRazorpayKey);

module.exports = router;