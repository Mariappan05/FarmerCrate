const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('products', {
  product_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  current_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  images: { type: DataTypes.STRING, allowNull: true },
  category: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('available', 'sold_out', 'hidden'), defaultValue: 'available' },
  last_price_update: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
  harvest_date: { type: DataTypes.DATEONLY, allowNull: true },
  expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
  farmer_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'farmers', key: 'farmer_id' },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});


module.exports = Product; 