const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryTracking = sequelize.define('delivery_tracking', {
  tracking_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'order_id'
    },
    onDelete: 'CASCADE'
  },
  status: {
    type: DataTypes.ENUM(
      'PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 
      'RECEIVED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'
    ),
    allowNull: false
  },
  location_lat: {
    type: DataTypes.DECIMAL(10, 8),
    field: 'latitude'
  },
  location_lng: {
    type: DataTypes.DECIMAL(11, 8),
    field: 'longitude'
  },
  location_address: {
    type: DataTypes.TEXT
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'delivery_tracking',
  timestamps: true,
  createdAt: 'scanned_at',
  updatedAt: false,
  underscored: true
});

module.exports = DeliveryTracking;