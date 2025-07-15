const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const cartController = require('../controllers/cart.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const addToCartValidation = [
  body('productId').isInt().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// Protected routes (Consumer only)
router.post('/', 
  protect, 
  authorize('customer'), 
  addToCartValidation, 
  cartController.addToCart
);

router.get('/', 
  protect, 
  authorize('customer'), 
  cartController.getCart
);

// Update cart item quantity
router.put('/item/:cartItemId',
  protect,
  authorize('customer'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  cartController.updateCartItem
);

// Remove item from cart
router.delete('/item/:cartItemId',
  protect,
  authorize('customer'),
  cartController.removeFromCart
);

module.exports = router; 