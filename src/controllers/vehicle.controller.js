const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');
const PermanentVehicleDocument = require('../models/permanentVehicleDocument.model');
const TransporterUser = require('../models/transporter_user.model');
const { sequelize } = require('../config/database');
const { validationResult } = require('express-validator');

class VehicleController {
  
  static async getAllVehicles(req, res) {
    try {
      const { transporter_id } = req.user;
      
      if (!transporter_id) {
        return res.status(400).json({
          success: false,
          message: 'Transporter ID not found in authentication token'
        });
      }

      let permanentVehicles = [];
      let temporaryVehicles = [];

      // Fetch permanent vehicles — fallback to raw query if model fails
      try {
        permanentVehicles = await PermanentVehicle.findAll({
          where: { transporter_id },
          order: [['created_at', 'DESC']]
        });
      } catch (pvErr) {
        console.error('PermanentVehicle query failed, trying raw SQL:', pvErr.message);
        try {
          const [rows] = await sequelize.query(
            'SELECT * FROM permanent_vehicles WHERE transporter_id = :tid ORDER BY created_at DESC',
            { replacements: { tid: transporter_id } }
          );
          permanentVehicles = rows || [];
        } catch (rawErr) {
          console.error('Raw permanent_vehicles query also failed:', rawErr.message);
        }
      }
      
      // Fetch temporary vehicles — fallback to raw query if model fails
      try {
        temporaryVehicles = await TemporaryVehicle.findAll({
          where: { transporter_id },
          order: [['created_at', 'DESC']]
        });
      } catch (tvErr) {
        console.error('TemporaryVehicle query failed, trying raw SQL:', tvErr.message);
        try {
          const [rows] = await sequelize.query(
            'SELECT * FROM temporary_vehicles WHERE transporter_id = :tid ORDER BY created_at DESC',
            { replacements: { tid: transporter_id } }
          );
          temporaryVehicles = rows || [];
        } catch (rawErr) {
          console.error('Raw temporary_vehicles query also failed:', rawErr.message);
        }
      }
      
      const fleetStats = {
        total_vehicles: permanentVehicles.length + temporaryVehicles.length,
        permanent_count: permanentVehicles.length,
        temporary_count: temporaryVehicles.length
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
  
  static async addPermanentVehicle(req, res) {
    try {
      // Check express-validator results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { transporter_id } = req.user;
      // Accept both frontend and backend field naming conventions
      const { 
        vehicle_number, vehicle_type, capacity, 
        rc_book_number, ownership_type,
        rc_url, rc_copy_url, insurance_url, permit_url 
      } = req.body;
      
      const existingVehicle = await PermanentVehicle.findOne({
        where: { vehicle_number }
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this number already exists'
        });
      }
      
      // Parse capacity — frontend may send string like "500 kg"
      let parsedCapacity = null;
      if (capacity) {
        const num = parseInt(String(capacity).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) parsedCapacity = num;
      }

      const vehicle = await PermanentVehicle.create({
        vehicle_number,
        vehicle_type,
        capacity: parsedCapacity,
        rc_book_number: rc_book_number || null,
        ownership_type: ownership_type || 'Owned',
        rc_copy_url: rc_copy_url || rc_url || null,
        insurance_url: insurance_url || null,
        permit_url: permit_url || null,
        transporter_id
      });
      
      // Create document record with URLs (legacy support)
      const finalRcUrl = rc_copy_url || rc_url || null;
      if (finalRcUrl || insurance_url || permit_url) {
        try {
          await PermanentVehicleDocument.create({
            vehicle_id: vehicle.vehicle_id,
            rc_book_url: finalRcUrl,
            insurance_url: insurance_url,
            permit_url: permit_url
          });
        } catch (docError) {
          console.warn('Document record creation failed (non-critical):', docError.message);
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Permanent vehicle added successfully',
        data: vehicle
      });
      
    } catch (error) {
      console.error('Error adding permanent vehicle:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add permanent vehicle',
        error: error.message
      });
    }
  }
  
  static async addTemporaryVehicle(req, res) {
    try {
      // Check express-validator results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { transporter_id } = req.user;
      
      const { 
        vehicle_number, vehicle_type, rental_start_date, rental_end_date,
        capacity, rc_book_number, rc_book_url, rc_copy_url, rc_url,
        insurance_number, insurance_url, ownership_type, permit_url
      } = req.body;
      
      const existingVehicle = await TemporaryVehicle.findOne({
        where: { vehicle_number }
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this number already exists'
        });
      }
      
      // Parse capacity — frontend may send string like "500 kg"
      let parsedCapacity = null;
      if (capacity) {
        const num = parseInt(String(capacity).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) parsedCapacity = num;
      }

      const vehicle = await TemporaryVehicle.create({
        vehicle_number, 
        vehicle_type, 
        rental_start_date: rental_start_date || new Date(),
        rental_end_date: rental_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        capacity: parsedCapacity, 
        rc_book_number, 
        rc_book_url: rc_book_url || rc_copy_url || rc_url || null, 
        insurance_number, 
        insurance_url,
        transporter_id
      });
      
      res.status(201).json({
        success: true,
        message: 'Temporary vehicle added successfully',
        data: vehicle
      });
      
    } catch (error) {
      console.error('Error adding temporary vehicle:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add temporary vehicle',
        error: error.message
      });
    }
  }
  
  static async updateVehicleAvailability(req, res) {
    try {
      const { vehicle_id } = req.params;
      const { vehicle_type, is_available } = req.body;
      const { transporter_id } = req.user;
      
      const VehicleModel = vehicle_type === 'temporary' ? TemporaryVehicle : PermanentVehicle;
      
      const vehicle = await VehicleModel.findOne({
        where: { vehicle_id, transporter_id }
      });
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found or not owned by you'
        });
      }
      
      // Toggle availability
      const newAvailability = is_available !== undefined ? is_available : !vehicle.is_available;
      await vehicle.update({ is_available: newAvailability });
      
      res.status(200).json({
        success: true,
        message: `Vehicle availability updated to ${newAvailability ? 'available' : 'unavailable'}`,
        data: vehicle
      });
      
    } catch (error) {
      console.error('Error updating vehicle availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle availability',
        error: error.message
      });
    }
  }
  
  static async deleteVehicle(req, res) {
    try {
      const { vehicle_id } = req.params;
      const { vehicle_type } = req.body;
      const { transporter_id } = req.user;
      
      let vehicle;
      if (vehicle_type === 'permanent') {
        vehicle = await PermanentVehicle.findOne({
          where: { vehicle_id, transporter_id }
        });
      } else {
        vehicle = await TemporaryVehicle.findOne({
          where: { vehicle_id, transporter_id }
        });
      }
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found or not owned by you'
        });
      }
      
      await vehicle.destroy();
      
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
}

module.exports = VehicleController;