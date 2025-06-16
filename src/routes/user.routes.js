const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

// Validation middleware
const updateProfileValidation = [
  body('username').optional().trim().notEmpty().withMessage('Username cannot be empty'),
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('mobileNumber').optional().notEmpty().withMessage('Mobile number cannot be empty')
];

// Routes
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, updateProfileValidation, userController.updateProfile);
router.get('/wallet', protect, userController.getWalletBalance);

module.exports = router; 