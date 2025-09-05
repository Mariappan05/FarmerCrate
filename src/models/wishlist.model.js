const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const CustomerUser = require('./customer_user.model');
const Product = require('./product.model');

const Wishlist = sequelize.define('Wishlist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CustomerUser,
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  }
}, {
  tableName: 'wishlists',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['customer_id', 'product_id']
    }
  ]
});

module.exports = Wishlist;