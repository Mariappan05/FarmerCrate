const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const FarmerUser = require('./farmer_user.model');
const CustomerUser = require('./customer_user.model');
const TransporterUser = require('./transporter_user.model');
const Product = require('./product.model');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  commission: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '10% commission for admin'
  },
  farmerAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '90% of total amount for farmer'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  }
});

// Define associations
Order.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmerId' });
Order.belongsTo(CustomerUser, { as: 'consumer', foreignKey: 'consumerId' });
Order.belongsTo(Product, { foreignKey: 'productId' });

// Hook to calculate commission and farmer amount
Order.beforeCreate(async (order) => {
  const product = await Product.findByPk(order.productId);
  order.totalAmount = product.price * order.quantity;
  order.commission = order.totalAmount * 0.10; // 10% commission
  order.farmerAmount = order.totalAmount * 0.90; // 90% for farmer
});

module.exports = Order; 