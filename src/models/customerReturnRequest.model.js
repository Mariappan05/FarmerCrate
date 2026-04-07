const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomerReturnRequest = sequelize.define('customer_return_requests', {
  return_request_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'orders', key: 'order_id' },
    onDelete: 'CASCADE',
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'customer_users', key: 'customer_id' },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'REQUESTED',
  },
  report: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  opening_video_url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  related_photos: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  proof_evidence_photos: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'customer_return_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

module.exports = CustomerReturnRequest;
