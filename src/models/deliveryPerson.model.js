const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPerson = sequelize.define('delivery_persons', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { 
    type: DataTypes.INTEGER, 
    unique: true, 
    allowNull: false
  },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  vehicle_number: { type: DataTypes.STRING(50), allowNull: false },
  license_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  license_url: { type: DataTypes.STRING },
  vehicle_type: { type: DataTypes.ENUM('bike', 'auto', 'van', 'truck'), allowNull: false },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
  current_location_lat: { type: DataTypes.DECIMAL(10, 8) },
  current_location_lng: { type: DataTypes.DECIMAL(11, 8) },
  rating: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0.00 },
  total_deliveries: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'delivery_persons',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = DeliveryPerson;