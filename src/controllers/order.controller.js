const { validationResult } = require('express-validator');
const Order = require('../models/order.model');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const Product = require('../models/product.model');
const Transaction = require('../models/transaction.model');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Create order
exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, quantity, delivery_address, total_amount, commission, farmer_amount, transport_charge } = req.body;

    const product = await Product.findOne({
      where: { id, status: 'available' }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or not available' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient product quantity' });
    }

    const order = await Order.create({
      consumer_id: req.user.id,
      farmer_id: product.farmer_id,
      product_id: id,
      quantity,
      delivery_address,
      total_amount,
      commission,
      farmer_amount,
      transport_charge
    }, { transaction });

    await product.update({
      quantity: product.quantity - quantity
    }, { transaction });

    await Transaction.create({
      farmer_id: product.farmer_id,
      order_id: order.id,
      amount: farmer_amount,
      type: 'sale',
      status: 'completed',
      description: `Payment for order #${order.id}`
    }, { transaction });

    await Transaction.create({
      farmer_id: 1,
      order_id: order.id,
      amount: commission,
      type: 'commission',
      status: 'completed',
      description: `Commission for order #${order.id}`
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

// Get orders for customer and farmer
exports.getOrders = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let whereClause = {};
    let includeModels = [
      { model: Product, attributes: ['name', 'price', 'images'] }
    ];

    if (req.user.role === 'farmer') {
      whereClause.farmer_id = req.user.id;
      includeModels.push({
        model: CustomerUser,
        as: 'consumer',
        attributes: ['customer_name', 'email', 'mobile_number']
      });
    } else if (req.user.role === 'consumer') {
      whereClause.consumer_id = req.user.id;
      includeModels.push({
        model: FarmerUser,
        as: 'farmer',
        attributes: ['name', 'email', 'mobile_number']
      });
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: includeModels,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    let whereClause = { id: req.params.id };
    
    if (req.user && req.user.role !== 'admin') {
      whereClause[Op.or] = [
        { consumer_id: req.user.id },
        { farmer_id: req.user.id }
      ];
    }

    const order = await Order.findOne({
      where: whereClause,
      include: [
        { model: Product, attributes: ['name', 'price', 'images'] },
        { model: CustomerUser, as: 'consumer', attributes: ['customer_name', 'email', 'mobile_number'] },
        { model: FarmerUser, as: 'farmer', attributes: ['name', 'email', 'mobile_number'] },
        { model: DeliveryPerson, as: 'delivery_person', attributes: ['name', 'mobile_number', 'vehicle_number'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

// Get all orders for admin
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: Product, attributes: ['name', 'price', 'images'] },
        { model: FarmerUser, as: 'farmer', attributes: ['name', 'email', 'mobile_number'] },
        { model: CustomerUser, as: 'consumer', attributes: ['customer_name', 'email', 'mobile_number'] },
        { model: DeliveryPerson, as: 'delivery_person', attributes: ['name', 'mobile_number', 'vehicle_number'] }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Update order status (farmer only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findOne({
      where: { id: req.params.id, farmer_id: req.user.id }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.update({ status });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

// Assign transport to order
exports.assignTransport = async (req, res) => {
  try {
    const { delivery_person_id } = req.body;
    
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    await order.update({ 
      delivery_person_id,
      status: 'processing'
    });
    
    res.json({ success: true, message: 'Transport assigned successfully', data: order });
  } catch (error) {
    console.error('Assign transport error:', error);
    res.status(500).json({ message: 'Error assigning transport' });
  }
};

// Complete delivery
exports.completeDelivery = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, delivery_person_id: req.user.id }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }
    
    await order.update({ status: 'completed' });
    
    res.json({ success: true, message: 'Delivery completed successfully', data: order });
  } catch (error) {
    console.error('Complete delivery error:', error);
    res.status(500).json({ message: 'Error completing delivery' });
  }
}; 