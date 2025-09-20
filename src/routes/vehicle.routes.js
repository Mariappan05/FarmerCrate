/**
 * Vehicle Management Routes
 * 
 * This file defines all API endpoints for vehicle management functionality.
 * All routes are protected with authentication middleware to ensure only
 * authorized transporters can manage their own vehicles.
 * 
 * Route Structure:
 * - GET routes for retrieving vehicle data
 * - POST routes for creating new vehicles and uploading documents
 * - PUT/PATCH routes for updating vehicle information
 * - DELETE routes for removing vehicles
 * 
 * Security Features:
 * - Authentication required for all endpoints
 * - Ownership validation (transporters can only access their own vehicles)
 * - Input validation and sanitization
 */

const express = require('express');
const router = express.Router();
const VehicleController = require('../controllers/vehicle.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles for authenticated transporter
 * @access  Private (Transporter only)
 * @returns Fleet overview with both permanent and temporary vehicles
 */
router.get('/', protect, VehicleController.getAllVehicles);

/**
 * @route   GET /api/vehicles/status/:status
 * @desc    Get vehicles filtered by availability status
 * @access  Private (Transporter only)
 * @param   {string} status - Vehicle availability status (available, in_transit, maintenance, breakdown, reserved)
 * @returns Vehicles matching the specified status
 */
router.get('/status/:status', protect, VehicleController.getVehiclesByStatus);

/**
 * @route   GET /api/vehicles/:vehicleType/:vehicleId
 * @desc    Get detailed information about a specific vehicle
 * @access  Private (Transporter only)
 * @param   {string} vehicleType - Type of vehicle (permanent/temporary)
 * @param   {number} vehicleId - Vehicle ID
 * @returns Complete vehicle details including documents
 */
router.get('/:vehicleType/:vehicleId', protect, VehicleController.getVehicleDetails);

/**
 * PERMANENT VEHICLE MANAGEMENT ROUTES
 */

/**
 * @route   POST /api/vehicles/permanent
 * @desc    Add a new permanent vehicle with ALL required documents (ATOMIC OPERATION)
 * @access  Private (Transporter only)
 * @body    {object} Complete vehicle and document data - ALL fields required simultaneously
 * @body_example {
 *   // Vehicle Data
 *   "vehicle_number": "KA01AB1234",
 *   "vehicle_type": "truck",
 *   "capacity_kg": 5000.00,
 *   "make": "Tata", 
 *   "model": "407",
 *   "year_of_manufacture": 2020,
 *   "chassis_number": "CH123456789",
 *   "engine_number": "EN987654321",
 *   
 *   // Required Document Data (ALL MANDATORY)
 *   "rc_book_number": "RC123456789",
 *   "rc_book_issue_date": "2020-01-15",
 *   "rc_book_expiry_date": "2025-01-15", 
 *   "rc_book_issuing_authority": "Karnataka RTO",
 *   "rc_book_url": "https://storage.com/rc_document.pdf",
 *   
 *   "insurance_number": "INS789012345",
 *   "insurance_issue_date": "2024-06-01",
 *   "insurance_expiry_date": "2025-06-01",
 *   "insurance_issuing_authority": "New India Assurance",
 *   "insurance_url": "https://storage.com/insurance.pdf",
 *   
 *   "fitness_number": "FIT456789123", 
 *   "fitness_issue_date": "2024-01-01",
 *   "fitness_expiry_date": "2025-01-01",
 *   "fitness_issuing_authority": "RTO Bangalore",
 *   "fitness_url": "https://storage.com/fitness.pdf",
 *   
 *   "pollution_number": "PUC321654987",
 *   "pollution_issue_date": "2024-08-01", 
 *   "pollution_expiry_date": "2025-02-01",
 *   "pollution_issuing_authority": "Authorized PUC Center",
 *   "pollution_url": "https://storage.com/pollution.pdf"
 * }
 * @returns Created vehicle record with documents and verification status
 * @note Vehicle will NOT be created if any required document is missing
 */
router.post('/permanent', protect, VehicleController.addPermanentVehicle);

/**
 * TEMPORARY VEHICLE MANAGEMENT ROUTES
 */

/**
 * @route   POST /api/vehicles/temporary
 * @desc    Add a new temporary/rental vehicle with required documents (ATOMIC OPERATION)
 * @access  Private (Transporter only)
 * @body    {object} Complete vehicle and essential document data - ALL required fields
 * @body_example {
 *   // Vehicle Data
 *   "vehicle_number": "KA02CD5678",
 *   "vehicle_type": "pickup",
 *   "ownership_type": "temporary", // or "leased"
 *   "capacity_kg": 2000.00,
 *   "day_limit": 30,
 *   "notes": "Rented from ABC Rental Co.",
 *   
 *   // Required Document Data (ESSENTIAL for rental compliance)
 *   "rc_book_number": "RC987654321",
 *   "rc_book_issue_date": "2019-05-10",
 *   "rc_book_expiry_date": "2024-05-10",
 *   "rc_book_issuing_authority": "Karnataka RTO",
 *   "rc_book_url": "https://storage.com/owner_rc_copy.pdf",
 *   
 *   "insurance_number": "INS123456789",
 *   "insurance_issue_date": "2024-03-01",
 *   "insurance_expiry_date": "2025-03-01", 
 *   "insurance_issuing_authority": "ICICI Lombard",
 *   "insurance_url": "https://storage.com/owner_insurance_copy.pdf"
 * }
 * @returns Created temporary vehicle record with documents
 * @note Vehicle will NOT be created if required documents are missing
 */
router.post('/temporary', protect, VehicleController.addTemporaryVehicle);

/**
 * VEHICLE STATUS MANAGEMENT ROUTES
 */

/**
 * @route   PATCH /api/vehicles/:vehicleType/:vehicleId/status
 * @desc    Update vehicle availability status
 * @access  Private (Transporter only)
 * @param   {string} vehicleType - Type of vehicle (permanent/temporary)
 * @param   {number} vehicleId - Vehicle ID
 * @body    {object} Status update (availability_status, notes)
 * @returns Updated vehicle record
 */
router.patch('/:vehicleType/:vehicleId/status', protect, VehicleController.updateVehicleStatus);

/**
 * DOCUMENT MANAGEMENT ROUTES
 * 
 * NOTE: These endpoints are now primarily for UPDATING existing documents.
 * Initial document upload is REQUIRED during vehicle creation and cannot be done separately.
 */

/**
 * @route   PUT /api/vehicles/:vehicleType/:vehicleId/documents
 * @desc    Update existing vehicle documents (for corrections or renewals)
 * @access  Private (Transporter only)
 * @param   {string} vehicleType - Type of vehicle (permanent/temporary)
 * @param   {number} vehicleId - Vehicle ID
 * @body    {object} Updated document details (partial updates allowed for existing vehicles)
 * @returns Updated document record
 * @note    Only works for vehicles that already have documents (created during vehicle creation)
 */
router.put('/:vehicleType/:vehicleId/documents', protect, VehicleController.uploadVehicleDocuments);

/**
 * VEHICLE DELETION ROUTES
 */

/**
 * @route   DELETE /api/vehicles/:vehicleType/:vehicleId
 * @desc    Soft delete a vehicle (sets is_active to false)
 * @access  Private (Transporter only)
 * @param   {string} vehicleType - Type of vehicle (permanent/temporary)
 * @param   {number} vehicleId - Vehicle ID
 * @returns Success message confirming deletion
 */
router.delete('/:vehicleType/:vehicleId', protect, VehicleController.deleteVehicle);

/**
 * VALIDATION MIDDLEWARE
 * 
 * These middleware functions can be added to routes for additional validation:
 * - validateVehicleType: Ensures vehicleType is either 'permanent' or 'temporary'
 * - validateVehicleStatus: Ensures status is a valid enum value
 * - validateDocumentData: Validates document upload format
 */

// Vehicle type validation middleware
const validateVehicleType = (req, res, next) => {
  const { vehicleType } = req.params;
  if (!['permanent', 'temporary'].includes(vehicleType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid vehicle type. Must be either "permanent" or "temporary"'
    });
  }
  next();
};

// Status validation middleware
const validateVehicleStatus = (req, res, next) => {
  const { status } = req.params;
  const validStatuses = ['available', 'in_transit', 'maintenance', 'breakdown', 'reserved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }
  next();
};

// Apply validation middleware to relevant routes
router.param('vehicleType', validateVehicleType);
router.param('status', validateVehicleStatus);

module.exports = router;