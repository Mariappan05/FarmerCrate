const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const orderController = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const orderValidation = [
  body('id').isInt().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('delivery_address').trim().notEmpty().withMessage('Delivery address is required'),
  body('total_amount').isDecimal().withMessage('Valid total amount is required'),
  body('commission').isDecimal().withMessage('Valid commission is required'),
  body('farmer_amount').isDecimal().withMessage('Valid farmer amount is required'),
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

// Get all orders (admin only) - must be before /:id
router.get('/all', 
  protect, 
  authorize('admin'), 
  orderController.getAllOrders
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

// Transport assignment route
router.patch('/:id/assign-transport', 
  protect, 
  orderController.assignTransport
);

// Delivery completion route
router.patch('/:id/complete', 
  protect, 
  authorize('delivery'), 
  orderController.completeDelivery
);

module.exports = router; 