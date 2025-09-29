const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const deliveryPersonController = require('../controllers/deliveryPerson.controller');
const authenticate = require('../middleware/auth');

// Simple authorize middleware
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.role) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

router.get('/orders', 
  authenticate, 
  authorize('delivery'), 
  deliveryPersonController.getAssignedOrders
);

router.get('/profile', 
  authenticate, 
  authorize('delivery'), 
  deliveryPersonController.getProfile
);

router.put('/update-status',
  authenticate,
  authorize('delivery'),
  body('order_id').isInt().withMessage('Valid order ID required'),
  body('status').isIn(['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'COMPLETED']).withMessage('Invalid status'),
  deliveryPersonController.updateOrderStatus
);

module.exports = router;