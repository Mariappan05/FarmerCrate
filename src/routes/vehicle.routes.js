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
    body('vehicle_type').isIn(['bike', 'auto', 'van', 'truck']).withMessage('Invalid vehicle type'),
    body('capacity').optional().isInt({ min: 0 }).withMessage('Capacity must be a positive number')
  ],
  VehicleController.addPermanentVehicle
);

// Add temporary vehicle
router.post('/temporary', 
  protect, 
  authorize('transporter'),
  [
    body('vehicle_number').notEmpty().withMessage('Vehicle number is required'),
    body('vehicle_type').isIn(['bike', 'auto', 'van', 'truck']).withMessage('Invalid vehicle type'),
    body('rental_start_date').isISO8601().withMessage('Valid rental start date is required'),
    body('rental_end_date').isISO8601().withMessage('Valid rental end date is required'),
    body('capacity').optional().isInt({ min: 0 }).withMessage('Capacity must be a positive number')
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