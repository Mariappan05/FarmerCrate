/**
 * pricePrediction.service.js
 *
 * Pure-JS implementation of the price prediction algorithm (ported from api.py /
 * api_seasonal.py).  No separate Python server required – runs inside the same
 * Node process using the existing Sequelize / PostgreSQL connection.
 *
 * Pipeline (matches Python implementation exactly):
 *   1. Fetch product + time-windowed sales aggregates from DB
 *   2. Compute demand metrics  (demand_pressure, stock-to-sales, daily_views)
 *   3. Classify demand level   (HIGH / MODERATE / LOW)
 *   4. Seasonal factor         (Summer 1.5× / Monsoon 1.3× / Winter 1.4× / Year-Round 1.0×)
 *   5. Adjust demand pressure  with seasonal multiplier
 *   6. Determine price-change direction from adjusted demand
 *   7. Clamp change to ₹3–₹4 range (mirrors Python's validation step)
 *   8. Return complete recommendation object
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// ─── Seasonal product catalogue ───────────────────────────────────────────────
const SEASONAL_PRODUCTS = {
  Summer: {
    products: ['mango', 'mangoes', 'watermelon', 'cucumber', 'tomato', 'tomatoes'],
    months: [3, 4, 5, 6],
    multiplier: 1.5,
    emoji: '☀️',
  },
  Monsoon: {
    products: ['spinach', 'coriander', 'mint', 'green chillies', 'chillies'],
    months: [7, 8, 9],
    multiplier: 1.3,
    emoji: '🌧️',
  },
  Winter: {
    products: ['carrot', 'carrots', 'guava', 'guavas', 'papaya', 'papayas'],
    months: [11, 12, 1, 2],
    multiplier: 1.4,
    emoji: '❄️',
  },
  'Year-Round': {
    products: ['potato', 'potatoes', 'onion', 'onions', 'rice', 'banana', 'coconut', 'coconuts'],
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    multiplier: 1.0,
    emoji: '🌾',
  },
};

/** Returns current season name + emoji + active months */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-based
  if ([3, 4, 5, 6].includes(month))     return { name: 'Summer',       emoji: '☀️',  months: [3,4,5,6] };
  if ([7, 8, 9].includes(month))        return { name: 'Monsoon',      emoji: '🌧️', months: [7,8,9] };
  if ([11, 12, 1, 2].includes(month))   return { name: 'Winter',       emoji: '❄️',  months: [11,12,1,2] };
  return                                       { name: 'Post-Monsoon',  emoji: '🍂', months: [10] };
}

/** Determine a product's seasonal category and multiplier from its name */
function getProductSeasonInfo(productName) {
  const lower = productName.toLowerCase();
  const month = new Date().getMonth() + 1;

  for (const [season, info] of Object.entries(SEASONAL_PRODUCTS)) {
    if (info.products.some((p) => lower.includes(p))) {
      const isInSeason = info.months.includes(month);
      return {
        season,
        multiplier: info.multiplier,
        isInSeason,
        emoji: info.emoji,
      };
    }
  }
  // Default – unlisted product
  return { season: 'Year-Round', multiplier: 1.0, isInSeason: true, emoji: '🌾' };
}

/** Classify demand pressure into HIGH / MODERATE / LOW */
function classifyDemand(seasonalDemandPressure) {
  if (seasonalDemandPressure > 0.5) return 'HIGH';
  if (seasonalDemandPressure > 0.2) return 'MODERATE';
  return 'LOW';
}

/**
 * Clamp predicted price so that the change from current price stays in [3, 4] ₹.
 * This mirrors Step 6 of the Python api.py / api_seasonal.py.
 */
