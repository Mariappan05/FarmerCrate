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
        include: [{
          model: PermanentVehicleDocument,
          as: 'documents',
          required: false
        }],
        order: [['created_at', 'DESC']]
      });
      
      const temporaryVehicles = await TemporaryVehicle.findAll({
        where: { transporter_id },
        order: [['created_at', 'DESC']]
      });
      
      const fleetStats = {
        total_vehicles: permanentVehicles.length + temporaryVehicles.length,
        permanent_count: permanentVehicles.length,
        temporary_count: temporaryVehicles.length,
        available_count: [
          ...permanentVehicles.filter(v => v.is_available),
          ...temporaryVehicles.filter(v => v.is_available)
        ].length
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
    const transaction = await sequelize.transaction();
    
    try {
      const { transporter_id } = req.user;
      
      const { 
        vehicle_number, vehicle_type, capacity, rc_url, insurance_url, permit_url,
        ...documentData 
      } = req.body;
      
      const vehicleData = {
        vehicle_number, vehicle_type, capacity, rc_url, insurance_url, permit_url,
        transporter_id,
        is_available: true
      };
      
      const existingVehicle = await PermanentVehicle.findOne({
        where: { vehicle_number }
      });
      
      if (existingVehicle) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this number already exists'
        });
      }
      
      const vehicle = await PermanentVehicle.create(vehicleData, { transaction });
      
      if (Object.keys(documentData).length > 0) {
        await PermanentVehicleDocument.create({
          vehicle_id: vehicle.vehicle_id,
          ...documentData
        }, { transaction });
      }
      
      await transaction.commit();
      
      // Fetch complete vehicle with documents
      const completeVehicle = await PermanentVehicle.findByPk(vehicle.vehicle_id, {
        include: [{
          model: PermanentVehicleDocument,
          as: 'documents',
          required: false
        }]
      });
      
      res.status(201).json({
        success: true,
        message: 'Permanent vehicle added successfully',
        data: completeVehicle
      });
      
    } catch (error) {
      await transaction.rollback();
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
        transporter_id,
        is_available: true
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
      
      await vehicle.update({ is_available });
      
      res.status(200).json({
        success: true,
        message: 'Vehicle availability updated successfully',
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