const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;
const User = require('./user.model');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('available', 'sold_out', 'hidden'),
    defaultValue: 'available'
  },
  lastPriceUpdate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// Define associations
Product.belongsTo(User, { as: 'farmer', foreignKey: 'farmerId' });

module.exports = Product; 