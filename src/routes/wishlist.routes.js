const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist.controller');

router.post('/', wishlistController.addToWishlist);
router.get('/:customerId', wishlistController.getWishlist);
router.delete('/:id', wishlistController.removeFromWishlist);

module.exports = router;