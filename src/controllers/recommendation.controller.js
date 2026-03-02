/**
 * recommendation.controller.js
 *
 * Priority:
 *   1. Try CatBoost ML server (farmercrate-ml.onrender.com)
 *   2. If ML server unreachable â†’ fall back to built-in static recommendations
 *      based on Tamil Nadu district â†’ soil type â†’ suitable products
 */

const axios = require('axios');

const _raw = process.env.ML_SERVER_URL || 'https://farmercrate-ml.onrender.com';
const ML_SERVER_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Static fallback data (Tamil Nadu district â†’ soil â†’ products)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DISTRICT_SOIL = {
  Thanjavur:'Alluvial', Thiruvarur:'Alluvial', Nagapattinam:'Alluvial',
  Mayiladuthurai:'Alluvial', Tiruvarur:'Alluvial',
  Cuddalore:'Red Soil', Villupuram:'Red Soil', Tiruvannamalai:'Red Soil',
  Dharmapuri:'Red Soil', Salem:'Red Soil', Krishnagiri:'Red Soil',
  Madurai:'Black Soil', Sivaganga:'Black Soil', Virudhunagar:'Black Soil',
  Coimbatore:'Red Loamy Soil', Erode:'Red Loamy Soil', Namakkal:'Red Loamy Soil',
  Kanniyakumari:'Sandy Loam', Thoothukudi:'Sandy Loam',
  Nilgiris:'Laterite Soil', Theni:'Laterite Soil', Dindigul:'Laterite Soil',
  Chennai:'Alluvial', Vellore:'Red Soil', Tiruppur:'Red Loamy Soil',
  Karur:'Red Loamy Soil', Ariyalur:'Alluvial', Perambalur:'Red Soil',
  Pudukkottai:'Black Soil', Ramanathapuram:'Sandy Loam',
  Tirunelveli:'Black Soil', Tenkasi:'Laterite Soil',
  Ranipet:'Red Soil', Tirupathur:'Red Soil', Kallakurichi:'Red Soil',
  Chengalpattu:'Red Soil',
};

