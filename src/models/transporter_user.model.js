const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TransporterUser = sequelize.define('transporter_users', {
  transporter_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile_number: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  age: { type: DataTypes.INTEGER },
  address: { type: DataTypes.STRING },
  zone: { type: DataTypes.STRING },
  district: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  image_url: { type: DataTypes.STRING }
}, {
  timestamps: false
});

module.exports = TransporterUser; 