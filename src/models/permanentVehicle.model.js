/**
 * Permanent Vehicles Model
 * 
 * This model represents vehicles that are permanently owned by transporters.
 * It includes all vehicle details, ownership information, and verification status.
 * 
 * Key Features:
 * - Tracks vehicle ownership and basic information
 * - Includes verification workflow (pending -> verified/rejected)
 * - Supports availability status for fleet management
 * - Maintains audit trail with created/updated timestamps
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PermanentVehicle = sequelize.define('permanent_vehicles', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Unique identifier for permanent vehicle'
  },
  
  transporter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to transporter who owns this vehicle'
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
    type: DataTypes.ENUM('permanent'),
    defaultValue: 'permanent',
    comment: 'Fixed as permanent for this table'
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
  
  // Vehicle specifications
  make: {
    type: DataTypes.STRING(100),
    comment: 'Vehicle manufacturer (e.g., Tata, Ashok Leyland)'
  },
  
  model: {
    type: DataTypes.STRING(100),
    comment: 'Vehicle model name'
  },
  
  year_of_manufacture: {
    type: DataTypes.INTEGER,
    comment: 'Manufacturing year of the vehicle'
  },
  
  chassis_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Vehicle chassis number (must be unique)'
  },
  
  engine_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Engine serial number (must be unique)'
  },
  
  ownership_certificate_number: {
    type: DataTypes.STRING(100),
    comment: 'Registration certificate or ownership document number'
  },
  
  // Verification workflow
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'expired'),
    defaultValue: 'pending',
    comment: 'Admin verification status for compliance'
  },
  
  verified_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin user who verified this vehicle'
  },
  
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when verification was completed'
  },
  
  rejection_reason: {
    type: DataTypes.TEXT,
    comment: 'Reason for rejection if verification fails'
  },
  
  notes: {
    type: DataTypes.TEXT,
    comment: 'Additional notes about the vehicle'
  }
}, {
  tableName: 'permanent_vehicles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  
  // Database indexes for performance optimization
  indexes: [
    {
      name: 'idx_perm_vehicle_transporter',
      fields: ['transporter_id'],
      comment: 'Fast lookup of vehicles by transporter'
    },
    {
      name: 'idx_perm_vehicle_number',
      fields: ['vehicle_number'],
      comment: 'Quick vehicle search by registration number'
    },
    {
      name: 'idx_perm_vehicle_status',
      fields: ['availability_status', 'is_active'],
      comment: 'Filter available vehicles efficiently'
    },
    {
      name: 'idx_perm_vehicle_verification',
      fields: ['verification_status'],
      comment: 'Admin workflow for pending verifications'
    }
  ]
});

module.exports = PermanentVehicle;