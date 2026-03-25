const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PermanentVehicle = sequelize.define('permanent_vehicles', {
  vehicle_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transporter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'transporters',
      key: 'transporter_id'
    },
    onDelete: 'CASCADE'
  },
  vehicle_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  vehicle_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER
  },
  rc_book_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ownership_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Owned'
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  rc_copy_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  insurance_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permit_url: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'permanent_vehicles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = PermanentVehicle;
