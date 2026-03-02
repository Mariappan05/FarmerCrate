/**
 * recommendation.controller.js
 * Proxies requests to the CatBoost ML Flask server running on ML_SERVER_URL.
 *
 * ML Server endpoints:
 *   GET  /health               - health check
 *   GET  /districts            - list all Tamil Nadu districts
 *   POST /recommend            - get product recommendations for a district
 *   GET  /all-recommendations  - top recommendation per district (overview)
 */

const axios = require('axios');

// Render injects fromService.host as a bare hostname (no protocol).
// Locally ML_SERVER_URL includes the protocol already.
const _raw = process.env.ML_SERVER_URL || 'http://localhost:5001';
const ML_SERVER_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;

// -------------------------------------------------------------------------- //
// Health Check
// -------------------------------------------------------------------------- //
const checkMLHealth = async (req, res) => {
  try {
    const { data, status } = await axios.get(`${ML_SERVER_URL}/health`, {
      timeout: 5000,
    });
    return res.status(status).json(data);
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'ML server is unavailable',
      detail: err.message,
    });
  }
};

// -------------------------------------------------------------------------- //
// Get all districts
// -------------------------------------------------------------------------- //
const getDistricts = async (req, res) => {
  try {
    const { data } = await axios.get(`${ML_SERVER_URL}/districts`, {
      timeout: 10000,
    });
    return res.status(200).json(data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------------------------------------------------------------- //
// Get recommendations for a district
// POST /api/recommendations
// Body: { "district": "Thanjavur", "category": "Crop" }  (category optional)
// -------------------------------------------------------------------------- //
const getRecommendations = async (req, res) => {
  const { district, category } = req.body;

  if (!district) {
    return res.status(400).json({
      success: false,
      message: 'district is required in request body',
    });
  }

  try {
    const { data } = await axios.post(
      `${ML_SERVER_URL}/recommend`,
      { district, category },
      { timeout: 30000 }
    );
    return res.status(200).json(data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------------------------------------------------------------- //
// Get overview – top recommendation per all districts
// GET /api/recommendations/all?category=Crop
// -------------------------------------------------------------------------- //
const getAllDistrictRecommendations = async (req, res) => {
  const { category } = req.query;

  try {
    const url = category
      ? `${ML_SERVER_URL}/all-recommendations?category=${encodeURIComponent(category)}`
      : `${ML_SERVER_URL}/all-recommendations`;

    const { data } = await axios.get(url, { timeout: 60000 });
    return res.status(200).json(data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  checkMLHealth,
  getDistricts,
  getRecommendations,
  getAllDistrictRecommendations,
};
