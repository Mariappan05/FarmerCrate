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

// ── WEEKLY: Quick-turn vegetable & short-cycle crops (15–60 days) ────────────
const SOIL_PRODUCTS_WEEKLY = {
  'Alluvial':      [
    { product:'Tomato',     category:'Vegetable',    grade:'Excellent', env_suitability:0.91, temp_suitability:0.90, weather_score:0.89, overall_score:0.90, market_status:'High Demand', estimated_price_per_quintal:1200 },
    { product:'Spinach',    category:'Vegetable',    grade:'Excellent', env_suitability:0.88, temp_suitability:0.87, weather_score:0.86, overall_score:0.87, market_status:'High Demand', estimated_price_per_quintal:900  },
    { product:'Beans',      category:'Vegetable',    grade:'Good',      env_suitability:0.85, temp_suitability:0.84, weather_score:0.83, overall_score:0.84, market_status:'Balanced',    estimated_price_per_quintal:2200 },
    { product:'Brinjal',    category:'Vegetable',    grade:'Good',      env_suitability:0.82, temp_suitability:0.81, weather_score:0.80, overall_score:0.81, market_status:'Balanced',    estimated_price_per_quintal:1100 },
    { product:'Coriander',  category:'Herb',         grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:3500 },
    { product:'Radish',     category:'Vegetable',    grade:'Fair',      env_suitability:0.73, temp_suitability:0.72, weather_score:0.71, overall_score:0.72, market_status:'Balanced',    estimated_price_per_quintal:800  },
  ],
  'Red Soil':      [
    { product:'Tomato',     category:'Vegetable',    grade:'Excellent', env_suitability:0.90, temp_suitability:0.89, weather_score:0.88, overall_score:0.89, market_status:'High Demand', estimated_price_per_quintal:1200 },
    { product:'Beans',      category:'Vegetable',    grade:'Excellent', env_suitability:0.87, temp_suitability:0.86, weather_score:0.85, overall_score:0.86, market_status:'Balanced',    estimated_price_per_quintal:2200 },
    { product:'Radish',     category:'Vegetable',    grade:'Good',      env_suitability:0.84, temp_suitability:0.83, weather_score:0.82, overall_score:0.83, market_status:'Balanced',    estimated_price_per_quintal:800  },
    { product:'Spinach',    category:'Vegetable',    grade:'Good',      env_suitability:0.81, temp_suitability:0.80, weather_score:0.79, overall_score:0.80, market_status:'High Demand', estimated_price_per_quintal:900  },
    { product:'Coriander',  category:'Herb',         grade:'Good',      env_suitability:0.78, temp_suitability:0.77, weather_score:0.76, overall_score:0.77, market_status:'Balanced',    estimated_price_per_quintal:3500 },
    { product:'Brinjal',    category:'Vegetable',    grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.70, overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:1100 },
  ],
  'Black Soil':    [
    { product:'Brinjal',    category:'Vegetable',    grade:'Excellent', env_suitability:0.90, temp_suitability:0.89, weather_score:0.88, overall_score:0.89, market_status:'High Demand', estimated_price_per_quintal:1100 },
    { product:'Tomato',     category:'Vegetable',    grade:'Excellent', env_suitability:0.88, temp_suitability:0.87, weather_score:0.86, overall_score:0.87, market_status:'High Demand', estimated_price_per_quintal:1200 },
    { product:'Beans',      category:'Vegetable',    grade:'Good',      env_suitability:0.85, temp_suitability:0.84, weather_score:0.83, overall_score:0.84, market_status:'Balanced',    estimated_price_per_quintal:2200 },
    { product:'Coriander',  category:'Herb',         grade:'Good',      env_suitability:0.82, temp_suitability:0.81, weather_score:0.80, overall_score:0.81, market_status:'Balanced',    estimated_price_per_quintal:3500 },
    { product:'Spinach',    category:'Vegetable',    grade:'Good',      env_suitability:0.79, temp_suitability:0.78, weather_score:0.77, overall_score:0.78, market_status:'Balanced',    estimated_price_per_quintal:900  },
    { product:'Radish',     category:'Vegetable',    grade:'Fair',      env_suitability:0.71, temp_suitability:0.70, weather_score:0.69, overall_score:0.70, market_status:'Balanced',    estimated_price_per_quintal:800  },
  ],
  'Red Loamy Soil':[
    { product:'Tomato',     category:'Vegetable',    grade:'Excellent', env_suitability:0.89, temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'High Demand', estimated_price_per_quintal:1200 },
    { product:'Beans',      category:'Vegetable',    grade:'Excellent', env_suitability:0.87, temp_suitability:0.86, weather_score:0.85, overall_score:0.86, market_status:'Balanced',    estimated_price_per_quintal:2200 },
    { product:'Brinjal',    category:'Vegetable',    grade:'Good',      env_suitability:0.84, temp_suitability:0.83, weather_score:0.82, overall_score:0.83, market_status:'Balanced',    estimated_price_per_quintal:1100 },
    { product:'Coriander',  category:'Herb',         grade:'Good',      env_suitability:0.81, temp_suitability:0.80, weather_score:0.79, overall_score:0.80, market_status:'Balanced',    estimated_price_per_quintal:3500 },
    { product:'Radish',     category:'Vegetable',    grade:'Good',      env_suitability:0.78, temp_suitability:0.77, weather_score:0.76, overall_score:0.77, market_status:'Balanced',    estimated_price_per_quintal:800  },
    { product:'Spinach',    category:'Vegetable',    grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.70, overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:900  },
  ],
  'Sandy Loam':    [
    { product:'Radish',     category:'Vegetable',    grade:'Excellent', env_suitability:0.91, temp_suitability:0.90, weather_score:0.89, overall_score:0.90, market_status:'Balanced',    estimated_price_per_quintal:800  },
    { product:'Beans',      category:'Vegetable',    grade:'Excellent', env_suitability:0.88, temp_suitability:0.87, weather_score:0.86, overall_score:0.87, market_status:'Balanced',    estimated_price_per_quintal:2200 },
    { product:'Tomato',     category:'Vegetable',    grade:'Good',      env_suitability:0.85, temp_suitability:0.84, weather_score:0.83, overall_score:0.84, market_status:'High Demand', estimated_price_per_quintal:1200 },
    { product:'Coriander',  category:'Herb',         grade:'Good',      env_suitability:0.82, temp_suitability:0.81, weather_score:0.80, overall_score:0.81, market_status:'Balanced',    estimated_price_per_quintal:3500 },
    { product:'Spinach',    category:'Vegetable',    grade:'Good',      env_suitability:0.79, temp_suitability:0.78, weather_score:0.77, overall_score:0.78, market_status:'Balanced',    estimated_price_per_quintal:900  },
    { product:'Brinjal',    category:'Vegetable',    grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.70, overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:1100 },
  ],
  'Laterite Soil': [
    { product:'Beans',      category:'Vegetable',    grade:'Excellent', env_suitability:0.89, temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'Balanced',    estimated_price_per_quintal:2200 },
    { product:'Tomato',     category:'Vegetable',    grade:'Excellent', env_suitability:0.87, temp_suitability:0.86, weather_score:0.85, overall_score:0.86, market_status:'High Demand', estimated_price_per_quintal:1200 },
    { product:'Brinjal',    category:'Vegetable',    grade:'Good',      env_suitability:0.84, temp_suitability:0.83, weather_score:0.82, overall_score:0.83, market_status:'Balanced',    estimated_price_per_quintal:1100 },
    { product:'Spinach',    category:'Vegetable',    grade:'Good',      env_suitability:0.81, temp_suitability:0.80, weather_score:0.79, overall_score:0.80, market_status:'Balanced',    estimated_price_per_quintal:900  },
    { product:'Coriander',  category:'Herb',         grade:'Good',      env_suitability:0.78, temp_suitability:0.77, weather_score:0.76, overall_score:0.77, market_status:'Balanced',    estimated_price_per_quintal:3500 },
    { product:'Radish',     category:'Vegetable',    grade:'Fair',      env_suitability:0.71, temp_suitability:0.70, weather_score:0.69, overall_score:0.70, market_status:'Balanced',    estimated_price_per_quintal:800  },
  ],
};

