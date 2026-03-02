/**
 * recommendation.routes.js
 *
 * Routes for the CatBoost-based agriculture product recommendation system.
 *
 * Base path: /api/recommendations  (mounted in app.js)
 *
 * Endpoints:
 *   GET  /api/recommendations/health       - ML server health check
 *   GET  /api/recommendations/districts    - list all Tamil Nadu districts
 *   POST /api/recommendations              - get recommendations for a district
 *   GET  /api/recommendations/all          - overview for all districts
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

const {
  checkMLHealth,
  getDistricts,
  getRecommendations,
  getAllDistrictRecommendations,
  getFarmerRecommendations,
} = require('../controllers/recommendation.controller');

// ML server health
router.get('/health', checkMLHealth);

// List Tamil Nadu districts
router.get('/districts', getDistricts);

// Get top recommendation per every district (overview)
// Must be defined BEFORE /:district to avoid route conflict
router.get('/all', getAllDistrictRecommendations);

// Get product recommendations for a specific district
// POST body: { "district": "Thanjavur", "category": "Crop" }
router.post('/', getRecommendations);

// Weekly recommendations for logged-in farmer (auto-reads district from profile)
router.get('/farmer', protect, authorize('farmer'), getFarmerRecommendations);

module.exports = router;
