const { validationResult } = require('express-validator');
const Product = require('../models/product.model');
const FarmerUser = require('../models/farmer_user.model');
const { Op } = require('sequelize');

// Get all products (for customers, admins, and farmers)
exports.getAllProducts = async (req, res) => {
  try {
    let whereClause = {};
    
    // If FarmerUser is not admin or farmer, only show available products
    if (!req.FarmerUser || (req.FarmerUser.role !== 'admin' && req.FarmerUser.role !== 'farmer')) {
      whereClause.status = 'available';
    }
    
    // If FarmerUser is a farmer, show their own products regardless of status
    if (req.FarmerUser && req.FarmerUser.role === 'farmer') {
      whereClause = {
        [Op.or]: [
          { status: 'available' },
          { farmerId: req.FarmerUser.id }
        ]
      };
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [{
        model: FarmerUser,
        as: 'farmer',
        // No attributes limit: return all farmer details
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

// Get all products posted by a specific farmer (for farmer dashboard)
exports.getProductsByFarmer = async (req, res) => {
  try {
    if (!req.FarmerUser || req.FarmerUser.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can view their products' });
    }
    const products = await Product.findAll({
      where: { farmerId: req.FarmerUser.id },
      include: [{
        model: FarmerUser,
        as: 'farmer',
        // No attributes limit
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get farmer products error:', error);
    res.status(500).json({ message: 'Error fetching farmer products' });
  }
};

// Get related products (by name or category)
exports.getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // Find products with similar name or category, excluding the current product
    const relatedProducts = await Product.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: id } },
          {
            [Op.or]: [
              { name: { [Op.like]: `%${product.name}%` } },
              product.category ? { category: product.category } : {}
            ]
          },
          { status: 'available' }
        ]
      },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      count: relatedProducts.length,
      data: relatedProducts
    });
  } catch (error) {
    console.error('Get related products error:', error);
    res.status(500).json({ message: 'Error fetching related products' });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: FarmerUser,
        as: 'farmer',
        // No attributes limit
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

// Create product (only for farmers)
exports.createProduct = async (req, res) => {
  try {
    if (!req.FarmerUser || req.FarmerUser.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can post products' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, description, price, quantity, images, category } = req.body;
    const product = await Product.create({
      name,
      description,
      price,
      quantity,
      images,
      category,
      farmerId: req.FarmerUser.id,
      lastPriceUpdate: new Date(),
      status: 'available',
      views: 0
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

// Update product (only by the farmer who posted it)
exports.updateProduct = async (req, res) => {
  try {
    if (!req.FarmerUser || req.FarmerUser.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can update products' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        farmerId: req.FarmerUser.id
      }
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }
    const { name, description, price, quantity, images, category } = req.body;
    await product.update({
      name: name || product.name,
      description: description || product.description,
      price: price || product.price,
      quantity: quantity || product.quantity,
      images: images || product.images,
      category: category || product.category
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

// Delete product (only by the farmer who posted it)
exports.deleteProduct = async (req, res) => {
  try {
    if (!req.FarmerUser || req.FarmerUser.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can delete products' });
    }
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        farmerId: req.FarmerUser.id
      }
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
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
        farmerId: req.FarmerUser.id
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