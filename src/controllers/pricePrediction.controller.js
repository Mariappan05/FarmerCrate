/**
 * pricePrediction.controller.js
 *
 * Exposes the price-prediction algorithm as Express endpoints.
 *
 * Endpoints (mounted at /api/price-prediction):
 *   GET  /api/price-prediction/health          – service health check
 *   GET  /api/price-prediction/:product_id     – single product prediction (public)
 *   GET  /api/price-prediction/farmer/all      – all farmer's products (protected, farmer only)
 */

const {
  predictPrice,
  predictPricesForFarmer,
  getCurrentSeason,
} = require('../services/pricePrediction.service');

// ─── Health ───────────────────────────────────────────────────────────────────
const health = (req, res) => {
  const season = getCurrentSeason();
  res.json({
    status: 'healthy',
    service: 'Price Prediction Service',
    algorithm: 'Demand-based seasonal pricing (ported from LightGBM pipeline)',
    current_season: `${season.emoji} ${season.name}`,
    timestamp: new Date().toISOString(),
  });
};

// ─── Single product prediction ────────────────────────────────────────────────
const getSinglePrediction = async (req, res) => {
  const productId = parseInt(req.params.product_id, 10);
  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid product_id' });
  }

  try {
    const prediction = await predictPrice(productId);
    return res.json({ success: true, data: prediction });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

// ─── All products for logged-in farmer ───────────────────────────────────────
const getFarmerPredictions = async (req, res) => {
  // farmer_id is attached by the auth middleware (protect + authorize('farmer'))
  const farmerId =
    req.user?.farmer_id ||
    req.user?.id ||
    req.user?.userId;

  if (!farmerId) {
    return res.status(401).json({ success: false, message: 'Farmer ID not found in token' });
  }

  try {
    const predictions = await predictPricesForFarmer(farmerId);

    if (!predictions.length) {
      return res.json({
        success: true,
        message: 'No products found for this farmer',
        data: [],
        summary: { total: 0, increase: 0, decrease: 0, maintain: 0 },
      });
    }

    // Build a compact summary
    const summary = predictions.reduce(
      (acc, p) => {
        acc.total++;
        if (p.action === 'INCREASE') acc.increase++;
        else if (p.action === 'DECREASE') acc.decrease++;
        else acc.maintain++;
        return acc;
      },
      { total: 0, increase: 0, decrease: 0, maintain: 0 }
    );

    const season = getCurrentSeason();

    return res.json({
      success: true,
      current_season: `${season.emoji} ${season.name}`,
      summary,
      data: predictions,
    });
  } catch (err) {
    console.error('[PricePrediction] getFarmerPredictions error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { health, getSinglePrediction, getFarmerPredictions };
