const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const transporterController = require('../controllers/transporter.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', authController.register);
router.get('/profile', protect, transporterController.getProfile);
router.put('/profile', protect, transporterController.updateProfile);
router.post('/delivery-person', protect, transporterController.addDeliveryPerson);
router.delete('/delivery-person/:id', protect, transporterController.deleteDeliveryPerson);
router.post('/assign-order', protect, transporterController.assignOrderToDeliveryPerson);

module.exports = router; 