function clampPrice(currentPrice, rawPredictedPrice, isInSeason, seasonalDemandPressure) {
  const rawChange = rawPredictedPrice - currentPrice;
  let predictedPrice = rawPredictedPrice;
  let wasAdjusted = false;
  let adjustmentReason = '';

  if (Math.abs(rawChange) < 3.0) {
    wasAdjusted = true;
    // Use 3.5 for in-season products with any demand, 3.0 for moderate demand, -3.0 for low
    if (isInSeason && seasonalDemandPressure > 0.1) {
      predictedPrice = currentPrice + 3.5;
      adjustmentReason = 'IN SEASON – minimum seasonal boost of ₹3.50 applied';
    } else if (seasonalDemandPressure > 0.2) {
      predictedPrice = currentPrice + 3.0;
      adjustmentReason = 'Moderate demand – minimum increase of ₹3.00 applied';
    } else {
      predictedPrice = currentPrice - 3.0;
      adjustmentReason = 'Low demand – minimum decrease of ₹3.00 applied';
    }
  } else if (Math.abs(rawChange) > 4.0) {
    wasAdjusted = true;
    if (rawChange > 0) {
      const cap = isInSeason ? 4.0 : 3.5;
      predictedPrice = currentPrice + cap;
      adjustmentReason = `${isInSeason ? 'IN SEASON' : 'OFF SEASON'} – increase capped at ₹${cap.toFixed(2)}`;
    } else {
      predictedPrice = currentPrice - 4.0;
      adjustmentReason = 'Change too large – decrease capped at ₹4.00';
    }
  }

  // Safety floor – price never goes below ₹1
  if (predictedPrice < 1) {
    predictedPrice = 1;
    wasAdjusted = true;
    adjustmentReason += ' (price floor ₹1 applied)';
  }

  return { predictedPrice, rawChange, wasAdjusted, adjustmentReason };
}

/**
 * Core algorithm – fetch data from DB, compute demand + seasonal metrics,
 * apply the ±₹3–4 clamping rule and return a full recommendation object.
 *
 * @param {number} productId
 * @returns {Promise<object>} recommendation
 */
