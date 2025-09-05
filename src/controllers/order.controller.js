const { validationResult } = require('express-validator');
const Order = require('../models/order.model');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const Product = require('../models/product.model');
const Transaction = require('../models/transaction.model');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Create order
exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, quantity, delivery_address, total_amount, commission, farmer_amount, transport_charge } = req.body;
    const productId = id;

    console.log('Debug - productId:', productId);
    console.log('Debug - req.user.id:', req.user.id);
    console.log('Debug - req.user:', req.user);

    // Get product
    const product = await Product.findOne({
      where: { 
        id: productId,
        status: 'available'
      }
    });

    console.log('Debug - product:', product);

    if (!product) {
      return res.status(404).json({ message: 'Product not found or not available' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient product quantity' });
    }

    console.log('Debug - farmer_id:', product.farmer_id);
    console.log('Debug - consumer_id:', req.user.id);
    console.log('Debug - product_id:', productId);

    // Create order with values from frontend
    const order = await Order.create({
      consumer_id: req.user.id,
      farmer_id: product.farmer_id,
      product_id: productId,
      quantity,
      delivery_address,
      total_amount,
      commission,
      farmer_amount,
      transport_charge
    }, { transaction });

    // Update product quantity
    await product.update({
      quantity: product.quantity - quantity
    }, { transaction });

    // Create transactions
    await Transaction.create({
      farmer_id: product.farmer_id,
      order_id: order.id,
      amount: farmer_amount,
      type: 'sale',
      status: 'completed',
      description: `Payment for order #${order.id}`
    }, { transaction });

    await Transaction.create({
      farmer_id: 1, // Admin user ID
      order_id: order.id,
      amount: commission,
      type: 'commission',
      status: 'completed',
      description: `Commission for order #${order.id}`
    }, { transaction });

    // Note: Wallet balance updates removed as walletBalance field doesn't exist

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

// Get orders
exports.getOrders = async (req, res) => {
  try {
    let orders;
    
    if (req.user.role === 'farmer') {
      orders = await Order.findAll({
        where: { farmer_id: req.user.id },
        include: [
          {
            model: Product,
            attributes: ['name', 'price']
          },
          {
            model: CustomerUser,
            as: 'consumer',
            attributes: ['username', 'email']
          }
        ]
      });
    } else if (req.user.role === 'consumer') {
      orders = await Order.findAll({
        where: { consumer_id: req.user.id },
        include: [
          {
            model: Product,
            attributes: ['name', 'price']
          },
          {
            model: FarmerUser,
            as: 'farmer',
            attributes: ['username', 'email']
          }
        ]
      });
    } else {
      // Admin can see all orders
      orders = await Order.findAll({
        include: [
          {
            model: Product,
            attributes: ['name', 'price']
          },
          {
            model: CustomerUser,
            as: 'consumer',
            attributes: ['username', 'email']
          },
          {
            model: FarmerUser,
            as: 'farmer',
            attributes: ['username', 'email']
          }
        ]
      });
    }

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
    const order = await Order.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { consumer_id: req.user.id },
          { farmer_id: req.user.id }
        ]
      },
      include: [
        {
          model: Product,
          attributes: ['name', 'price']
        },
        {
          model: CustomerUser,
          as: 'consumer',
          attributes: ['username', 'email']
        },
        {
          model: FarmerUser,
          as: 'farmer',
          attributes: ['username', 'email']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findOne({
      where: {
        id: req.params.id,
        farmer_id: req.user.id
      }
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
      where: {
        id: req.params.id,
        delivery_person_id: req.user.id
      }
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

// Example: Get all orders (with farmer and customer info)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: FarmerUser, as: 'farmer', attributes: ['name', 'email', 'mobile_number'] },
        { model: CustomerUser, as: 'consumer', attributes: ['customer_name', 'email', 'mobile_number'] },
        { model: Product }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
}; 