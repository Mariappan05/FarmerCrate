const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TransporterUser = sequelize.define('transporters', {
  transporter_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  unique_id: { type: DataTypes.STRING(50), allowNull: true },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile_number: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  age: { type: DataTypes.INTEGER },
  address: { type: DataTypes.TEXT },
  zone: { type: DataTypes.STRING },
  district: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  pincode: { type: DataTypes.STRING(10) },
  password: { type: DataTypes.STRING, allowNull: false },
  verified_status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  image_url: { type: DataTypes.TEXT },
  aadhar_url: { type: DataTypes.TEXT },
  pan_url: { type: DataTypes.TEXT },
  voter_id_url: { type: DataTypes.TEXT },
  license_url: { type: DataTypes.TEXT },
  aadhar_number: { type: DataTypes.STRING(20) },
  pan_number: { type: DataTypes.STRING(20) },
  voter_id_number: { type: DataTypes.STRING(50) },
  license_number: { type: DataTypes.STRING(50) },
  account_number: { type: DataTypes.STRING(50) },
  ifsc_code: { type: DataTypes.STRING(20) }
}, {
  tableName: 'transporters',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    { unique: true, fields: ['unique_id'] }
  ]
});

module.exports = TransporterUser;