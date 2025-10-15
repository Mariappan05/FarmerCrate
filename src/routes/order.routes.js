const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const orderController = require('../controllers/order.controller');
const billController = require('../controllers/bill.controller');
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

// Validation middleware
const orderValidation = [
  body('product_id').isInt().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('delivery_address').notEmpty().withMessage('Delivery address required'),
  body('customer_zone').notEmpty().withMessage('Customer zone required'),
  body('customer_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit pincode is required'),
  body('total_price').isDecimal().withMessage('Valid total price is required'),
  body('farmer_amount').isDecimal().withMessage('Valid farmer amount is required'),
  body('admin_commission').isDecimal().withMessage('Valid admin commission is required'),
  body('transport_charge').isDecimal().withMessage('Valid transport charge is required')
];

// Protected routes
router.post('/', 
  authenticate, 
  authorize('customer'), 
  orderValidation, 
  orderController.createOrder
);

router.post('/complete', 
  authenticate, 
  authorize('customer'),
  body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID required'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID required'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay signature required'),
  body('order_data').isObject().withMessage('Order data required'),
  orderController.completeOrder
);

router.get('/', 
  authenticate, 
  (req, res, next) => {
    console.log('GET /api/orders - User:', req.user?.customer_id, 'Role:', req.role);
    next();
  },
  orderController.getOrders
);

// Get all orders (admin only) - must be before /:id
router.get('/all', 
  authenticate, 
  authorize('admin'), 
  orderController.getAllOrders
);

// Get transporter allocated orders
router.get('/transporter/allocated', 
  authenticate, 
  authorize('transporter'), 
  orderController.getTransporterOrders
);

// Update QR code - must be before /:id route
router.put('/:order_id/qr-code',
  authenticate,
  authorize(['admin', 'farmer', 'customer']),
  param('order_id').isInt().withMessage('Valid order ID required'),
  body('qr_code').notEmpty().withMessage('QR code is required'),
  orderController.updateQRCode
);

router.get('/:id', 
  authenticate, 
  orderController.getOrder
);

// Tracking routes
router.post('/scan-qr',
  authenticate,
  body('qr_code').notEmpty().withMessage('QR code required'),
  body('location_lat').optional().isFloat(),
  body('location_lng').optional().isFloat(),
  orderController.scanQRCode
);

router.get('/tracking/:order_id',
  authenticate,
  param('order_id').isInt().withMessage('Valid order ID required'),
  orderController.getOrderTracking
);

router.put('/status',
  authenticate,
  authorize(['admin', 'transporter', 'delivery']),
  body('order_id').isInt().withMessage('Valid order ID required'),
  body('status').isIn(['PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  orderController.updateOrderStatus
);

router.get('/check-availability/:pincode',
  orderController.checkTransporterAvailability
);

router.post('/current-location',
  body('lat').isFloat().withMessage('Valid latitude is required'),
  body('lng').isFloat().withMessage('Valid longitude is required'),
  orderController.getCurrentLocation
);

router.get('/details/:order_id',
  authenticate,
  param('order_id').isInt().withMessage('Valid order ID required'),
  orderController.getOrderDetailsById
);

// Bill routes
router.put('/:order_id/bill',
  authenticate,
  authorize(['admin', 'farmer', 'transporter']),
  param('order_id').isInt().withMessage('Valid order ID required'),
  body('bill_url').notEmpty().withMessage('Bill URL is required'),
  billController.updateBillUrl
);

router.get('/:order_id/bill',
  authenticate,
  param('order_id').isInt().withMessage('Valid order ID required'),
  billController.getBillUrl
);

// Customer tracking routes
router.get('/active',
  authenticate,
  authorize('customer'),
  orderController.getActiveShipments
);

router.get('/:order_id/track',
  authenticate,
  authorize('customer'),
  param('order_id').isInt().withMessage('Valid order ID required'),
  orderController.trackOrder
);

router.get('/:order_id/updates',
  authenticate,
  authorize('customer'),
  param('order_id').isInt().withMessage('Valid order ID required'),
  orderController.getTrackingUpdates
);

module.exports = router;