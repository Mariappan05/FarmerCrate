const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('orders', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  commission: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: '10% commission for admin' },
  farmer_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: '90% of total amount for farmer' },
  status: { type: DataTypes.ENUM('pending', 'processing', 'completed', 'cancelled'), defaultValue: 'pending' },
  delivery_address: { type: DataTypes.TEXT, allowNull: false },
  payment_status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
  farmer_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'farmer_users', key: 'id' },
    onDelete: 'CASCADE'
  },
  consumer_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'customer_users', key: 'id' },
    onDelete: 'CASCADE'
  },
  product_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'products', key: 'id' },
    onDelete: 'CASCADE'
  },
  delivery_person_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: { model: 'delivery_persons', key: 'id' },
    onDelete: 'SET NULL'
  },
  transport_charge: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: true, 
    defaultValue: 0.00,
    comment: 'Transport/delivery charge'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});



module.exports = Order; 