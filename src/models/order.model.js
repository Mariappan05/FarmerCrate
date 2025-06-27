const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const FarmerUser = require('./farmer_user.model');
const CustomerUser = require('./customer_user.model');
const Product = require('./product.model');

const Order = sequelize.define('orders', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  commission: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: '10% commission for admin' },
  farmerAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: '90% of total amount for farmer' },
  status: { type: DataTypes.ENUM('pending', 'processing', 'completed', 'cancelled'), defaultValue: 'pending' },
  deliveryAddress: { type: DataTypes.TEXT, allowNull: false },
  paymentStatus: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
  farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: FarmerUser, key: 'id' } },
  consumer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: CustomerUser, key: 'id' } },
  product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: Product, key: 'id' } }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Define associations
Order.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id' });
Order.belongsTo(CustomerUser, { as: 'consumer', foreignKey: 'consumer_id' });
Order.belongsTo(Product, { foreignKey: 'product_id' });

// Hook to calculate commission and farmer amount
Order.beforeCreate(async (order) => {
  const product = await Product.findByPk(order.product_id);
  order.totalAmount = product.price * order.quantity;
  order.commission = order.totalAmount * 0.10; // 10% commission
  order.farmerAmount = order.totalAmount * 0.90; // 90% for farmer
});

module.exports = Order; 