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
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive number')
];

const priceUpdateValidation = [
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
];

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);

// Protected routes (Farmer only)
router.post('/', 
  protect, 
  authorize('farmer'), 
  productValidation, 
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

// Price update route
router.patch('/:id/price', 
  protect, 
  authorize('farmer'), 
  priceUpdateValidation, 
  productController.updatePrice
);

module.exports = router; 