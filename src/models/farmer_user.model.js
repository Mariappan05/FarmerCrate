const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FarmerUser = sequelize.define('FarmerUser', {
  farmer_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  unique_id: { 
    type: DataTypes.STRING(50), 
    unique: true 
  },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile_number: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  address: { type: DataTypes.STRING },
  zone: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  district: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING, allowNull: false },
  age: { type: DataTypes.INTEGER },
  account_number: { type: DataTypes.STRING(50) },
  ifsc_code: { type: DataTypes.STRING(20) },
  image_url: { type: DataTypes.STRING },
  google_id: { type: DataTypes.STRING(255), unique: true },
  is_verified_by_gov: { type: DataTypes.BOOLEAN, defaultValue: false },
  verification_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  verification_request_sent: { type: DataTypes.DATE },
  verification_completed_at: { type: DataTypes.DATE },
  verification_notes: { type: DataTypes.TEXT }
}, {
  tableName: 'farmers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = FarmerUser;