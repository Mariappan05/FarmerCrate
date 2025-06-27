const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth');

// Apply authentication middleware to all admin routes
router.use(auth);

// ==================== ADMIN PROFILE MANAGEMENT ====================

// Get admin profile
router.get('/profile', adminController.getAdminProfile);

// Update admin profile
router.put('/profile', [
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('mobile_number').optional().isMobilePhone().withMessage('Please enter a valid mobile number')
], adminController.updateAdminProfile);

// ==================== USER MANAGEMENT ====================

// Get all users by role (with pagination and search)
router.get('/users/:role', adminController.getAllUsersByRole);

// Get specific user details
router.get('/users/:role/:user_id', adminController.getUserDetails);

// Update user status
router.put('/users/:role/:user_id/status', [
  body('is_active').isBoolean().withMessage('is_active must be a boolean value')
], adminController.updateUserStatus);

// Create new admin user (super admin only)
router.post('/admin-users', [
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobile_number').isMobilePhone().withMessage('Please enter a valid mobile number'),
  body('role').optional().isIn(['super_admin', 'admin', 'moderator']).withMessage('Invalid admin role')
], adminController.createAdminUser);

// ==================== DASHBOARD & STATISTICS ====================

// Get admin dashboard statistics
router.get('/dashboard-stats', adminController.getDashboardStats);

// ==================== FARMER VERIFICATION MANAGEMENT ====================

// Get all pending farmers for admin reviewt
router.get('/farmers/pending', adminController.getPendingFarmers);

// Get all verified farmers
router.get('/farmers/verified', adminController.getVerifiedFarmers);

// Get farmer verification status
router.get('/farmers/:id/verification-status', adminController.getFarmerVerificationStatus);

// Approve/Reject farmers
router.put('/farmers/:id/approve', [
  body('approval_notes').optional().isLength({ max: 500 }).withMessage('Approval notes must be less than 500 characters')
], adminController.approveFarmer);

router.put('/farmers/:id/reject', [
  body('rejection_reason').isLength({ min: 10, max: 500 }).withMessage('Rejection reason must be between 10 and 500 characters')
], adminController.rejectFarmer);

// Verification code management
router.post('/farmers/:id/resend-code', adminController.resendVerificationCode);

// ==================== TRANSPORTER VERIFICATION MANAGEMENT ====================

// Get all pending transporters for admin review
router.get('/transporters/pending', adminController.getPendingTransporters);

// Get all verified transporters
router.get('/transporters/verified', adminController.getVerifiedTransporters);

// Approve/Reject transporters
router.put('/transporters/:transporter_id/approve', [
  body('approval_notes').optional().isLength({ max: 500 }).withMessage('Approval notes must be less than 500 characters')
], adminController.approveTransporter);

router.put('/transporters/:transporter_id/reject', [
  body('rejection_reason').isLength({ min: 10, max: 500 }).withMessage('Rejection reason must be between 10 and 500 characters')
], adminController.rejectTransporter);

// Legacy endpoint - kept for backward compatibility
router.post('/send-farmer-code', adminController.sendFarmerCode);

module.exports = router;