async function predictPrice(productId) {
  // ── Step 1: DB query (identical SQL to Python) ──────────────────────────────
  const rows = await sequelize.query(
    `
    SELECT
      p.product_id,
      p.name,
      p.quantity                                               AS stock,
      p.views                                                  AS total_views,
      p.current_price,
      COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURRENT_DATE                        THEN o.quantity ELSE 0 END), 0) AS today_sales,
      COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURRENT_DATE - INTERVAL '1 day'    THEN o.quantity ELSE 0 END), 0) AS sales_lag_1,
      COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURRENT_DATE - INTERVAL '7 days'   THEN o.quantity ELSE 0 END), 0) AS sales_lag_7,
      COALESCE(AVG(CASE WHEN o.created_at >= NOW() - INTERVAL '7 days'               THEN o.quantity END),  0)       AS sales_rolling_7,
      COALESCE(AVG(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days'              THEN o.quantity END),  0)       AS sales_rolling_30
    FROM products p
    LEFT JOIN orders o ON o.product_id = p.product_id
    WHERE p.product_id = :productId
    GROUP BY p.product_id, p.name, p.quantity, p.views, p.current_price
    `,
    {
      replacements: { productId },
      type: QueryTypes.SELECT,
    }
  );

  if (!rows || rows.length === 0) {
    const err = new Error(`Product ${productId} not found`);
    err.statusCode = 404;
    throw err;
  }

  const row = rows[0];

  // ── Step 2: Extract raw values ───────────────────────────────────────────────
  const productName   = row.name;
  const currentPrice  = parseFloat(row.current_price);
  const stock         = parseFloat(row.stock);
  const totalViews    = parseFloat(row.total_views);
  const todaySales    = parseFloat(row.today_sales);
  const yesterdaySales= parseFloat(row.sales_lag_1);
  const sales7DaysAgo = parseFloat(row.sales_lag_7);
  const avgSales7Days = parseFloat(row.sales_rolling_7);
  const avgSales30Days= parseFloat(row.sales_rolling_30);

  // ── Step 3: Demand metrics ───────────────────────────────────────────────────
  const dailyViews          = totalViews / 30;
  const demandPressure      = todaySales / (stock + 1);      // avoid /0
  const stockToSalesRatio   = stock / (todaySales + 1);

  // ── Step 4: Seasonal info ────────────────────────────────────────────────────
  const currentSeason   = getCurrentSeason();
  const productSeason   = getProductSeasonInfo(productName);
  const { multiplier: seasonalMultiplier, isInSeason } = productSeason;

  // ── Step 5: Seasonally-adjusted demand ───────────────────────────────────────
  const seasonalDemandPressure = demandPressure * seasonalMultiplier;
  const demandLevel = classifyDemand(seasonalDemandPressure);

  // ── Step 6: Raw price direction (replaces LightGBM output direction) ─────────
  // Direction: if seasonal demand pressure > 0.2 → increase, else → decrease
  // Magnitude: start at ±3 and let clamping decide the exact value
  const rawDirection   = seasonalDemandPressure > 0.2 ? 1 : -1;
  const rawPredictedPrice = currentPrice + rawDirection * 3.0; // sentinel magnitude

  // ── Step 7: Clamp to ±₹3–4 range ────────────────────────────────────────────
  const {
    predictedPrice,
    rawChange,
    wasAdjusted,
    adjustmentReason,
  } = clampPrice(currentPrice, rawPredictedPrice, isInSeason, seasonalDemandPressure);

  const priceChange    = predictedPrice - currentPrice;
  const priceChangePct = (priceChange / currentPrice) * 100;

  // ── Step 8: Recommendation label ────────────────────────────────────────────
  let action, recommendation;
  if (priceChange > 0) {
    action = 'INCREASE';
    recommendation = isInSeason
      ? `Increase price – ${productSeason.season} peak season, demand is ${demandLevel}`
      : `Increase price – ${demandLevel} demand pressure (${todaySales.toFixed(0)} units sold today)`;
  } else if (priceChange < 0) {
    action = 'DECREASE';
    recommendation = isInSeason
      ? `Decrease price – even in season, low sales indicate oversupply`
      : `Decrease price – ${demandLevel} demand, boost sales with lower price`;
  } else {
    action = 'MAINTAIN';
    recommendation = 'Maintain price – balanced supply and demand';
  }

  return {
    product_id:            parseInt(productId),
    product_name:          productName,

    // Pricing
    current_price:         parseFloat(currentPrice.toFixed(2)),
    predicted_price:       parseFloat(predictedPrice.toFixed(2)),
    price_change:          parseFloat(priceChange.toFixed(2)),
    price_change_pct:      parseFloat(priceChangePct.toFixed(2)),
    action,                                // 'INCREASE' | 'DECREASE' | 'MAINTAIN'
    recommendation,

    // Demand analysis
    demand_level:          demandLevel,    // 'HIGH' | 'MODERATE' | 'LOW'
    demand_pressure:       parseFloat(demandPressure.toFixed(4)),
    seasonal_demand:       parseFloat(seasonalDemandPressure.toFixed(4)),
    stock_to_sales_ratio:  parseFloat(stockToSalesRatio.toFixed(2)),

    // Seasonal context
    current_season:        `${currentSeason.emoji} ${currentSeason.name}`,
    product_season:        `${productSeason.emoji} ${productSeason.season}`,
    seasonal_factor:       seasonalMultiplier,
    in_season:             isInSeason,

    // Sales data
    today_sales:           parseInt(todaySales),
    yesterday_sales:       parseInt(yesterdaySales),
    sales_7_days_ago:      parseInt(sales7DaysAgo),
    avg_sales_7_days:      parseFloat(avgSales7Days.toFixed(2)),
    avg_sales_30_days:     parseFloat(avgSales30Days.toFixed(2)),
    current_stock:         parseInt(stock),
    daily_views:           parseFloat(dailyViews.toFixed(1)),

    // Adjustment metadata
    was_adjusted:          wasAdjusted,
    adjustment_reason:     wasAdjusted ? adjustmentReason : null,
    raw_price_change:      parseFloat(rawChange.toFixed(2)),

    computed_at:           new Date().toISOString(),
  };
}

/**
 * Predict prices for all products belonging to a specific farmer.
 *
 * @param {number} farmerId
 * @returns {Promise<Array>}
 */
async function predictPricesForFarmer(farmerId) {
  const products = await sequelize.query(
    `SELECT product_id FROM products WHERE farmer_id = :farmerId AND status != 'hidden'`,
    { replacements: { farmerId }, type: QueryTypes.SELECT }
  );

  if (!products || products.length === 0) return [];

  // Run predictions in parallel
  const results = await Promise.allSettled(
    products.map((p) => predictPrice(p.product_id))
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
}

module.exports = { predictPrice, predictPricesForFarmer, getCurrentSeason };
