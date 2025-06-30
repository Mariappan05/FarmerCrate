const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TransporterUser = sequelize.define('transporter_users', {
  transporter_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  unique_id: { type: DataTypes.STRING(6), allowNull: true, unique: true, comment: '6-digit verification code' },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile_number: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  age: { type: DataTypes.INTEGER },
  address: { type: DataTypes.STRING },
  zone: { type: DataTypes.STRING },
  district: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING, allowNull: false },
  verified_status: { type: DataTypes.BOOLEAN, defaultValue: false },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  approval_notes: { type: DataTypes.TEXT, allowNull: true },
  rejected_at: { type: DataTypes.DATE, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  code_updated_at: { type: DataTypes.DATE, allowNull: true },
  image_url: { type: DataTypes.STRING, allowNull: true },
  aadhar_url: { type: DataTypes.STRING, allowNull: true },
  pan_url: { type: DataTypes.STRING, allowNull: true },
  voter_id_url: { type: DataTypes.STRING, allowNull: true },
  license_url: { type: DataTypes.STRING, allowNull: true },
  aadhar_number: { type: DataTypes.STRING, allowNull: true },
  pan_number: { type: DataTypes.STRING, allowNull: true },
  voter_id_number: { type: DataTypes.STRING, allowNull: true },
  license_number: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'transporter_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = TransporterUser;