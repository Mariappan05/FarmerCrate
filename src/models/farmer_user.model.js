const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FarmerUser = sequelize.define('farmer_users', {
  farmer_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  unique_id: { type: DataTypes.STRING, allowNull: true, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile_number: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  address: { type: DataTypes.STRING },
  zone: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  district: { type: DataTypes.STRING },
  verified_status: { type: DataTypes.BOOLEAN, defaultValue: false },
  password: { type: DataTypes.STRING, allowNull: false },
  age: { type: DataTypes.INTEGER },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  account_number: { type: DataTypes.STRING },
  ifsc_code: { type: DataTypes.STRING },
  image_url: { type: DataTypes.STRING }
}, {
  timestamps: false
});

module.exports = FarmerUser; 