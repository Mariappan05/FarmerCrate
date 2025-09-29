const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(authorize('admin'));

// Admin profile
router.get('/profile', adminController.getAdminProfile);

// Dashboard stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// Farmer management
router.get('/farmers/pending', adminController.getPendingFarmers);
router.get('/farmers/verified', adminController.getVerifiedFarmers);
router.put('/farmers/:id/approve', [
  body('verification_notes').optional().isLength({ max: 500 })
], adminController.approveFarmer);

// Transporter management
router.get('/transporters/pending', adminController.getPendingTransporters);
router.put('/transporters/:transporter_id/approve', [
  body('approval_notes').optional().isLength({ max: 500 })
], adminController.approveTransporter);

module.exports = router;