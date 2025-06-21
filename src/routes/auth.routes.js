const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// Register route
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').isIn(['farmer', 'customer', 'transporter']).withMessage('Invalid role')
  ],
  authController.register
);

// Login route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').isIn(['farmer', 'customer', 'transporter']).withMessage('Invalid role')
  ],
  authController.login
);

// Send OTP route
router.post(
  '/send-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('role').isIn(['farmer', 'customer', 'transporter']).withMessage('Invalid role')
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

// Reset Password route
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').isIn(['farmer', 'customer', 'transporter']).withMessage('Invalid role')
  ],
  authController.resetPassword
);

// Verify Farmer Code route
router.post('/verify-farmer-code', authController.verifyFarmerCode);

module.exports = router; 