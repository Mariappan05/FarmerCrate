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
    type: DataTypes.ENUM('bike', 'auto', 'van', 'truck'),
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'permanent_vehicles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = PermanentVehicle;