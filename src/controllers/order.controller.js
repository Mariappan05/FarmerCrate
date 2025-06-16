const { validationResult } = require('express-validator');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const { sequelize } = require('../models/transaction.model');

// Create order
exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity, deliveryAddress } = req.body;

    // Get product
    const product = await Product.findOne({
      where: { 
        id: productId,
        status: 'available'
      },
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['id', 'walletBalance']
      }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or not available' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient product quantity' });
    }

    // Create order
    const order = await Order.create({
      productId,
      consumerId: req.user.id,
      farmerId: product.farmer.id,
      quantity,
      deliveryAddress,
      totalAmount: product.price * quantity,
      commission: (product.price * quantity) * 0.10,
      farmerAmount: (product.price * quantity) * 0.90
    }, { transaction });

    // Update product quantity
    await product.update({
      quantity: product.quantity - quantity
    }, { transaction });

    // Create transactions
    await Transaction.create({
      userId: product.farmer.id,
      orderId: order.id,
      amount: order.farmerAmount,
      type: 'sale',
      status: 'completed',
      description: `Payment for order #${order.id}`
    }, { transaction });

    await Transaction.create({
      userId: 1, // Admin user ID
      orderId: order.id,
      amount: order.commission,
      type: 'commission',
      status: 'completed',
      description: `Commission for order #${order.id}`
    }, { transaction });

    // Update farmer's wallet
    await User.update(
      { walletBalance: sequelize.literal(`walletBalance + ${order.farmerAmount}`) },
      { 
        where: { id: product.farmer.id },
        transaction
      }
    );

    // Update admin's wallet
    await User.update(
      { walletBalance: sequelize.literal(`walletBalance + ${order.commission}`) },
      { 
        where: { id: 1 }, // Admin user ID
        transaction
      }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
};

// Get orders
exports.getOrders = async (req, res) => {
  try {
    let orders;
    
    if (req.user.role === 'farmer') {
      orders = await Order.findAll({
        where: { farmerId: req.user.id },
        include: [
          {
            model: Product,
            attributes: ['name', 'price']
          },
          {
            model: User,
            as: 'consumer',
            attributes: ['username', 'email']
          }
        ]
      });
    } else if (req.user.role === 'consumer') {
      orders = await Order.findAll({
        where: { consumerId: req.user.id },
        include: [
          {
            model: Product,
            attributes: ['name', 'price']
          },
          {
            model: User,
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
            model: User,
            as: 'consumer',
            attributes: ['username', 'email']
          },
          {
            model: User,
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
          { consumerId: req.user.id },
          { farmerId: req.user.id }
        ]
      },
      include: [
        {
          model: Product,
          attributes: ['name', 'price']
        },
        {
          model: User,
          as: 'consumer',
          attributes: ['username', 'email']
        },
        {
          model: User,
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
        farmerId: req.user.id
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