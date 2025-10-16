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

router.put('/update-location',
  authenticate,
  authorize('delivery'),
  body('latitude').isFloat().withMessage('Valid latitude required'),
  body('longitude').isFloat().withMessage('Valid longitude required'),
  deliveryPersonController.updateLocation
);

router.get('/track/:order_id', deliveryPersonController.trackOrder);

router.get('/tracking-history/:order_id', deliveryPersonController.getTrackingHistory);

router.put('/availability',
  authenticate,
  authorize('delivery'),
  body('is_available').isBoolean().withMessage('is_available must be a boolean'),
  deliveryPersonController.updateAvailability
);

module.exports = router;