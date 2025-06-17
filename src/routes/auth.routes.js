const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// Register route
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('mobileNumber').notEmpty().withMessage('Mobile number is required'),
    body('role').isIn(['farmer', 'customer']).withMessage('Invalid role')
  ],
  authController.register
);

// Login route
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.login
);

// Send OTP route
router.post(
  '/send-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email')
  ],
  authController.sendOTP
);

// Verify OTP route
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  authController.verifyOTP
);

module.exports = router; 