// ── MONTHLY: Medium-cycle crops (60–120 days) ─────────────────────────────────
const SOIL_PRODUCTS_MONTHLY = {
  'Alluvial':      [
    { product:'Maize',      category:'Crop',         grade:'Excellent', env_suitability:0.92, temp_suitability:0.91, weather_score:0.90, overall_score:0.91, market_status:'High Demand', estimated_price_per_quintal:2000 },
    { product:'Onion',      category:'Vegetable',    grade:'Excellent', env_suitability:0.89, temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'Balanced',    estimated_price_per_quintal:1500 },
    { product:'Cauliflower',category:'Vegetable',    grade:'Good',      env_suitability:0.86, temp_suitability:0.85, weather_score:0.84, overall_score:0.85, market_status:'High Demand', estimated_price_per_quintal:1600 },
    { product:'Chilli',     category:'Spice',        grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'Balanced',    estimated_price_per_quintal:9000 },
    { product:'Cabbage',    category:'Vegetable',    grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:1200 },
    { product:'Groundnut',  category:'Oilseed',      grade:'Fair',      env_suitability:0.73, temp_suitability:0.72, weather_score:0.71, overall_score:0.72, market_status:'Balanced',    estimated_price_per_quintal:5500 },
  ],
  'Red Soil':      [
    { product:'Groundnut',  category:'Oilseed',      grade:'Excellent', env_suitability:0.92, temp_suitability:0.91, weather_score:0.90, overall_score:0.91, market_status:'High Demand', estimated_price_per_quintal:5500 },
    { product:'Sunflower',  category:'Oilseed',      grade:'Excellent', env_suitability:0.89, temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'Balanced',    estimated_price_per_quintal:4800 },
    { product:'Maize',      category:'Crop',         grade:'Good',      env_suitability:0.86, temp_suitability:0.85, weather_score:0.84, overall_score:0.85, market_status:'High Demand', estimated_price_per_quintal:2000 },
    { product:'Onion',      category:'Vegetable',    grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'Balanced',    estimated_price_per_quintal:1500 },
    { product:'Chilli',     category:'Spice',        grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:9000 },
    { product:'Soybean',    category:'Oilseed',      grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.70, overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:3700 },
  ],
  'Black Soil':    [
    { product:'Jowar',      category:'Crop',         grade:'Excellent', env_suitability:0.92, temp_suitability:0.91, weather_score:0.90, overall_score:0.91, market_status:'Balanced',    estimated_price_per_quintal:2800 },
    { product:'Bajra',      category:'Crop',         grade:'Excellent', env_suitability:0.90, temp_suitability:0.89, weather_score:0.88, overall_score:0.89, market_status:'Balanced',    estimated_price_per_quintal:2200 },
    { product:'Maize',      category:'Crop',         grade:'Good',      env_suitability:0.86, temp_suitability:0.85, weather_score:0.84, overall_score:0.85, market_status:'High Demand', estimated_price_per_quintal:2000 },
    { product:'Onion',      category:'Vegetable',    grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'Balanced',    estimated_price_per_quintal:1500 },
    { product:'Chilli',     category:'Spice',        grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:9000 },
    { product:'Soybean',    category:'Oilseed',      grade:'Fair',      env_suitability:0.73, temp_suitability:0.72, weather_score:0.71, overall_score:0.72, market_status:'Balanced',    estimated_price_per_quintal:3700 },
  ],
  'Red Loamy Soil':[
    { product:'Groundnut',  category:'Oilseed',      grade:'Excellent', env_suitability:0.91, temp_suitability:0.90, weather_score:0.89, overall_score:0.90, market_status:'Balanced',    estimated_price_per_quintal:5500 },
    { product:'Maize',      category:'Crop',         grade:'Excellent', env_suitability:0.88, temp_suitability:0.87, weather_score:0.86, overall_score:0.87, market_status:'High Demand', estimated_price_per_quintal:2000 },
    { product:'Onion',      category:'Vegetable',    grade:'Good',      env_suitability:0.85, temp_suitability:0.84, weather_score:0.83, overall_score:0.84, market_status:'Balanced',    estimated_price_per_quintal:1500 },
    { product:'Chilli',     category:'Spice',        grade:'Good',      env_suitability:0.82, temp_suitability:0.81, weather_score:0.80, overall_score:0.81, market_status:'Balanced',    estimated_price_per_quintal:9000 },
    { product:'Watermelon', category:'Fruit',        grade:'Good',      env_suitability:0.79, temp_suitability:0.78, weather_score:0.77, overall_score:0.78, market_status:'High Demand', estimated_price_per_quintal:1800 },
    { product:'Cabbage',    category:'Vegetable',    grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.70, overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:1200 },
  ],
  'Sandy Loam':    [
    { product:'Groundnut',  category:'Oilseed',      grade:'Excellent', env_suitability:0.91, temp_suitability:0.90, weather_score:0.89, overall_score:0.90, market_status:'Balanced',    estimated_price_per_quintal:5500 },
    { product:'Watermelon', category:'Fruit',        grade:'Excellent', env_suitability:0.89, temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'High Demand', estimated_price_per_quintal:1800 },
    { product:'Onion',      category:'Vegetable',    grade:'Good',      env_suitability:0.85, temp_suitability:0.84, weather_score:0.83, overall_score:0.84, market_status:'Balanced',    estimated_price_per_quintal:1500 },
    { product:'Prawn',      category:'Aquaculture',  grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'High Demand', estimated_price_per_quintal:18000},
    { product:'Shrimp',     category:'Aquaculture',  grade:'Good',      env_suitability:0.81, temp_suitability:0.80, weather_score:0.79, overall_score:0.80, market_status:'High Demand', estimated_price_per_quintal:16000},
    { product:'Chilli',     category:'Spice',        grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.70, overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:9000 },
  ],
  'Laterite Soil': [
    { product:'Ginger',     category:'Spice',        grade:'Excellent', env_suitability:0.91, temp_suitability:0.90, weather_score:0.89, overall_score:0.90, market_status:'High Demand', estimated_price_per_quintal:12000},
    { product:'Onion',      category:'Vegetable',    grade:'Good',      env_suitability:0.86, temp_suitability:0.85, weather_score:0.84, overall_score:0.85, market_status:'Balanced',    estimated_price_per_quintal:1500 },
    { product:'Maize',      category:'Crop',         grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'High Demand', estimated_price_per_quintal:2000 },
    { product:'Chilli',     category:'Spice',        grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:9000 },
    { product:'Watermelon', category:'Fruit',        grade:'Fair',      env_suitability:0.74, temp_suitability:0.73, weather_score:0.72, overall_score:0.73, market_status:'High Demand', estimated_price_per_quintal:1800 },
    { product:'Cabbage',    category:'Vegetable',    grade:'Fair',      env_suitability:0.71, temp_suitability:0.70, weather_score:0.69, overall_score:0.70, market_status:'Balanced',    estimated_price_per_quintal:1200 },
  ],
};

