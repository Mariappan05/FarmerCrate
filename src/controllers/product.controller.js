const { validationResult } = require('express-validator');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const { Op } = require('sequelize');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    let whereClause = {};
    
    // If user is not admin or farmer, only show available products
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'farmer')) {
      whereClause.status = 'available';
    }
    
    // If user is a farmer, show their own products regardless of status
    if (req.user && req.user.role === 'farmer') {
      whereClause = {
        [Op.or]: [
          { status: 'available' },
          { farmerId: req.user.id }
        ]
      };
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['username', 'email', 'mobileNumber']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'farmer',
        attributes: ['username', 'email']
      }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment views
    await product.increment('views');

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, quantity, images } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      quantity,
      images,
      farmerId: req.user.id,
      lastPriceUpdate: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findOne({
      where: {
        id: req.params.id,
        farmerId: req.user.id
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, description, price, quantity, images } = req.body;

    await product.update({
      name: name || product.name,
      description: description || product.description,
      price: price || product.price,
      quantity: quantity || product.quantity,
      images: images || product.images
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        farmerId: req.user.id
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.update({ status: 'hidden' });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
};

// Update product price
exports.updatePrice = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findOne({
      where: {
        id: req.params.id,
        farmerId: req.user.id
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product is unsold for more than a week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    if (product.lastPriceUpdate > oneWeekAgo) {
      return res.status(400).json({
        message: 'Product price can only be updated after one week of being unsold'
      });
    }

    const { price } = req.body;

    await product.update({
      price,
      lastPriceUpdate: new Date()
    });

    res.json({
      success: true,
      message: 'Product price updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update price error:', error);
    res.status(500).json({ message: 'Error updating product price' });
  }
}; 