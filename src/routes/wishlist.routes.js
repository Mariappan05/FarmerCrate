const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const wishlistController = require('../controllers/wishlist.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/', 
  protect, 
  authorize('customer'),
  [body('product_id').isInt().withMessage('Valid product ID is required')],
  wishlistController.addToWishlist
);

router.get('/', protect, authorize('customer'), wishlistController.getWishlist);

router.delete('/:id', protect, authorize('customer'), wishlistController.removeFromWishlist);

module.exports = router;