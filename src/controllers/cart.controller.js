const { validationResult } = require('express-validator');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const FarmerUser = require('../models/farmer_user.model');

exports.addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, quantity } = req.body;
    const customer_id = req.user.customer_id;

    const product = await Product.findOne({
      where: { 
        product_id,
        status: 'available'
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or not available' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ 
        message: 'Requested quantity not available',
        availableQuantity: product.quantity
      });
    }

    let cartItem = await Cart.findOne({
      where: { customer_id, product_id }
    });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        customer_id,
        product_id,
        quantity
      });
    }

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Error adding item to cart' });
  }
};

exports.getCart = async (req, res) => {
  try {
    const customer_id = req.user.customer_id;

    const cartItems = await Cart.findAll({
      where: { customer_id },
      include: [{
        model: Product,
        as: 'cart_product',
        attributes: ['name', 'description', 'current_price', 'images'],
        include: [{
          model: FarmerUser,
          as: 'farmer',
          attributes: ['name', 'mobile_number']
        }]
      }]
    });

    // Normalize response: expose a single image URL as `image_url` for frontend
    const normalized = cartItems.map(item => {
      const plain = item.toJSON();
      if (plain.cart_product) {
        const imgs = plain.cart_product.images;
        if (imgs && typeof imgs === 'string') {
          // If multiple images are stored comma-separated, take the first one
          plain.cart_product.image_url = imgs.split(',')[0].trim();
        } else {
          plain.cart_product.image_url = null;
        }
      }
      return plain;
    });

    res.json({
      success: true,
      data: normalized
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Error retrieving cart' });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantity } = req.body;
    const customer_id = req.user.customer_id;

    const cartItem = await Cart.findOne({
      where: { cart_id: id, customer_id }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Error updating cart item' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const customer_id = req.user.customer_id;

    const cartItem = await Cart.findOne({
      where: { cart_id: id, customer_id }
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

exports.clearCart = async (req, res) => {
  try {
    const customer_id = req.user.customer_id;

    await Cart.destroy({
      where: { customer_id }
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