const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const farmerController = require('../controllers/farmer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

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

router.get('/all', farmerController.getAllUsers);

// Order management routes
router.get('/orders/pending', protect, authorize('farmer'), farmerController.getPendingOrders);
router.put('/orders/:order_id/accept', protect, authorize('farmer'), farmerController.acceptOrder);
router.put('/orders/:order_id/reject', protect, authorize('farmer'), farmerController.rejectOrder);
router.put('/orders/:order_id/ship', protect, authorize('farmer'), farmerController.shipOrder);

module.exports = router;