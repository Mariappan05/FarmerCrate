const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('products', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  images: { type: DataTypes.STRING, allowNull: true },
  category: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('available', 'sold_out', 'hidden'), defaultValue: 'available' },
  last_price_update: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
  farmer_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});


module.exports = Product; 