// ── YEARLY: Long-cycle perennial & annual crops (6–18 months) ────────────────
const SOIL_PRODUCTS_YEARLY = {
  'Alluvial':      [
    { product:'Rice',       category:'Crop',         grade:'Excellent', env_suitability:0.93, temp_suitability:0.92, weather_score:0.91, overall_score:0.92, market_status:'Balanced',    estimated_price_per_quintal:2500 },
    { product:'Sugarcane',  category:'Crop',         grade:'Excellent', env_suitability:0.91, temp_suitability:0.90, weather_score:0.89, overall_score:0.90, market_status:'High Demand', estimated_price_per_quintal:3200 },
    { product:'Banana',     category:'Horticulture', grade:'Good',      env_suitability:0.87, temp_suitability:0.86, weather_score:0.85, overall_score:0.86, market_status:'Balanced',    estimated_price_per_quintal:1800 },
    { product:'Coconut',    category:'Horticulture', grade:'Good',      env_suitability:0.84, temp_suitability:0.83, weather_score:0.82, overall_score:0.83, market_status:'High Demand', estimated_price_per_quintal:2200 },
    { product:'Turmeric',   category:'Spice',        grade:'Good',      env_suitability:0.81, temp_suitability:0.80, weather_score:0.79, overall_score:0.80, market_status:'Balanced',    estimated_price_per_quintal:7000 },
    { product:'Ginger',     category:'Spice',        grade:'Fair',      env_suitability:0.74, temp_suitability:0.73, weather_score:0.72, overall_score:0.73, market_status:'High Demand', estimated_price_per_quintal:12000},
  ],
  'Red Soil':      [
    { product:'Cotton',     category:'Crop',         grade:'Excellent', env_suitability:0.91, temp_suitability:0.90, weather_score:0.89, overall_score:0.90, market_status:'High Demand', estimated_price_per_quintal:6500 },
    { product:'Turmeric',   category:'Spice',        grade:'Excellent', env_suitability:0.89, temp_suitability:0.88, weather_score:0.87, overall_score:0.88, market_status:'Balanced',    estimated_price_per_quintal:7000 },
    { product:'Coconut',    category:'Horticulture', grade:'Good',      env_suitability:0.85, temp_suitability:0.84, weather_score:0.83, overall_score:0.84, market_status:'High Demand', estimated_price_per_quintal:2200 },
    { product:'Mango',      category:'Horticulture', grade:'Good',      env_suitability:0.82, temp_suitability:0.81, weather_score:0.80, overall_score:0.81, market_status:'High Demand', estimated_price_per_quintal:4500 },
    { product:'Ginger',     category:'Spice',        grade:'Good',      env_suitability:0.79, temp_suitability:0.78, weather_score:0.77, overall_score:0.78, market_status:'High Demand', estimated_price_per_quintal:12000},
    { product:'Soybean',    category:'Oilseed',      grade:'Fair',      env_suitability:0.72, temp_suitability:0.71, weather_score:0.70, overall_score:0.71, market_status:'Balanced',    estimated_price_per_quintal:3700 },
  ],
  'Black Soil':    [
    { product:'Cotton',     category:'Crop',         grade:'Excellent', env_suitability:0.94, temp_suitability:0.93, weather_score:0.92, overall_score:0.93, market_status:'High Demand', estimated_price_per_quintal:6500 },
    { product:'Sugarcane',  category:'Crop',         grade:'Excellent', env_suitability:0.91, temp_suitability:0.90, weather_score:0.89, overall_score:0.90, market_status:'Balanced',    estimated_price_per_quintal:3200 },
    { product:'Wheat',      category:'Crop',         grade:'Good',      env_suitability:0.86, temp_suitability:0.85, weather_score:0.84, overall_score:0.85, market_status:'Balanced',    estimated_price_per_quintal:2300 },
    { product:'Pigeon Pea', category:'Pulse',        grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'High Demand', estimated_price_per_quintal:6200 },
    { product:'Mango',      category:'Horticulture', grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'High Demand', estimated_price_per_quintal:4500 },
    { product:'Soybean',    category:'Oilseed',      grade:'Fair',      env_suitability:0.73, temp_suitability:0.72, weather_score:0.71, overall_score:0.72, market_status:'Balanced',    estimated_price_per_quintal:3700 },
  ],
  'Red Loamy Soil':[
    { product:'Coconut',    category:'Horticulture', grade:'Excellent', env_suitability:0.92, temp_suitability:0.91, weather_score:0.90, overall_score:0.91, market_status:'High Demand', estimated_price_per_quintal:2200 },
    { product:'Banana',     category:'Horticulture', grade:'Excellent', env_suitability:0.90, temp_suitability:0.89, weather_score:0.88, overall_score:0.89, market_status:'Balanced',    estimated_price_per_quintal:1800 },
    { product:'Sugarcane',  category:'Crop',         grade:'Good',      env_suitability:0.86, temp_suitability:0.85, weather_score:0.84, overall_score:0.85, market_status:'Balanced',    estimated_price_per_quintal:3200 },
    { product:'Turmeric',   category:'Spice',        grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'Balanced',    estimated_price_per_quintal:7000 },
    { product:'Ginger',     category:'Spice',        grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'High Demand', estimated_price_per_quintal:12000},
    { product:'Cashew',     category:'Horticulture', grade:'Fair',      env_suitability:0.73, temp_suitability:0.72, weather_score:0.71, overall_score:0.72, market_status:'Balanced',    estimated_price_per_quintal:9500 },
  ],
  'Sandy Loam':    [
    { product:'Coconut',    category:'Horticulture', grade:'Excellent', env_suitability:0.93, temp_suitability:0.92, weather_score:0.91, overall_score:0.92, market_status:'High Demand', estimated_price_per_quintal:2200 },
    { product:'Cashew',     category:'Horticulture', grade:'Excellent', env_suitability:0.90, temp_suitability:0.89, weather_score:0.88, overall_score:0.89, market_status:'High Demand', estimated_price_per_quintal:9500 },
    { product:'Banana',     category:'Horticulture', grade:'Good',      env_suitability:0.86, temp_suitability:0.85, weather_score:0.84, overall_score:0.85, market_status:'Balanced',    estimated_price_per_quintal:1800 },
    { product:'Ginger',     category:'Spice',        grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'High Demand', estimated_price_per_quintal:12000},
    { product:'Tilapia',    category:'Aquaculture',  grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:1800 },
    { product:'Turmeric',   category:'Spice',        grade:'Fair',      env_suitability:0.73, temp_suitability:0.72, weather_score:0.71, overall_score:0.72, market_status:'Balanced',    estimated_price_per_quintal:7000 },
  ],
  'Laterite Soil': [
    { product:'Coconut',    category:'Horticulture', grade:'Excellent', env_suitability:0.92, temp_suitability:0.91, weather_score:0.90, overall_score:0.91, market_status:'High Demand', estimated_price_per_quintal:2200 },
    { product:'Mango',      category:'Horticulture', grade:'Excellent', env_suitability:0.90, temp_suitability:0.89, weather_score:0.88, overall_score:0.89, market_status:'High Demand', estimated_price_per_quintal:4500 },
    { product:'Cashew',     category:'Horticulture', grade:'Good',      env_suitability:0.86, temp_suitability:0.85, weather_score:0.84, overall_score:0.85, market_status:'Balanced',    estimated_price_per_quintal:9500 },
    { product:'Banana',     category:'Horticulture', grade:'Good',      env_suitability:0.83, temp_suitability:0.82, weather_score:0.81, overall_score:0.82, market_status:'Balanced',    estimated_price_per_quintal:1800 },
    { product:'Turmeric',   category:'Spice',        grade:'Good',      env_suitability:0.80, temp_suitability:0.79, weather_score:0.78, overall_score:0.79, market_status:'Balanced',    estimated_price_per_quintal:7000 },
    { product:'Tilapia',    category:'Aquaculture',  grade:'Fair',      env_suitability:0.73, temp_suitability:0.72, weather_score:0.71, overall_score:0.72, market_status:'Balanced',    estimated_price_per_quintal:1800 },
  ],
};

