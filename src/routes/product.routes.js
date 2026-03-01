const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Product description is required'),
  body('current_price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('category').optional().trim()
];

// Update validation — all fields optional so partial edits (price-only, qty-only) pass through
const productUpdateValidation = [
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('current_price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  body('category').optional().trim()
];

const productCreateValidation = [
  ...productValidation,
  body('harvest_date').optional().trim(),
  body('expiry_date').optional().trim()
];

const priceUpdateValidation = [
  body('current_price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
];

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);
// Get related products by product id
router.get('/:id/related', productController.getRelatedProducts);

// Protected routes (Farmer only)
router.post('/', 
  protect, 
  authorize('farmer'), 
  productCreateValidation, 
  productController.createProduct
);

router.put('/:id', 
  protect, 
  authorize('farmer'), 
  productUpdateValidation, 
  productController.updateProduct
);

router.delete('/:id', 
  protect, 
  authorize('farmer'), 
  productController.deleteProduct
);

// Get all products posted by the logged-in farmer
router.get('/farmer/me', 
  protect, 
  authorize('farmer'), 
  productController.getProductsByFarmer
);

// Price update route
router.put('/:id/price', 
  protect, 
  authorize('farmer'), 
  priceUpdateValidation, 
  productController.updatePrice
);

// Status update route
router.put('/:id/status', 
  protect, 
  authorize('farmer'), 
  productController.updateProductStatus
);

module.exports = router;