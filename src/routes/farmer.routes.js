const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const farmerController = require('../controllers/farmer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Only fetch and update personal details
router.get('/me', protect, authorize('farmer'), farmerController.getMe);

router.put('/me',
  protect,
  authorize('farmer'),
  [
    body('name').optional().isString(),
    body('email').optional().isEmail(),
    body('mobile_number').optional().isString(),
    body('address').optional().isString()
  ],
  farmerController.updateMe
);

// Route to get all farmer names
router.get('/names', farmerController.getAllFarmerNames);

module.exports = router; 