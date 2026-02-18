const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');
const PermanentVehicleDocument = require('../models/permanentVehicleDocument.model');
const TransporterUser = require('../models/transporter_user.model');
const { sequelize } = require('../config/database');

class VehicleController {
  
  static async getAllVehicles(req, res) {
    try {
      const { transporter_id } = req.user;
      
      const permanentVehicles = await PermanentVehicle.findAll({
        where: { transporter_id },
        order: [['created_at', 'DESC']]
      });
      
      const temporaryVehicles = await TemporaryVehicle.findAll({
        where: { transporter_id },
        order: [['created_at', 'DESC']]
      });
      
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
      const { transporter_id } = req.user;
      const { vehicle_number, vehicle_type, capacity, rc_url, insurance_url, permit_url } = req.body;
      
      const existingVehicle = await PermanentVehicle.findOne({
        where: { vehicle_number }
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this number already exists'
        });
      }
      
      const vehicle = await PermanentVehicle.create({
        vehicle_number,
        vehicle_type,
        capacity,
        transporter_id
      });
      
      // Create document record if URLs provided
      if (rc_url || insurance_url || permit_url) {
        await PermanentVehicleDocument.create({
          vehicle_id: vehicle.vehicle_id,
          rc_book_url: rc_url,
          insurance_url: insurance_url,
          permit_url: permit_url
        });
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
      const { transporter_id } = req.user;
      
      const { 
        vehicle_number, vehicle_type, rental_start_date, rental_end_date,
        capacity, rc_book_number, rc_book_url, insurance_number, insurance_url
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
      
      const vehicle = await TemporaryVehicle.create({
        vehicle_number, vehicle_type, rental_start_date, rental_end_date,
        capacity, rc_book_number, rc_book_url, insurance_number, insurance_url,
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
      const { vehicle_type } = req.body;
      const { transporter_id } = req.user;
      
      return res.status(400).json({
        success: false,
        message: 'Vehicle availability feature not available'
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