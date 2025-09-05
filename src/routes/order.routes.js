const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const orderController = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const orderValidation = [
  body('id').isInt().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress').trim().notEmpty().withMessage('Delivery address is required'),
  body('totalAmount').isDecimal().withMessage('Valid total amount is required'),
  body('commission').isDecimal().withMessage('Valid commission is required'),
  body('farmerAmount').isDecimal().withMessage('Valid farmer amount is required'),
  body('transport_charge').isDecimal().withMessage('Valid transport charge is required')
];

// Protected routes
router.post('/', 
  protect, 
  authorize('customer'), 
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

// Get all orders (for testing)
router.get('/admin/all', 
  protect, 
  orderController.getAllOrders
);

// Farmer specific routes
router.patch('/:id/status', 
  protect, 
  authorize('farmer'), 
  orderController.updateOrderStatus
);

module.exports = router; 