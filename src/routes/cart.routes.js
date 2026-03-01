const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const cartController = require('../controllers/cart.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const addToCartValidation = [
  body('product_id').isInt().withMessage('Valid product ID is required'),
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

// Update cart item quantity (supports /item/:id and /:id)
router.put('/item/:id',
  protect,
  authorize('customer'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  cartController.updateCartItem
);

// Alias: PUT /cart/:id  (frontend fallback)
router.put('/:id',
  protect,
  authorize('customer'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  cartController.updateCartItem
);

// Remove item from cart  (supports /item/:id and /:id)
router.delete('/item/:id',
  protect,
  authorize('customer'),
  cartController.removeFromCart
);

// Clear cart endpoint
router.delete('/clear',
  protect,
  authorize('customer'),
  cartController.clearCart
);

// Alias: DELETE /cart/:id  (frontend fallback)
router.delete('/:id',
  protect,
  authorize('customer'),
  cartController.removeFromCart
);

// Checkout multiple items from cart
router.post('/checkout',
  protect,
  authorize('customer'),
  [
    body('cart_ids').isArray({ min: 1 }).withMessage('Cart IDs array is required'),
    body('delivery_address').notEmpty().withMessage('Delivery address is required'),
    body('customer_zone').notEmpty().withMessage('Customer zone is required'),
    body('customer_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit pincode is required')
  ],
  cartController.checkoutMultipleItems
);

module.exports = router; 