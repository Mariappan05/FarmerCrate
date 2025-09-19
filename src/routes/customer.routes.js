const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const customerController = require('../controllers/customer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Only fetch and update personal details
router.get('/me', protect, authorize('customer'), customerController.getMe);

router.put('/me',
  protect,
  authorize('customer'),
  [
    body('name').optional().isString(),
    body('email').optional().isEmail(),
    body('mobile_number').optional().isString(),
    body('address').optional().isString()
  ],
  customerController.updateMe
);

// Route to get all customers with pagination and filtering
router.get('/all', customerController.getAllUsers);

module.exports = router; 