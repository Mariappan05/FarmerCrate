const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('images').trim().notEmpty().withMessage('Images is required'),
  body('category').optional().trim()
];

const productCreateValidation = [
  ...productValidation,
  body('harvest_date').trim().notEmpty().withMessage('Harvest date is required'),
  body('expiry_date').trim().notEmpty().withMessage('Expiry date is required')
];

const priceUpdateValidation = [
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
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
  productValidation, 
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