const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const FarmerUser = require('./farmer_user.model');
const CustomerUser = require('./customer_user.model');
const TransporterUser = require('./transporter_user.model');
const Order = require('./order.model');

const Transaction = sequelize.define('transactions', {
  transaction_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  type: { type: DataTypes.ENUM('credit', 'debit', 'refund'), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
  description: { type: DataTypes.TEXT, allowNull: true },
  farmer_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: 'farmers', key: 'farmer_id' },
    onDelete: 'CASCADE'
  },
  order_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    references: { model: 'orders', key: 'order_id' },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Define associations
Transaction.belongsTo(FarmerUser, { foreignKey: 'farmer_id' });
Transaction.belongsTo(Order, { foreignKey: 'order_id' });

module.exports = Transaction; 