const express = require('express');
const router = express.Router();
const deliveryPersonController = require('../controllers/deliveryPerson.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/profile', protect, deliveryPersonController.getProfile);
router.put('/location', protect, deliveryPersonController.updateLocation);
router.put('/availability', protect, deliveryPersonController.updateAvailability);
router.put('/password', protect, deliveryPersonController.updatePassword);
router.get('/orders', protect, deliveryPersonController.getAssignedOrders);
router.put('/complete-order', protect, deliveryPersonController.completeOrder);

// Route to get all delivery persons with pagination and filtering
router.get('/all', deliveryPersonController.getAllUsers);

module.exports = router;