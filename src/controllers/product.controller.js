const { validationResult } = require('express-validator');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');
const FarmerUser = require('../models/farmer_user.model');
const ProductPriceHistory = require('../models/productPriceHistory.model');
const { Op } = require('sequelize');

exports.getAllProducts = async (req, res) => {
  try {
    let whereClause = {};
    
    if (!req.user || (req.role !== 'admin' && req.role !== 'farmer')) {
      whereClause.status = 'available';
    }
    
    if (req.user && req.role === 'customer') {
      whereClause.status = 'available';
    }
    
    if (req.user && req.role === 'farmer') {
      whereClause = {
        [Op.or]: [
          { status: 'available' },
          { farmer_id: req.user.farmer_id }
        ]
      };
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: FarmerUser,
          as: 'farmer'
        },
        {
          model: ProductImage,
          as: 'images'
        }
      ],
      order: [['created_at', 'DESC']]
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

exports.getProductsByFarmer = async (req, res) => {
  try {
    if (!req.user || req.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can view their products' });
    }
    const products = await Product.findAll({
      where: { farmer_id: req.user.farmer_id },
      include: [
        {
          model: FarmerUser,
          as: 'farmer'
        },
        {
          model: ProductImage,
          as: 'images'
        }
      ],
      order: [['created_at', 'DESC']]
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

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: FarmerUser,
          as: 'farmer'
        },
        {
          model: ProductImage,
          as: 'images'
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    if (!req.user || req.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can post products' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, description, current_price, quantity, category, harvest_date, expiry_date, image_urls } = req.body;
    const product = await Product.create({
      name,
      description,
      current_price,
      quantity,
      category,
      harvest_date,
      expiry_date,
      farmer_id: req.user.farmer_id,
      status: 'available'
    });

    // Add images if provided
    if (image_urls && Array.isArray(image_urls)) {
      for (let i = 0; i < image_urls.length; i++) {
        await ProductImage.create({
          product_id: product.product_id,
          image_url: image_urls[i],
          is_primary: i === 0,
          display_order: i
        });
      }
    }
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

exports.updateProduct = async (req, res) => {
  try {
    if (!req.user || req.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can update products' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const product = await Product.findByPk(req.params.id);
    if (!product || product.farmer_id !== req.user.farmer_id) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }
    
    const { name, description, current_price, quantity, category } = req.body;
    await product.update({
      name: name || product.name,
      description: description || product.description,
      current_price: current_price || product.current_price,
      quantity: quantity || product.quantity,
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

exports.updateProductStatus = async (req, res) => {
  try {
    if (!req.user || req.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can update product status' });
    }

    const { status } = req.body;
    if (!['available', 'sold_out', 'hidden'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use: available, sold_out, or hidden' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product || product.farmer_id !== req.user.farmer_id) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }

    await product.update({ status });

    res.json({
      success: true,
      message: 'Product status updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ message: 'Error updating product status' });
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const relatedProducts = await Product.findAll({
      where: {
        product_id: { [Op.ne]: req.params.id },
        category: product.category,
        status: 'available'
      },
      include: [
        {
          model: FarmerUser,
          as: 'farmer'
        },
        {
          model: ProductImage,
          as: 'images'
        }
      ],
      limit: 5,
      order: [['created_at', 'DESC']]
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

exports.updatePrice = async (req, res) => {
  try {
    if (!req.user || req.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can update prices' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const product = await Product.findByPk(req.params.id);
    if (!product || product.farmer_id !== req.user.farmer_id) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }
    
    const { current_price, reason } = req.body;
    const oldPrice = product.current_price;
    
    // Update product price
    await product.update({ current_price });
    
    // Store price change in history
    await ProductPriceHistory.create({
      product_id: product.product_id,
      old_price: oldPrice,
      new_price: current_price,
      notes: reason || 'Price updated',
      updated_by: req.user.farmer_id,
      updated_by_role: 'farmer'
    });
    
    res.json({
      success: true,
      message: 'Price updated successfully and stored in history',
      data: {
        product,
        price_change: {
          old_price: oldPrice,
          new_price: current_price,
          reason: reason || 'Price updated'
        }
      }
    });
  } catch (error) {
    console.error('Update price error:', error);
    res.status(500).json({ message: 'Error updating price' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!req.user || req.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can delete products' });
    }
    
    const product = await Product.findByPk(req.params.id);
    if (!product || product.farmer_id !== req.user.farmer_id) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }
    
    await product.destroy();
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
};