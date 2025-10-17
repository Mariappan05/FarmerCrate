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

// Get all users
router.get('/farmers', adminController.getAllFarmers);
router.get('/farmers/:farmer_id/products', adminController.getFarmerProducts);
router.get('/farmers/:farmer_id/orders', adminController.getFarmerOrders);
router.get('/customers', adminController.getAllCustomers);
router.get('/customers/:customer_id/orders', adminController.getCustomerOrders);
router.get('/transporters', adminController.getAllTransporters);
router.get('/transporters/:transporter_id/orders', adminController.getTransporterOrders);
router.get('/delivery-persons', adminController.getAllDeliveryPersons);
router.get('/delivery-persons/:delivery_person_id/orders', adminController.getDeliveryPersonOrders);

// Delete users
router.delete('/farmers/:id', adminController.deleteFarmer);
router.delete('/customers/:id', adminController.deleteCustomer);
router.delete('/transporters/:id', adminController.deleteTransporter);
router.delete('/delivery-persons/:id', adminController.deleteDeliveryPerson);

module.exports = router;