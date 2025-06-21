const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const FarmerUser = require('./farmer_user.model');
const CustomerUser = require('./customer_user.model');
const TransporterUser = require('./transporter_user.model');
const Order = require('./order.model');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('commission', 'sale', 'withdrawal', 'deposit'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Define associations
Transaction.belongsTo(FarmerUser, { foreignKey: 'userId' });
Transaction.belongsTo(Order, { foreignKey: 'orderId', allowNull: true });

module.exports = Transaction; 