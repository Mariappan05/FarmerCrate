const { validationResult } = require('express-validator');
const Cart = require('../models/cart.model');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const Product = require('../models/product.model');
const { Op } = require('sequelize');

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;
    const customerId = req.user.id;

    // Check if product exists and is available
    const product = await Product.findOne({
      where: { 
        id: productId,
        status: 'available'
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or not available' });
    }

    // Check if requested quantity is available
    if (product.quantity < quantity) {
      return res.status(400).json({ 
        message: 'Requested quantity not available',
        availableQuantity: product.quantity
      });
    }

    // Check if product is already in cart
    let cartItem = await Cart.findOne({
      where: { customerId, productId }
    });

    if (cartItem) {
      // Update quantity if product already in cart
      cartItem.quantity += quantity;
      cartItem.price = product.price * cartItem.quantity;
      await cartItem.save();
    } else {
      // Add new item to cart
      cartItem = await Cart.create({
        customerId,
        productId,
        quantity,
        price: product.price * quantity
      });
    }

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: {
        id: cartItem.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: cartItem.price,
        product: {
          id: product.id,
          name: product.name,
          price: product.price
        }
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Error adding item to cart' });
  }
};

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const customerId = req.user.id;

    const cartItems = await Cart.findAll({
      where: { customerId },
      include: [{
        model: Product,
        attributes: ['name', 'description', 'images', 'price']
      }]
    });

    // Debug logging
    console.log('customerId:', customerId);
    console.log('cartItems:', cartItems);

    // Only include items with a valid product
    const validItems = cartItems.filter(item => item.product);
    // Calculate total from valid items only
    const total = validItems.reduce((sum, item) => sum + parseFloat(item.price), 0);

    res.json({
      success: true,
      data: {
        items: validItems.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: {
            id: item.product.id,
            name: item.product.name,
            description: item.product.description,
            images: item.product.images,
            price: item.product.price
          }
        })),
        total
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Error retrieving cart' });
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cartItemId } = req.params;
    const { quantity } = req.body;
    const customerId = req.user.id;

    const cartItem = await Cart.findOne({
      where: { id: cartItemId, customerId },
      include: [{
        model: Product,
        attributes: ['name', 'description', 'images', 'price', 'quantity'],
        include: [{
          model: FarmerUser,
          as: 'farmer',
          attributes: ['name', 'mobile_number'] // changed 'mobileNumber' to 'mobile_number'
        }]
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Check if requested quantity is available
    if (cartItem.product.quantity < quantity) {
      return res.status(400).json({ 
        message: 'Requested quantity not available',
        availableQuantity: cartItem.product.quantity
      });
    }

    cartItem.quantity = quantity;
    cartItem.price = cartItem.product.price * quantity;
    await cartItem.save();

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: {
        id: cartItem.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: cartItem.price,
        product: {
          id: cartItem.product.id,
          name: cartItem.product.name,
          description: cartItem.product.description,
          images: cartItem.product.images,
          price: cartItem.product.price,
          farmer: cartItem.product.farmer ? {
            name: cartItem.product.farmer.name,
            mobileNumber: cartItem.product.farmer.mobile_number // changed to match DB column
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Error updating cart item' });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const customerId = req.user.id;

    const cartItem = await Cart.findOne({
      where: { id: cartItemId, customerId }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await cartItem.destroy();

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Error removing item from cart' });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const customerId = req.user.id;

    await Cart.destroy({
      where: { customerId }
    });

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Error clearing cart' });
  }
};

// Example: Get all cart items for a farmer
exports.getFarmerCart = async (req, res) => {
  try {
    const cartItems = await Cart.findAll({
      where: { userId: req.user.id },
      include: [
        { model: FarmerUser, attributes: ['name', 'email', 'mobile_number'] },
        { model: Product }
      ]
    });
    res.json({ success: true, count: cartItems.length, data: cartItems });
  } catch (error) {
    console.error('Get farmer cart error:', error);
    res.status(500).json({ message: 'Error fetching cart items' });
  }
}; 