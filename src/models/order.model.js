const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('orders', {
  order_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'customer_users', key: 'customer_id' },
    onDelete: 'CASCADE'
  },
  product_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'products', key: 'product_id' },
    onDelete: 'CASCADE'
  },
  source_transporter_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: { model: 'transporters', key: 'transporter_id' },
    onDelete: 'SET NULL'
  },
  destination_transporter_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: { model: 'transporters', key: 'transporter_id' },
    onDelete: 'SET NULL'
  },
  delivery_person_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: { model: 'delivery_persons', key: 'delivery_person_id' },
    onDelete: 'SET NULL'
  },
  permanent_vehicle_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: { model: 'permanent_vehicles', key: 'vehicle_id' },
    onDelete: 'SET NULL'
  },
  temp_vehicle_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: { model: 'temporary_vehicles', key: 'vehicle_id' },
    onDelete: 'SET NULL'
  },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  farmer_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  admin_commission: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  transport_charge: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_status: { 
    type: DataTypes.ENUM('pending', 'completed', 'failed'), 
    defaultValue: 'pending' 
  },
  current_status: { 
    type: DataTypes.ENUM(
      'PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 
      'RECEIVED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'
    ), 
    defaultValue: 'PLACED' 
  },
  qr_code: { type: DataTypes.STRING },
  pickup_address: { type: DataTypes.TEXT },
  delivery_address: { type: DataTypes.TEXT },
  estimated_distance: { type: DataTypes.DECIMAL(8, 2) },
  estimated_delivery_time: { type: DataTypes.DATE }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = Order;