const SOIL_PRODUCTS = {
  'Alluvial': [
    { product:'Rice',      category:'Crop',          grade:'Excellent', env_suitability:0.9,  temp_suitability:0.9,  weather_score:0.88, overall_score:0.89, market_status:'Balanced',    estimated_price_per_quintal:2500  },
    { product:'Banana',    category:'Horticulture',  grade:'Excellent', env_suitability:0.88, temp_suitability:0.87, weather_score:0.86, overall_score:0.87, market_status:'High Demand', estimated_price_per_quintal:1800  },
    { product:'Sugarcane', category:'Crop',          grade:'Good',      env_suitability:0.85, temp_suitability:0.83, weather_score:0.82, overall_score:0.83, market_status:'Balanced',    estimated_price_per_quintal:3200  },
    { product:'Coconut',   category:'Horticulture',  grade:'Good',      env_suitability:0.8,  temp_suitability:0.82, weather_score:0.8,  overall_score:0.81, market_status:'High Demand', estimated_price_per_quintal:2200  },
    { product:'Turmeric',  category:'Spice',         grade:'Good',      env_suitability:0.78, temp_suitability:0.8,  weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:7000  },
    { product:'Tomato',    category:'Vegetable',     grade:'Fair',      env_suitability:0.7,  temp_suitability:0.72, weather_score:0.71, overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:1200  },
  ],
  'Red Soil': [
    { product:'Groundnut', category:'Oilseed',       grade:'Excellent', env_suitability:0.9,  temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'Balanced',    estimated_price_per_quintal:5500  },
    { product:'Maize',     category:'Crop',          grade:'Excellent', env_suitability:0.88, temp_suitability:0.86, weather_score:0.85, overall_score:0.86, market_status:'High Demand', estimated_price_per_quintal:2000  },
    { product:'Tomato',    category:'Vegetable',     grade:'Good',      env_suitability:0.85, temp_suitability:0.84, weather_score:0.83, overall_score:0.84, market_status:'Balanced',    estimated_price_per_quintal:1200  },
    { product:'Sunflower', category:'Oilseed',       grade:'Good',      env_suitability:0.82, temp_suitability:0.82, weather_score:0.8,  overall_score:0.81, market_status:'Balanced',    estimated_price_per_quintal:4800  },
    { product:'Chilli',    category:'Spice',         grade:'Good',      env_suitability:0.8,  temp_suitability:0.8,  weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:9000  },
    { product:'Onion',     category:'Vegetable',     grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.7,  overall_score:0.71, market_status:'High Supply', estimated_price_per_quintal:1500  },
  ],
  'Black Soil': [
    { product:'Cotton',    category:'Crop',          grade:'Excellent', env_suitability:0.92, temp_suitability:0.9,  weather_score:0.88, overall_score:0.90, market_status:'High Demand', estimated_price_per_quintal:6500  },
    { product:'Jowar',     category:'Crop',          grade:'Excellent', env_suitability:0.9,  temp_suitability:0.88, weather_score:0.86, overall_score:0.88, market_status:'Balanced',    estimated_price_per_quintal:2800  },
    { product:'Bajra',     category:'Crop',          grade:'Good',      env_suitability:0.85, temp_suitability:0.84, weather_score:0.83, overall_score:0.84, market_status:'Balanced',    estimated_price_per_quintal:2200  },
    { product:'Wheat',     category:'Crop',          grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'Balanced',    estimated_price_per_quintal:2300  },
    { product:'Onion',     category:'Vegetable',     grade:'Good',      env_suitability:0.82, temp_suitability:0.8,  weather_score:0.79, overall_score:0.80, market_status:'Balanced',    estimated_price_per_quintal:1500  },
    { product:'Chilli',    category:'Spice',         grade:'Fair',      env_suitability:0.75, temp_suitability:0.73, weather_score:0.72, overall_score:0.73, market_status:'Balanced',    estimated_price_per_quintal:9000  },
  ],
  'Red Loamy Soil': [
    { product:'Coconut',   category:'Horticulture',  grade:'Excellent', env_suitability:0.9,  temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'High Demand', estimated_price_per_quintal:2200  },
    { product:'Banana',    category:'Horticulture',  grade:'Excellent', env_suitability:0.88, temp_suitability:0.86, weather_score:0.85, overall_score:0.86, market_status:'Balanced',    estimated_price_per_quintal:1800  },
    { product:'Maize',     category:'Crop',          grade:'Good',      env_suitability:0.85, temp_suitability:0.83, weather_score:0.82, overall_score:0.83, market_status:'Balanced',    estimated_price_per_quintal:2000  },
    { product:'Groundnut', category:'Oilseed',       grade:'Good',      env_suitability:0.82, temp_suitability:0.81, weather_score:0.8,  overall_score:0.81, market_status:'Balanced',    estimated_price_per_quintal:5500  },
    { product:'Tomato',    category:'Vegetable',     grade:'Good',      env_suitability:0.8,  temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:1200  },
    { product:'Turmeric',  category:'Spice',         grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.7,  overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:7000  },
  ],
  'Sandy Loam': [
    { product:'Coconut',   category:'Horticulture',  grade:'Excellent', env_suitability:0.92, temp_suitability:0.9,  weather_score:0.89, overall_score:0.90, market_status:'High Demand', estimated_price_per_quintal:2200  },
    { product:'Groundnut', category:'Oilseed',       grade:'Excellent', env_suitability:0.88, temp_suitability:0.87, weather_score:0.86, overall_score:0.87, market_status:'Balanced',    estimated_price_per_quintal:5500  },
    { product:'Prawn',     category:'Aquaculture',   grade:'Good',      env_suitability:0.85, temp_suitability:0.83, weather_score:0.82, overall_score:0.83, market_status:'High Demand', estimated_price_per_quintal:18000 },
    { product:'Shrimp',    category:'Aquaculture',   grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'High Demand', estimated_price_per_quintal:16000 },
    { product:'Banana',    category:'Horticulture',  grade:'Good',      env_suitability:0.8,  temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:1800  },
    { product:'Chilli',    category:'Spice',         grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.7,  overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:9000  },
  ],
  'Laterite Soil': [
    { product:'Coconut',   category:'Horticulture',  grade:'Excellent', env_suitability:0.9,  temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'High Demand', estimated_price_per_quintal:2200  },
    { product:'Rice',      category:'Crop',          grade:'Good',      env_suitability:0.82, temp_suitability:0.81, weather_score:0.8,  overall_score:0.81, market_status:'Balanced',    estimated_price_per_quintal:2500  },
    { product:'Mango',     category:'Horticulture',  grade:'Good',      env_suitability:0.8,  temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'High Demand', estimated_price_per_quintal:4500  },
    { product:'Banana',    category:'Horticulture',  grade:'Good',      env_suitability:0.78, temp_suitability:0.77, weather_score:0.76, overall_score:0.77, market_status:'Balanced',    estimated_price_per_quintal:1800  },
    { product:'Tilapia',   category:'Aquaculture',   grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.7,  overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:1800  },
    { product:'Turmeric',  category:'Spice',         grade:'Fair',      env_suitability:0.71, temp_suitability:0.70, weather_score:0.69, overall_score:0.70, market_status:'Balanced',    estimated_price_per_quintal:7000  },
  ],
};
const DEFAULT_SOIL = 'Red Soil';

