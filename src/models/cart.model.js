const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;
const User = require('./user.model');
const Product = require('./product.model');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
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
Cart.belongsTo(User, { foreignKey: 'userId' });
Cart.belongsTo(Product, { foreignKey: 'productId' });

module.exports = Cart; 