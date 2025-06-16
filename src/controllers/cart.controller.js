const { validationResult } = require('express-validator');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;
    const userId = req.user.id;

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product is already in cart
    let cartItem = await Cart.findOne({
      where: { userId, productId }
    });

    if (cartItem) {
      // Update quantity if product already in cart
      cartItem.quantity += quantity;
      cartItem.price = product.price * cartItem.quantity;
      await cartItem.save();
    } else {
      // Add new item to cart
      cartItem = await Cart.create({
        userId,
        productId,
        quantity,
        price: product.price * quantity
      });
    }

    res.status(201).json({
      message: 'Item added to cart successfully',
      cartItem
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Error adding item to cart' });
  }
};

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await Cart.findAll({
      where: { userId },
      include: [{
        model: Product,
        attributes: ['name', 'description', 'imageUrl']
      }]
    });

    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);

    res.json({
      items: cartItems,
      total
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
    const userId = req.user.id;

    const cartItem = await Cart.findOne({
      where: { id: cartItemId, userId },
      include: [Product]
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    cartItem.quantity = quantity;
    cartItem.price = cartItem.Product.price * quantity;
    await cartItem.save();

    res.json({
      message: 'Cart item updated successfully',
      cartItem
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
    const userId = req.user.id;

    const cartItem = await Cart.findOne({
      where: { id: cartItemId, userId }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await cartItem.destroy();

    res.json({
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
    const userId = req.user.id;

    await Cart.destroy({
      where: { userId }
    });

    res.json({
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Error clearing cart' });
  }
}; 