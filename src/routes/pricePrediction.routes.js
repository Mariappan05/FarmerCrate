/**
 * pricePrediction.routes.js
 *
 * Base path: /api/price-prediction  (mounted in app.js)
 *
 * Routes:
 *   GET  /health           – service health check
 *   GET  /farmer/all       – predictions for every product owned by logged-in farmer
 *   GET  /:product_id      – single-product prediction (public)
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  health,
  getSinglePrediction,
  getFarmerPredictions,
} = require('../controllers/pricePrediction.controller');

// Health check
router.get('/health', health);

// All predictions for the authenticated farmer (MUST be before /:product_id)
router.get('/farmer/all', protect, authorize('farmer'), getFarmerPredictions);

// Single-product prediction
router.get('/:product_id', getSinglePrediction);

module.exports = router;
