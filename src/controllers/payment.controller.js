const RazorpayService = require('../services/razorpay.service');
const Order = require('../models/order.model');
const Transaction = require('../models/transaction.model');

exports.createPaymentOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    
    const receipt = `order_${Date.now()}`;
    const razorpayOrder = await RazorpayService.createOrder(amount, 'INR', receipt);
    
    res.json({
      success: true,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Payment order creation error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const isValid = await RazorpayService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    
    if (isValid) {
      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment_status: 'completed'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        payment_status: 'failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getRazorpayKey = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID) {
      return res.status(500).json({ message: 'Razorpay key not configured' });
    }
    
    res.json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Get Razorpay key error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createPaymentOrder, verifyPayment, getRazorpayKey };