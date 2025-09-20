/**
 * Vehicle Management Controller
 * 
 * This controller handles all vehicle-related operations for transporters including:
 * - CRUD operations for both permanent and temporary vehicles
 * - Document management and verification
 * - Vehicle availability tracking
 * - Fleet overview and analytics
 * 
 * Security Features:
 * - Transporter ownership validation (users can only manage their own vehicles)
 * - Input validation and sanitization
 * - Proper error handling and logging
 */

const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');
const PermanentVehicleDocument = require('../models/permanentVehicleDocument.model');
const TemporaryVehicleDocument = require('../models/temporaryVehicleDocument.model');
const TransporterUser = require('../models/transporter_user.model');
const { sequelize } = require('../config/database');

/**
 * Document Validation Functions
 * 
 * These functions ensure all required documents are provided when creating vehicles.
 * This implements the business rule that vehicles cannot be created without proper documentation.
 */

/**
 * Validates required documents for permanent vehicles
 * @param {Object} documents - Document data provided by user
 * @returns {Object} - { isValid: boolean, missingFields: array, errors: array }
 */
const validatePermanentVehicleDocuments = (documents) => {
  const requiredFields = [
    // RC Book - Mandatory for all vehicles
    'rc_book_number',
    'rc_book_issue_date',
    'rc_book_expiry_date', 
    'rc_book_issuing_authority',
    'rc_book_url',
    
    // Insurance - Mandatory for legal operation
    'insurance_number',
    'insurance_issue_date',
    'insurance_expiry_date',
    'insurance_issuing_authority',
    'insurance_url',
    
    // Fitness Certificate - Mandatory for commercial vehicles
    'fitness_number',
    'fitness_issue_date', 
    'fitness_expiry_date',
    'fitness_issuing_authority',
    'fitness_url',
    
    // Pollution Certificate - Mandatory for environmental compliance
    'pollution_number',
    'pollution_issue_date',
    'pollution_expiry_date', 
    'pollution_issuing_authority',
    'pollution_url'
  ];
  
  const missingFields = [];
  const errors = [];
  
  // Check for missing required fields
  requiredFields.forEach(field => {
    if (!documents[field] || documents[field].toString().trim() === '') {
      missingFields.push(field);
    }
  });
  
  // Validate date formats and logical consistency
  if (documents.rc_book_issue_date && documents.rc_book_expiry_date) {
    if (new Date(documents.rc_book_issue_date) >= new Date(documents.rc_book_expiry_date)) {
      errors.push('RC Book issue date must be before expiry date');
    }
  }
  
  if (documents.insurance_issue_date && documents.insurance_expiry_date) {
    if (new Date(documents.insurance_issue_date) >= new Date(documents.insurance_expiry_date)) {
      errors.push('Insurance issue date must be before expiry date');
    }
  }
  
  // Check if insurance is still valid (not expired)
  if (documents.insurance_expiry_date) {
    if (new Date(documents.insurance_expiry_date) <= new Date()) {
      errors.push('Insurance must be valid (not expired)');
    }
  }
  
  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors
  };
};

/**
 * Validates required documents for temporary vehicles
 * @param {Object} documents - Document data provided by user  
 * @returns {Object} - { isValid: boolean, missingFields: array, errors: array }
 */
const validateTemporaryVehicleDocuments = (documents) => {
  const requiredFields = [
    // RC Book Copy - Must have owner's registration details
    'rc_book_number',
    'rc_book_issue_date',
    'rc_book_expiry_date',
    'rc_book_issuing_authority', 
    'rc_book_url',
    
    // Insurance Copy - Must have valid insurance from owner
    'insurance_number',
    'insurance_issue_date',
    'insurance_expiry_date',
    'insurance_issuing_authority',
    'insurance_url'
  ];
  
  const missingFields = [];
  const errors = [];
  
  // Check for missing required fields
  requiredFields.forEach(field => {
    if (!documents[field] || documents[field].toString().trim() === '') {
      missingFields.push(field);
    }
  });
  
  // Validate insurance is still valid for temporary vehicles
  if (documents.insurance_expiry_date) {
    if (new Date(documents.insurance_expiry_date) <= new Date()) {
      errors.push('Insurance must be valid for rental/lease vehicles');
    }
  }
  
  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors
  };
};

