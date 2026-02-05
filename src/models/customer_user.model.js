const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomerUser = sequelize.define('customer_users', {
  customer_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile_number: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  address: { type: DataTypes.STRING },
  zone: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  district: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING, allowNull: false },
  age: { type: DataTypes.INTEGER },
  image_url: { type: DataTypes.STRING },
  google_id: { type: DataTypes.STRING, unique: true },
  first_login_completed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'customer_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = CustomerUser; 