function getStaticRecommendations(district, myProductNames) {
  const soilType = DISTRICT_SOIL[district] || DEFAULT_SOIL;
  const products = SOIL_PRODUCTS[soilType] || SOIL_PRODUCTS[DEFAULT_SOIL];
  return products.map((item) => ({
    ...item,
    already_posted: (myProductNames || []).includes(item.product.toLowerCase().trim()),
  }));
}

async function callMLServer(district) {
  const { data } = await axios.post(
    `${ML_SERVER_URL}/recommend`,
    { district },
    { timeout: 30000 }
  );
  return data;
}

// -------------------------------------------------------------------------- //
// Health Check
// -------------------------------------------------------------------------- //
const checkMLHealth = async (req, res) => {
  try {
    const { data, status } = await axios.get(`${ML_SERVER_URL}/health`, { timeout: 5000 });
    return res.status(status).json(data);
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'ML server is unavailable',
      ml_server_url: ML_SERVER_URL,
      detail: err.message,
    });
  }
};

// -------------------------------------------------------------------------- //
// Get all districts
// -------------------------------------------------------------------------- //
const getDistricts = async (req, res) => {
  const staticDistricts = Object.keys(DISTRICT_SOIL);
  try {
    const { data } = await axios.get(`${ML_SERVER_URL}/districts`, { timeout: 10000 });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({
      success: true,
      districts: staticDistricts.sort(),
      count: staticDistricts.length,
      source: 'static_fallback',
    });
  }
};

// -------------------------------------------------------------------------- //
// POST /api/recommendations
// -------------------------------------------------------------------------- //
const getRecommendations = async (req, res) => {
  const { district, category } = req.body;
  if (!district) return res.status(400).json({ success: false, message: 'district is required' });
  try {
    const data = await callMLServer(district);
    return res.status(200).json(data);
  } catch (err) {
    console.warn('[REC] ML unreachable, static fallback:', err.message);
    const recs = getStaticRecommendations(district, []);
    const filtered = category ? recs.filter((r) => r.category === category) : recs;
    return res.status(200).json({
      success: true, district,
      soil_type: DISTRICT_SOIL[district] || DEFAULT_SOIL,
      source: 'static_fallback',
      recommended_products: filtered,
      summary: { total_recommended: filtered.length },
    });
  }
};

