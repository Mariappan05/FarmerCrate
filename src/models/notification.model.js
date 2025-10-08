const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('notifications', {
  notification_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_type: { type: DataTypes.ENUM('farmer', 'customer', 'transporter', 'admin'), allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { 
    type: DataTypes.ENUM('order', 'payment', 'delivery', 'system', 'promotion'), 
    allowNull: false 
  },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  order_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: { model: 'orders', key: 'order_id' },
    onDelete: 'CASCADE'
  },
  action_url: { type: DataTypes.STRING }
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = Notification;