class VehicleController {
  
  /**
   * Get all vehicles for a transporter (both permanent and temporary)
   * 
   * This method provides a comprehensive fleet overview including:
   * - Vehicle details and status
   * - Document verification status  
   * - Availability information
   */
  static async getAllVehicles(req, res) {
    try {
      const { transporter_id } = req.user;
      
      // Fetch permanent vehicles with documents
      const permanentVehicles = await PermanentVehicle.findAll({
        where: { transporter_id },
        include: [{
          model: PermanentVehicleDocument,
          as: 'documents',
          required: false // LEFT JOIN to include vehicles without documents
        }],
        order: [['created_at', 'DESC']]
      });
      
      // Fetch temporary vehicles with documents
      const temporaryVehicles = await TemporaryVehicle.findAll({
        where: { transporter_id },
        include: [{
          model: TemporaryVehicleDocument,
          as: 'documents',
          required: false // LEFT JOIN to include vehicles without documents
        }],
        order: [['created_at', 'DESC']]
      });
      
      // Calculate fleet statistics
      const fleetStats = {
        total_vehicles: permanentVehicles.length + temporaryVehicles.length,
        permanent_count: permanentVehicles.length,
        temporary_count: temporaryVehicles.length,
        available_count: [
          ...permanentVehicles.filter(v => v.availability_status === 'available'),
          ...temporaryVehicles.filter(v => v.availability_status === 'available')
        ].length,
        verified_permanent: permanentVehicles.filter(v => v.verification_status === 'verified').length,
        pending_verification: permanentVehicles.filter(v => v.verification_status === 'pending').length
      };
      
      res.status(200).json({
        success: true,
        message: 'Fleet data retrieved successfully',
        data: {
          fleet_statistics: fleetStats,
          permanent_vehicles: permanentVehicles,
          temporary_vehicles: temporaryVehicles
        }
      });
      
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicles',
        error: error.message
      });
    }
  }
  
  /**
   * Add a new permanent vehicle with required documents (ATOMIC OPERATION)
   * 
   * This method implements the business rule that vehicles cannot be created without
   * all required documents. The operation is atomic - either both vehicle and documents
   * are created successfully, or nothing is created.
   * 
   * Required Documents for Permanent Vehicles:
   * - RC Book (Registration Certificate)
   * - Insurance Policy
   * - Fitness Certificate  
   * - Pollution Under Control Certificate
   * 
   * This method:
   * - Validates all required vehicle data and documents
   * - Checks for duplicate vehicle identifiers
   * - Creates vehicle and documents in a database transaction
   * - Ensures data consistency and integrity
   */
  static async addPermanentVehicle(req, res) {
    // Start database transaction for atomic operation
    const transaction = await sequelize.transaction();
    
    try {
      const { transporter_id } = req.user;
      
      // Separate vehicle data from document data
      const { 
        // Vehicle-specific fields
        vehicle_number, vehicle_type, capacity_kg, make, model, 
        year_of_manufacture, chassis_number, engine_number, 
        ownership_certificate_number, notes,
        
        // Document fields (all others are treated as documents)
        ...documentData 
      } = req.body;
      
      // Prepare vehicle data
      const vehicleData = {
        vehicle_number, vehicle_type, capacity_kg, make, model,
        year_of_manufacture, chassis_number, engine_number,
        ownership_certificate_number, notes,
        transporter_id,
        ownership_type: 'permanent',
        verification_status: 'pending',
        availability_status: 'available'
      };
      
      // STEP 1: Validate that all required documents are provided
      const documentValidation = validatePermanentVehicleDocuments(documentData);
      
      if (!documentValidation.isValid) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot create vehicle without all required documents',
          validation_errors: {
            missing_fields: documentValidation.missingFields,
            errors: documentValidation.errors
          },
          required_documents: {
            rc_book: ['number', 'issue_date', 'expiry_date', 'issuing_authority', 'url'],
            insurance: ['number', 'issue_date', 'expiry_date', 'issuing_authority', 'url'],
            fitness: ['number', 'issue_date', 'expiry_date', 'issuing_authority', 'url'],
            pollution: ['number', 'issue_date', 'expiry_date', 'issuing_authority', 'url']
          }
        });
      }
      
      // STEP 2: Validate vehicle data completeness
      const requiredVehicleFields = ['vehicle_number', 'vehicle_type', 'chassis_number', 'engine_number'];
      const missingVehicleFields = requiredVehicleFields.filter(field => !vehicleData[field]);
      
      if (missingVehicleFields.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing required vehicle information',
          missing_fields: missingVehicleFields
        });
      }
      
      // STEP 3: Check for duplicate vehicle identifiers
      const [existingVehicleNum, existingChassis, existingEngine] = await Promise.all([
        PermanentVehicle.findOne({ 
          where: { vehicle_number: vehicleData.vehicle_number },
          transaction 
        }),
        PermanentVehicle.findOne({ 
          where: { chassis_number: vehicleData.chassis_number },
          transaction 
        }),
        PermanentVehicle.findOne({ 
          where: { engine_number: vehicleData.engine_number },
          transaction 
        })
      ]);
      
      if (existingVehicleNum) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Vehicle with this registration number already exists',
          field: 'vehicle_number',
          value: vehicleData.vehicle_number
        });
      }
      
      if (existingChassis) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Vehicle with this chassis number already exists',
          field: 'chassis_number',
          value: vehicleData.chassis_number
        });
      }
      
      if (existingEngine) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Vehicle with this engine number already exists', 
          field: 'engine_number',
          value: vehicleData.engine_number
        });
      }
      
      // STEP 4: Create vehicle record within transaction
      const vehicle = await PermanentVehicle.create(vehicleData, { transaction });
      
      // STEP 5: Create document record within same transaction
      const documentRecord = await PermanentVehicleDocument.create({
        vehicle_id: vehicle.id,
        ...documentData,
        is_verified: false // Documents need admin verification
      }, { transaction });
      
      // STEP 6: Commit transaction - both vehicle and documents created successfully
      await transaction.commit();
      
      // STEP 7: Fetch complete record with documents for response
      const completeVehicle = await PermanentVehicle.findOne({
        where: { id: vehicle.id },
        include: [{
          model: PermanentVehicleDocument,
          as: 'documents'
        }]
      });
      
      res.status(201).json({
        success: true,
        message: 'Permanent vehicle and documents added successfully. Pending admin verification.',
        data: {
          vehicle: completeVehicle,
          next_steps: [
            'Vehicle is now pending admin verification',
            'All documents have been uploaded and recorded',
            'You will be notified once verification is complete',
            'Vehicle will be available for use after verification'
          ]
        }
      });
      
    } catch (error) {
      // Rollback transaction on any error
      await transaction.rollback();
      
      console.error('Error adding permanent vehicle with documents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add permanent vehicle and documents',
        error: error.message,
        note: 'Vehicle creation requires all documents to be provided simultaneously'
      });
    }
  }
  
  /**
   * Add a new temporary vehicle with required documents (ATOMIC OPERATION)
   * 
   * This method implements the same business rule for temporary/rental vehicles.
   * All essential documents must be provided when adding the vehicle.
   * 
   * Required Documents for Temporary Vehicles:
   * - RC Book Copy (from vehicle owner)
   * - Insurance Copy (valid insurance from owner)
   * 
   * This method:
   * - Validates vehicle data and essential documents
   * - Checks for duplicate vehicle numbers across both vehicle types
   * - Creates vehicle and documents in a database transaction
   * - Ensures rental compliance and documentation
   */
  static async addTemporaryVehicle(req, res) {
    // Start database transaction for atomic operation
    const transaction = await sequelize.transaction();
    
    try {
      const { transporter_id } = req.user;
      
      // Separate vehicle data from document data
      const {
        // Vehicle-specific fields
        vehicle_number, vehicle_type, ownership_type, capacity_kg,
        day_limit, notes,
        
        // Document fields
        ...documentData
      } = req.body;
      
      // Prepare vehicle data
      const vehicleData = {
        vehicle_number, vehicle_type, ownership_type, capacity_kg,
        day_limit, notes,
        transporter_id,
        availability_status: 'available'
      };
      
      // STEP 1: Validate that all required documents are provided
      const documentValidation = validateTemporaryVehicleDocuments(documentData);
      
      if (!documentValidation.isValid) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot create rental vehicle without required documents',
          validation_errors: {
            missing_fields: documentValidation.missingFields,
            errors: documentValidation.errors
          },
          required_documents: {
            rc_book_copy: ['number', 'issue_date', 'expiry_date', 'issuing_authority', 'url'],
            insurance_copy: ['number', 'issue_date', 'expiry_date', 'issuing_authority', 'url']
          },
          note: 'For rental vehicles, you must provide copies of owner documents'
        });
      }
      
      // STEP 2: Validate vehicle data completeness
      const requiredVehicleFields = ['vehicle_number', 'vehicle_type', 'ownership_type'];
      const missingVehicleFields = requiredVehicleFields.filter(field => !vehicleData[field]);
      
      if (missingVehicleFields.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing required vehicle information',
          missing_fields: missingVehicleFields
        });
      }
      
      // Validate ownership_type is appropriate for temporary vehicles
      if (!['temporary', 'leased'].includes(vehicleData.ownership_type)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid ownership type for temporary vehicle',
          field: 'ownership_type',
          allowed_values: ['temporary', 'leased']
        });
      }
      
      // STEP 3: Check for duplicate vehicle numbers across both tables
      const [existingPermanent, existingTemporary] = await Promise.all([
        PermanentVehicle.findOne({ 
          where: { vehicle_number: vehicleData.vehicle_number },
          transaction 
        }),
        TemporaryVehicle.findOne({ 
          where: { vehicle_number: vehicleData.vehicle_number },
          transaction 
        })
      ]);
      
      if (existingPermanent || existingTemporary) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Vehicle with this registration number already exists in system',
          field: 'vehicle_number',
          value: vehicleData.vehicle_number,
          note: 'Vehicle numbers must be unique across all vehicle types'
        });
      }
      
      // STEP 4: Create vehicle record within transaction
      const vehicle = await TemporaryVehicle.create(vehicleData, { transaction });
      
      // STEP 5: Create document record within same transaction  
      const documentRecord = await TemporaryVehicleDocument.create({
        vehicle_id: vehicle.id,
        ...documentData
      }, { transaction });
      
      // STEP 6: Commit transaction - both vehicle and documents created successfully
      await transaction.commit();
      
      // STEP 7: Fetch complete record with documents for response
      const completeVehicle = await TemporaryVehicle.findOne({
        where: { id: vehicle.id },
        include: [{
          model: TemporaryVehicleDocument,
          as: 'documents'
        }]
      });
      
      res.status(201).json({
        success: true,
        message: 'Temporary vehicle and documents added successfully.',
        data: {
          vehicle: completeVehicle,
          rental_info: {
            ownership_type: vehicleData.ownership_type,
            day_limit: vehicleData.day_limit || 'No limit set',
            status: 'Available for use'
          },
          next_steps: [
            'Vehicle is ready for immediate use',
            'All required documents have been recorded', 
            'Ensure rental agreement compliance',
            'Monitor day limits if applicable'
          ]
        }
      });
      
    } catch (error) {
      // Rollback transaction on any error
      await transaction.rollback();
      
      console.error('Error adding temporary vehicle with documents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add temporary vehicle and documents',
        error: error.message,
        note: 'Rental vehicle creation requires all essential documents to be provided simultaneously'
      });
    }
  }
  
  /**
   * Update vehicle availability status
   * 
   * This method allows transporters to update operational status of their vehicles
   * for better fleet management and order assignment.
   */
  static async updateVehicleStatus(req, res) {
    try {
      const { vehicleId, vehicleType } = req.params;
      const { availability_status, notes } = req.body;
      const { transporter_id } = req.user;
      
      const Model = vehicleType === 'permanent' ? PermanentVehicle : TemporaryVehicle;
      
      const vehicle = await Model.findOne({
        where: { 
          id: vehicleId,
          transporter_id 
        }
      });
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found or unauthorized access'
        });
      }
      
      await vehicle.update({ 
        availability_status,
        notes: notes || vehicle.notes
      });
      
      res.status(200).json({
        success: true,
        message: 'Vehicle status updated successfully',
        data: vehicle
      });
      
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle status',
        error: error.message
      });
    }
  }
  
  /**
   * Upload/Update vehicle documents
   * 
   * This method handles document uploads for vehicle compliance.
   * It creates or updates document records with verification workflow.
   */
  static async uploadVehicleDocuments(req, res) {
    try {
      const { vehicleId, vehicleType } = req.params;
      const { transporter_id } = req.user;
      const documentData = req.body;
      
      // Verify vehicle ownership
      const VehicleModel = vehicleType === 'permanent' ? PermanentVehicle : TemporaryVehicle;
      const DocumentModel = vehicleType === 'permanent' ? PermanentVehicleDocument : TemporaryVehicleDocument;
      
      const vehicle = await VehicleModel.findOne({
        where: { 
          id: vehicleId,
          transporter_id 
        }
      });
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found or unauthorized access'
        });
      }
      
      // Check if documents already exist
      let documents = await DocumentModel.findOne({
        where: { vehicle_id: vehicleId }
      });
      
      if (documents) {
        // Update existing documents
        await documents.update(documentData);
        res.status(200).json({
          success: true,
          message: 'Vehicle documents updated successfully',
          data: documents
        });
      } else {
        // Create new document record
        documents = await DocumentModel.create({
          vehicle_id: vehicleId,
          ...documentData
        });
        res.status(201).json({
          success: true,
          message: 'Vehicle documents uploaded successfully',
          data: documents
        });
      }
      
    } catch (error) {
      console.error('Error uploading vehicle documents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload vehicle documents',
        error: error.message
      });
    }
  }
  
  /**
   * Get vehicle details with documents
   * 
   * This method retrieves complete vehicle information including
   * all associated documents and verification status.
   */
  static async getVehicleDetails(req, res) {
    try {
      const { vehicleId, vehicleType } = req.params;
      const { transporter_id } = req.user;
      
      const VehicleModel = vehicleType === 'permanent' ? PermanentVehicle : TemporaryVehicle;
      const DocumentModel = vehicleType === 'permanent' ? PermanentVehicleDocument : TemporaryVehicleDocument;
      
      const vehicle = await VehicleModel.findOne({
        where: { 
          id: vehicleId,
          transporter_id 
        },
        include: [{
          model: DocumentModel,
          as: 'documents',
          required: false
        }]
      });
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found or unauthorized access'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Vehicle details retrieved successfully',
        data: vehicle
      });
      
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicle details',
        error: error.message
      });
    }
  }
  
  /**
   * Delete a vehicle
   * 
   * This method soft-deletes vehicles by setting is_active to false
   * rather than permanently removing records for audit purposes.
   */
  static async deleteVehicle(req, res) {
    try {
      const { vehicleId, vehicleType } = req.params;
      const { transporter_id } = req.user;
      
      const VehicleModel = vehicleType === 'permanent' ? PermanentVehicle : TemporaryVehicle;
      
      const vehicle = await VehicleModel.findOne({
        where: { 
          id: vehicleId,
          transporter_id 
        }
      });
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found or unauthorized access'
        });
      }
      
      // Soft delete by setting is_active to false
      await vehicle.update({ is_active: false });
      
      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete vehicle',
        error: error.message
      });
    }
  }
  
  /**
   * Get vehicles by availability status
   * 
   * This method filters vehicles by availability status for
   * order assignment and fleet management purposes.
   */
  static async getVehiclesByStatus(req, res) {
    try {
      const { status } = req.params;
      const { transporter_id } = req.user;
      
      const [permanentVehicles, temporaryVehicles] = await Promise.all([
        PermanentVehicle.findAll({
          where: { 
            transporter_id,
            availability_status: status,
            is_active: true
          }
        }),
        TemporaryVehicle.findAll({
          where: { 
            transporter_id,
            availability_status: status,
            is_active: true
          }
        })
      ]);
      
      res.status(200).json({
        success: true,
        message: `Vehicles with status '${status}' retrieved successfully`,
        data: {
          permanent_vehicles: permanentVehicles,
          temporary_vehicles: temporaryVehicles,
          total_count: permanentVehicles.length + temporaryVehicles.length
        }
      });
      
    } catch (error) {
      console.error('Error fetching vehicles by status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicles by status',
        error: error.message
      });
    }
  }
}

module.exports = VehicleController;