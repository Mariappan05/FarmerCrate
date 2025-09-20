/**
 * Temporary Vehicles Model
 * 
 * This model represents vehicles that are rented or leased by transporters.
 * It tracks rental agreements, lease terms, and temporary usage patterns.
 * 
 * Key Features:
 * - Manages rental/lease vehicles separately from permanent fleet
 * - Tracks rental periods with day limits
 * - Simpler structure focusing on operational availability
 * - Supports both temporary rental and lease-to-own scenarios
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TemporaryVehicle = sequelize.define('temporary_vehicles', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Unique identifier for temporary vehicle'
  },
  
  transporter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to transporter using this vehicle'
  },
  
  vehicle_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Vehicle registration number (must be unique across system)'
  },
  
  vehicle_type: {
    type: DataTypes.ENUM('truck', 'trailer', 'container', 'pickup', 'tempo'),
    allowNull: false,
    comment: 'Type of vehicle for capacity and usage planning'
  },
  
  ownership_type: {
    type: DataTypes.ENUM('temporary', 'leased'),
    allowNull: false,
    comment: 'Rental type - temporary rental or lease agreement'
  },
  
  capacity_kg: {
    type: DataTypes.DECIMAL(10, 2),
    comment: 'Vehicle carrying capacity in kilograms'
  },
  
  availability_status: {
    type: DataTypes.ENUM('available', 'in_transit', 'maintenance', 'breakdown', 'reserved'),
    defaultValue: 'available',
    comment: 'Current operational status of the vehicle'
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether vehicle is currently in service'
  },
  
  notes: {
    type: DataTypes.TEXT,
    comment: 'Additional notes about rental terms or vehicle condition'
  },
  
  day_limit: {
    type: DataTypes.INTEGER,
    comment: 'Maximum days this vehicle can be used (rental period limit)'
  }
}, {
  tableName: 'temporary_vehicles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  
  // Database indexes for performance optimization
  indexes: [
    {
      name: 'idx_temp_vehicle_transporter',
      fields: ['transporter_id'],
      comment: 'Fast lookup of vehicles by transporter'
    },
    {
      name: 'idx_temp_vehicle_number',
      fields: ['vehicle_number'],
      comment: 'Quick vehicle search by registration number'
    },
    {
      name: 'idx_temp_vehicle_status',
      fields: ['availability_status', 'is_active'],
      comment: 'Filter available vehicles efficiently'
    },
    {
      name: 'idx_temp_vehicle_type',
      fields: ['ownership_type'],
      comment: 'Distinguish between rental types'
    }
  ]
});

module.exports = TemporaryVehicle;