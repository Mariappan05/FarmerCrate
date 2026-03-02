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

// ML Server is deployed on Render — always use the Render URL.
const _raw = process.env.ML_SERVER_URL || 'https://farmercrate-ml.onrender.com';
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

// -------------------------------------------------------------------------- //
// Farmer-specific weekly recommendations
// GET /api/recommendations/farmer  (requires JWT — farmer only)
// -------------------------------------------------------------------------- //
const getFarmerRecommendations = async (req, res) => {
  try {
    console.log('[REC/farmer] ▶ START — req.user:', JSON.stringify({
      farmer_id: req.user?.farmer_id,
      name: req.user?.name,
      district: req.user?.district,
    }));

    const FarmerUser = require('../models/farmer_user.model');
    const Product    = require('../models/product.model');

    // 1️⃣ Load farmer profile to get district
    console.log('[REC/farmer] 1️⃣  Querying FarmerUser for farmer_id:', req.user?.farmer_id);
    const farmer = await FarmerUser.findOne({
      where: { farmer_id: req.user.farmer_id },
      attributes: ['farmer_id', 'name', 'district'],
    });

    console.log('[REC/farmer] Farmer record:', farmer ? JSON.stringify({ farmer_id: farmer.farmer_id, district: farmer.district }) : 'NOT FOUND');

    if (!farmer || !farmer.district) {
      return res.status(400).json({
        success: false,
        message: 'Farmer district not found. Please update your profile.',
      });
    }

    const district = farmer.district.trim();
    console.log('[REC/farmer] District:', district);

    // 2️⃣ Get farmer's existing product names (to flag already_posted)
    console.log('[REC/farmer] 2️⃣  Loading farmer products...');
    const myProducts = await Product.findAll({
      where: { farmer_id: req.user.farmer_id },
      attributes: ['name'],
    });
    const myProductNames = myProducts.map((p) => (p.name || '').toLowerCase().trim());
    console.log('[REC/farmer] My products count:', myProducts.length, '— names:', myProductNames);

    // 3️⃣ Call ML server
    console.log('[REC/farmer] 3️⃣  Calling ML server:', ML_SERVER_URL, '— district:', district);
    const { data } = await axios.post(
      `${ML_SERVER_URL}/recommend`,
      { district },
      { timeout: 30000 }
    );
    console.log('[REC/farmer] ML response success:', data?.success, '— products count:', data?.recommended_products?.length);

    if (!data.success) {
      console.warn('[REC/farmer] ML returned success=false:', data?.message);
      return res.status(500).json(data);
    }

    // 4️⃣ Tag each recommendation with already_posted flag
    const weekly = (data.recommended_products || [])
      .slice(0, 10)
      .map((item) => ({
        ...item,
        already_posted: myProductNames.includes(item.product.toLowerCase().trim()),
      }));

    console.log('[REC/farmer] ✅ Returning', weekly.length, 'recommendations');

    return res.status(200).json({
      success: true,
      district: data.district,
      soil_type: data.soil_type,
      weather: data.weather,
      weekly_recommendations: weekly,
      summary: {
        district,
        total_recommended: weekly.length,
        already_posted: weekly.filter((i) => i.already_posted).length,
        new_opportunities: weekly.filter((i) => !i.already_posted).length,
      },
    });
  } catch (err) {
    // Log the REAL error on the server
    console.error('[REC/farmer] ❌ EXCEPTION:', err.message);
    console.error('[REC/farmer] Stack:', err.stack);
    if (err.response) {
      console.error('[REC/farmer] Axios HTTP status:', err.response.status);
      console.error('[REC/farmer] Axios HTTP data:', JSON.stringify(err.response.data));
      return res.status(err.response.status).json(err.response.data);
    }
    // Return the REAL error message instead of generic "Error"
    return res.status(500).json({ success: false, message: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
};

module.exports = {
  checkMLHealth,
  getDistricts,
  getRecommendations,
  getAllDistrictRecommendations,
  getFarmerRecommendations,
};
