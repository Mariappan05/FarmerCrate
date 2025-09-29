const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FarmerVerificationHistory = sequelize.define('farmer_verification_history', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  farmer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'farmers',
      key: 'farmer_id'
    },
    onDelete: 'CASCADE'
  },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'failed', 'error'),
    allowNull: false
  },
  verification_response: {
    type: DataTypes.TEXT
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'farmer_verification_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = FarmerVerificationHistory;