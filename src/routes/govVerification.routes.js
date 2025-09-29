const express = require('express');
const { body, param } = require('express-validator');
const authenticate = require('../middleware/auth');
const govVerificationController = require('../controllers/govVerification.controller');

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

const router = express.Router();

// Manual verification trigger (Admin only)
router.post('/verify/:farmer_id',
  authenticate,
  authorize('admin'),
  param('farmer_id').isInt().withMessage('Valid farmer ID required'),
  govVerificationController.verifyFarmer
);

// Get verification status
router.get('/status/:farmer_id',
  authenticate,
  authorize(['admin', 'farmer']),
  param('farmer_id').isInt().withMessage('Valid farmer ID required'),
  govVerificationController.getVerificationStatus
);

// Retry verification
router.post('/retry/:farmer_id',
  authenticate,
  authorize('admin'),
  param('farmer_id').isInt().withMessage('Valid farmer ID required'),
  govVerificationController.retryVerification
);

module.exports = router;