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
    body('role').isIn(['farmer', 'customer', 'transporter', 'admin']).withMessage('Invalid role')
  ],
  authController.register
);

// Login route
router.post(
  '/login',
  [
    (req, res, next) => {
      if (req.body.role === 'farmer') {
        // Farmer: require unique_id and password
        body('unique_id').isLength({ min: 6, max: 6 }).withMessage('Unique code must be 6 digits')(req, res, () => {});
        body('password').notEmpty().withMessage('Password is required')(req, res, () => {});
        body('role').equals('farmer').withMessage('Role must be farmer')(req, res, () => {});
      } else {
        // Other roles: require username (or email) and password
        body('username').notEmpty().withMessage('Username (email) is required')(req, res, () => {});
        body('password').notEmpty().withMessage('Password is required')(req, res, () => {});
        body('role').isIn(['customer', 'transporter', 'admin']).withMessage('Invalid role')(req, res, () => {});
      }
      next();
    }
  ],
  authController.login
);

// Send OTP route
router.post(
  '/send-otp',
  [
    body('mobile_number').notEmpty().withMessage('Mobile number is required'),
    body('role').isIn(['farmer', 'customer', 'transporter', 'admin']).withMessage('Invalid role')
  ],
  authController.sendOTP
);

// Verify OTP route
router.post(
  '/verify-otp',
  [
    body('mobile_number').notEmpty().withMessage('Mobile number is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  authController.verifyOTP
);

// Reset Password route
router.post(
  '/reset-password',
  [
    body('mobile_number').notEmpty().withMessage('Mobile number is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').isIn(['farmer', 'customer', 'transporter', 'admin']).withMessage('Invalid role')
  ],
  authController.resetPassword
);

// Customer first login OTP verification route
router.post(
  '/verify-customer-first-login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('tempToken').notEmpty().withMessage('Temporary token is required')
  ],
  authController.verifyCustomerFirstLoginOTP
);

// Resend customer first login OTP route
router.post(
  '/resend-customer-first-login-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('tempToken').notEmpty().withMessage('Temporary token is required')
  ],
  authController.resendCustomerFirstLoginOTP
);

// Farmer code verification route
router.post(
  '/verify-farmer-code',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
  ],
  authController.verifyFarmerCode
);

module.exports = router; 