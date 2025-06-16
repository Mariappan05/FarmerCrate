const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const orderController = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const orderValidation = [
  body('productId').isInt().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress').trim().notEmpty().withMessage('Delivery address is required')
];

// Protected routes
router.post('/', 
  protect, 
  authorize('consumer'), 
  orderValidation, 
  orderController.createOrder
);

router.get('/', 
  protect, 
  orderController.getOrders
);

router.get('/:id', 
  protect, 
  orderController.getOrder
);

// Farmer specific routes
router.patch('/:id/status', 
  protect, 
  authorize('farmer'), 
  orderController.updateOrderStatus
);

module.exports = router; 