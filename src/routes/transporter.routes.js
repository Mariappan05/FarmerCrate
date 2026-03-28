const express = require('express');
const router = express.Router();
const transporterController = require('../controllers/transporter.controller');
const authenticate = require('../middleware/auth');
const { body, param } = require('express-validator');

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

// Order management routes — specific routes BEFORE generic /orders
router.get('/orders/active', authenticate, authorize('transporter'), transporterController.getActiveOrders);
router.post('/orders/resolve-qr', authenticate, authorize('transporter'), transporterController.resolveOrderByQr);
router.get('/orders/:order_id/track', authenticate, authorize('transporter'), transporterController.trackOrder);
router.get('/orders/:order_id/updates', authenticate, authorize('transporter'), transporterController.getTrackingUpdates);

// Single order detail with full includes (farmer, customer, delivery person)
router.get('/orders/:order_id', authenticate, authorize('transporter'), transporterController.getOrderDetail);

router.get('/orders', authenticate, authorize('transporter'), transporterController.getAssignedOrders);

// Packing proof upload
router.put('/orders/:order_id/packing', 
  authenticate, 
  authorize('transporter'),
  param('order_id').isInt().withMessage('Valid order ID required'),
  transporterController.updatePackingProof
);
router.post('/orders/:order_id/packing', 
  authenticate, 
  authorize('transporter'),
  param('order_id').isInt().withMessage('Valid order ID required'),
  transporterController.updatePackingProof
);

router.put('/order-status', 
  authenticate, 
  authorize('transporter'),
  body('order_id').isInt().withMessage('Valid order ID required'),
  body('status').isIn([
    'PENDING', 'PLACED', 'CONFIRMED', 'ASSIGNED', 
    'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP',
    'RECEIVED', 'SHIPPED', 'IN_TRANSIT', 
    'REACHED_DESTINATION', 'OUT_FOR_DELIVERY', 
    'DELIVERED', 'COMPLETED', 'CANCELLED'
  ]).withMessage('Invalid status'),
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

// Manual receive order route
router.post('/manual-receive-order',
  authenticate,
  authorize('transporter'),
  body('order_id').isInt().withMessage('Valid order ID required'),
  body('delivery_person_id').isInt().withMessage('Valid delivery person ID required'),
  transporterController.manualReceiveOrder
);

// Delivery persons management
router.get('/delivery-persons', authenticate, authorize('transporter'), transporterController.getDeliveryPersons);

// Vehicles management
router.get('/vehicles', authenticate, authorize('transporter'), transporterController.getVehicles);

module.exports = router;