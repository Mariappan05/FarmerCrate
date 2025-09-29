const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TemporaryVehicle = sequelize.define('temporary_vehicles', {
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
    type: DataTypes.ENUM('bike', 'auto', 'van', 'truck'),
    allowNull: false
  },
  rental_start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  rental_end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  rc_book_number: {
    type: DataTypes.STRING(100)
  },
  rc_book_url: {
    type: DataTypes.TEXT
  },
  insurance_number: {
    type: DataTypes.STRING(100)
  },
  insurance_url: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'temporary_vehicles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = TemporaryVehicle;