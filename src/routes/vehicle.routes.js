const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const VehicleController = require('../controllers/vehicle.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Get all vehicles for transporter
router.get('/', protect, authorize('transporter'), VehicleController.getAllVehicles);

// Add permanent vehicle
router.post('/permanent', 
  protect, 
  authorize('transporter'),
  [
    body('vehicle_number').notEmpty().withMessage('Vehicle number is required'),
    body('vehicle_type').notEmpty().withMessage('Vehicle type is required')
  ],
  VehicleController.addPermanentVehicle
);

// Add temporary vehicle
router.post('/temporary', 
  protect, 
  authorize('transporter'),
  [
    body('vehicle_number').notEmpty().withMessage('Vehicle number is required'),
    body('vehicle_type').notEmpty().withMessage('Vehicle type is required')
  ],
  VehicleController.addTemporaryVehicle
);

// Update vehicle availability
router.patch('/:vehicle_id/availability', 
  protect, 
  authorize('transporter'),
  [
    body('vehicle_type').isIn(['permanent', 'temporary']).withMessage('Vehicle type must be permanent or temporary'),
    body('is_available').isBoolean().withMessage('is_available must be boolean')
  ],
  VehicleController.updateVehicleAvailability
);

// Delete vehicle
router.delete('/:vehicle_id', 
  protect, 
  authorize('transporter'),
  [
    body('vehicle_type').isIn(['permanent', 'temporary']).withMessage('Vehicle type must be permanent or temporary')
  ],
  VehicleController.deleteVehicle
);

module.exports = router;
