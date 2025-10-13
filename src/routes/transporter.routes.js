const express = require('express');
const router = express.Router();
const transporterController = require('../controllers/transporter.controller');
const authenticate = require('../middleware/auth');
const { body } = require('express-validator');

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

router.get('/profile', authenticate, authorize('transporter'), transporterController.getProfile);
router.put('/profile', authenticate, authorize('transporter'), transporterController.updateProfile);
router.post('/delivery-person', authenticate, authorize('transporter'), transporterController.addDeliveryPerson);
router.delete('/delivery-person/:id', authenticate, authorize('transporter'), transporterController.deleteDeliveryPerson);
router.post('/assign-order', authenticate, authorize('transporter'), transporterController.assignOrderToDeliveryPerson);

// Vehicle assignment routes
router.post('/assign-vehicle', 
  authenticate, 
  authorize('transporter'),
  body('order_id').isInt().withMessage('Valid order ID required'),
  body('vehicle_id').isInt().withMessage('Valid vehicle ID required'),
  body('vehicle_type').isIn(['permanent', 'temporary']).withMessage('Vehicle type must be permanent or temporary'),
  transporterController.assignVehicleToOrder
);

// Order management routes
router.get('/orders', authenticate, authorize('transporter'), transporterController.getAssignedOrders);
router.put('/order-status', 
  authenticate, 
  authorize('transporter'),
  body('order_id').isInt().withMessage('Valid order ID required'),
  body('status').isIn(['PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  transporterController.updateOrderStatus
);

// Pickup and delivery assignment routes
router.post('/assign-pickup', 
  authenticate, 
  authorize('transporter'),
  body('order_id').isInt().withMessage('Valid order ID required'),
  transporterController.assignPickupDeliveryPerson
);

router.post('/receive-order',
  authenticate,
  authorize('transporter'),
  body('order_id').isInt().withMessage('Valid order ID required'),
  transporterController.receiveOrderAndAssignDelivery
);

// Delivery persons management
router.get('/delivery-persons', authenticate, authorize('transporter'), transporterController.getDeliveryPersons);

// Vehicles management
router.get('/vehicles', authenticate, authorize('transporter'), transporterController.getVehicles);

module.exports = router;