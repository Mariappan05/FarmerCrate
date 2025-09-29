const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductPriceHistory = sequelize.define('product_price_history', {
  history_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'product_id'
    },
    onDelete: 'CASCADE'
  },
  old_price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  new_price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  updated_by_role: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'product_price_history',
  timestamps: false,
  createdAt: false,
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = ProductPriceHistory;