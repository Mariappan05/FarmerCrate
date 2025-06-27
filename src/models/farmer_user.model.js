const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FarmerUser = sequelize.define('farmer_users', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  unique_id: { type: DataTypes.STRING(6), allowNull: true, unique: true, comment: '6-digit verification code' },
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
  account_number: { type: DataTypes.STRING },
  ifsc_code: { type: DataTypes.STRING },
  image_url: { type: DataTypes.STRING },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  approval_notes: { type: DataTypes.TEXT, allowNull: true },
  rejected_at: { type: DataTypes.DATE, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  code_updated_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'farmer_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = FarmerUser;