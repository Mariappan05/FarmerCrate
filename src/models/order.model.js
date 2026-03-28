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
      'PENDING', 'PLACED', 'CONFIRMED', 'ASSIGNED', 
      'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP',
      'RECEIVED', 'SHIPPED', 'IN_TRANSIT', 
      'REACHED_DESTINATION', 'OUT_FOR_DELIVERY', 
      'DELIVERED', 'COMPLETED', 'CANCELLED'
    ), 
    defaultValue: 'PENDING' 
  },
  // Virtual alias so all controller responses include "status" alongside "current_status"
  status: {
    type: DataTypes.VIRTUAL,
    get() { return this.current_status; }
  },
  payment_method: { type: DataTypes.STRING(20), defaultValue: 'COD' },
  items_json: { type: DataTypes.TEXT, allowNull: true },
  razorpay_order_id: { type: DataTypes.STRING, allowNull: true },
  razorpay_payment_id: { type: DataTypes.STRING, allowNull: true },
  qr_code: { type: DataTypes.STRING },
  qr_image_url: { type: DataTypes.STRING, allowNull: true },
  bill_url: { type: DataTypes.STRING },
  pickup_address: { type: DataTypes.TEXT },
  delivery_address: { type: DataTypes.TEXT },
  estimated_distance: { type: DataTypes.DECIMAL(8, 2) },
  estimated_delivery_time: { type: DataTypes.DATE },
  // Packing proof images
  packing_image_url: { type: DataTypes.TEXT, allowNull: true },
  bill_paste_image_url: { type: DataTypes.TEXT, allowNull: true },
  // Delivery updates proof
  delivery_proof_image_url: { type: DataTypes.TEXT, allowNull: true },
  delivery_signature_url: { type: DataTypes.TEXT, allowNull: true },
  delivery_remarks: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = Order;