const PERIOD_MAP = { weekly: SOIL_PRODUCTS_WEEKLY, monthly: SOIL_PRODUCTS_MONTHLY, yearly: SOIL_PRODUCTS_YEARLY };
const DEFAULT_SOIL = 'Red Soil';

function getStaticRecommendations(district, myProductNames, period = 'weekly') {
  const soilType = DISTRICT_SOIL[district] || DEFAULT_SOIL;
  const periodMap = PERIOD_MAP[period] || SOIL_PRODUCTS_WEEKLY;
  const products  = periodMap[soilType] || periodMap[DEFAULT_SOIL] || SOIL_PRODUCTS_WEEKLY[DEFAULT_SOIL];
  return products.map((item) => ({
    ...item,
    already_posted: (myProductNames || []).includes(item.product.toLowerCase().trim()),
  }));
}

async function callMLServer(district, period = 'weekly') {
  const { data } = await axios.post(
    `${ML_SERVER_URL}/recommend`,
    { district, period },
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
    const period = ['weekly','monthly','yearly'].includes(req.query.period)
      ? req.query.period : 'weekly';
    console.log('[REC/farmer] START farmer_id:', req.user?.farmer_id, '- period:', period);

    const FarmerUser = require('../models/farmer_user.model');
    const Product    = require('../models/product.model');

    const farmer = await FarmerUser.findOne({
      where: { farmer_id: req.user.farmer_id },
      attributes: ['farmer_id', 'name', 'district'],
    });
    console.log('[REC/farmer] Farmer found:', !!farmer, '- district:', farmer?.district);

    if (!farmer || !farmer.district) {
      return res.status(400).json({
        success: false,
        message: 'Farmer district not set. Please update your profile with your district.',
      });
    }
    const district = farmer.district.trim();

    const myProducts = await Product.findAll({
      where: { farmer_id: req.user.farmer_id },
      attributes: ['name'],
    });
    const myProductNames = myProducts.map((p) => (p.name || '').toLowerCase().trim());
    console.log('[REC/farmer] Products owned:', myProductNames.length, '- period:', period);

    let recs       = [];
    let source     = 'catboost_ml';
    let mlWeather  = null;
    let mlSoilType = null;

    try {
      console.log('[REC/farmer] Calling ML:', ML_SERVER_URL);
      const mlData = await callMLServer(district, period);
      console.log('[REC/farmer] ML success:', mlData?.success, '- count:', mlData?.recommended_products?.length);

      if (mlData?.success && Array.isArray(mlData.recommended_products)) {
        recs = mlData.recommended_products.slice(0, 10).map((item) => ({
          ...item,
          already_posted: myProductNames.includes(item.product.toLowerCase().trim()),
        }));
        mlWeather  = mlData.weather   || null;
        mlSoilType = mlData.soil_type || null;
      }
    } catch (mlErr) {
      source     = 'static_fallback';
      mlSoilType = DISTRICT_SOIL[district] || DEFAULT_SOIL;
      console.warn('[REC/farmer] ML unreachable:', mlErr.message, '- static fallback - period:', period);
      recs = getStaticRecommendations(district, myProductNames, period);
    }

    console.log('[REC/farmer] Returning', recs.length, 'recs - period:', period, '- source:', source);

    return res.status(200).json({
      success: true,
      district,
      period,
      soil_type: mlSoilType,
      weather: mlWeather,
      source,
      weekly_recommendations: recs,
      recommendations: recs,
      summary: {
        district,
        period,
        total_recommended: recs.length,
        already_posted:    recs.filter((i) => i.already_posted).length,
        new_opportunities: recs.filter((i) => !i.already_posted).length,
      },
    });
  } catch (err) {
    console.error('[REC/farmer] Unexpected error:', err.message);
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
