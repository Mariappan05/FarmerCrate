const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const CustomerUser = require('./customer_user.model');
const Product = require('./product.model');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CustomerUser,
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  timestamps: true
});

// Define relationships
Cart.belongsTo(CustomerUser, { foreignKey: 'customerId' });
Cart.belongsTo(Product, { foreignKey: 'productId' });

module.exports = Cart;
