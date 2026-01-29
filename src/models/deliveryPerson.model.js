const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryPerson = sequelize.define('delivery_persons', {
  delivery_person_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  transporter_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  vehicle_number: { type: DataTypes.STRING(50), allowNull: false },
  license_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  license_url: { type: DataTypes.STRING },
  image_url: { type: DataTypes.STRING },
  vehicle_type: { type: DataTypes.ENUM('bike', 'auto', 'van', 'truck'), allowNull: false },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
  current_location: { type: DataTypes.STRING },
  rating: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0.00 },
  total_deliveries: { type: DataTypes.INTEGER, defaultValue: 0 },
  first_login_completed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'delivery_persons',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = DeliveryPerson;