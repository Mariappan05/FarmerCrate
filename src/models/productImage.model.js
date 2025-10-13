const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductImage = sequelize.define('product_images', {
  image_id: { 
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
  image_url: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  is_primary: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  display_order: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 
  }
}, {
  tableName: 'product_images',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = ProductImage;