// -------------------------------------------------------------------------- //
// GET /api/recommendations/all
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
    console.warn('[REC] ML unreachable for /all, static fallback:', err.message);
    const results = Object.keys(DISTRICT_SOIL).map((d) => ({
      district: d, soil_type: DISTRICT_SOIL[d],
      top_recommendation: getStaticRecommendations(d, [])[0] || null,
    }));
    return res.status(200).json({ success: true, count: results.length, data: results, source: 'static_fallback' });
  }
};

// -------------------------------------------------------------------------- //
// GET /api/recommendations/farmer  (JWT protected â€” farmer only)
// Tries ML server first, falls back to static if unavailable
// -------------------------------------------------------------------------- //
const getFarmerRecommendations = async (req, res) => {
  try {
    console.log('[REC/farmer] â–¶ START farmer_id:', req.user?.farmer_id);

    const FarmerUser = require('../models/farmer_user.model');
    const Product    = require('../models/product.model');

    // 1ï¸âƒ£ Get district from profile
    const farmer = await FarmerUser.findOne({
      where: { farmer_id: req.user.farmer_id },
      attributes: ['farmer_id', 'name', 'district'],
    });
    console.log('[REC/farmer] Farmer found:', !!farmer, 'â€” district:', farmer?.district);

    if (!farmer || !farmer.district) {
      return res.status(400).json({
        success: false,
        message: 'Farmer district not set. Please update your profile with your district.',
      });
    }
    const district = farmer.district.trim();

    // 2ï¸âƒ£ Farmer's existing products
    const myProducts = await Product.findAll({
      where: { farmer_id: req.user.farmer_id },
      attributes: ['name'],
    });
    const myProductNames = myProducts.map((p) => (p.name || '').toLowerCase().trim());
    console.log('[REC/farmer] Products owned:', myProductNames.length);

    // 3ï¸âƒ£ Try ML server â†’ fallback to static
    let weekly    = [];
    let source    = 'catboost_ml';
    let mlWeather  = null;
    let mlSoilType = null;

    try {
      console.log('[REC/farmer] Calling ML:', ML_SERVER_URL);
      const mlData = await callMLServer(district);
      console.log('[REC/farmer] ML success:', mlData?.success, 'â€” count:', mlData?.recommended_products?.length);

      if (mlData?.success && Array.isArray(mlData.recommended_products)) {
        weekly = mlData.recommended_products.slice(0, 10).map((item) => ({
          ...item,
          already_posted: myProductNames.includes(item.product.toLowerCase().trim()),
        }));
        mlWeather  = mlData.weather   || null;
        mlSoilType = mlData.soil_type || null;
      }
    } catch (mlErr) {
      source     = 'static_fallback';
      mlSoilType = DISTRICT_SOIL[district] || DEFAULT_SOIL;
      console.warn('[REC/farmer] âš ï¸ ML unreachable:', mlErr.message, 'â€” using static fallback for district:', district, 'soil:', mlSoilType);
      weekly = getStaticRecommendations(district, myProductNames);
    }

    console.log('[REC/farmer] âœ… Returning', weekly.length, 'recs â€” source:', source);

    return res.status(200).json({
      success: true,
      district,
      soil_type: mlSoilType,
      weather: mlWeather,
      source,
      weekly_recommendations: weekly,
      summary: {
        district,
        total_recommended: weekly.length,
        already_posted:    weekly.filter((i) => i.already_posted).length,
        new_opportunities: weekly.filter((i) => !i.already_posted).length,
      },
    });
  } catch (err) {
    console.error('[REC/farmer] âŒ Unexpected error:', err.message);
    console.error('[REC/farmer] Stack:', err.stack);
    return res.status(500).json({
      success: false,
      message: err.message,
      hint: 'Check Render logs for [REC/farmer] entries',
    });
  }
};

module.exports = {
  checkMLHealth,
  getDistricts,
  getRecommendations,
  getAllDistrictRecommendations,
  getFarmerRecommendations,
};
