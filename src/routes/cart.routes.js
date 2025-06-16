const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Apply authentication middleware to all cart routes
router.use(authMiddleware.protect);

// Add item to cart
router.post('/add',
  [
    body('productId').isInt().withMessage('Product ID must be a number'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  cartController.addToCart
);

// Get user's cart
router.get('/', cartController.getCart);

// Update cart item quantity
router.put('/:cartItemId',
  [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  cartController.updateCartItem
);

// Remove item from cart
router.delete('/:cartItemId', cartController.removeFromCart);

// Clear cart
router.delete('/', cartController.clearCart);

module.exports = router; 