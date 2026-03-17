/**
 * run_price_prediction.js
 * Standalone runner — tests the price prediction algorithm directly.
 * Usage: node run_price_prediction.js
 */

require('dotenv').config();
const { predictPricesForFarmer, predictPrice, getCurrentSeason } = require('./src/services/pricePrediction.service');
const { sequelize } = require('./src/config/database');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✓ DB connected\n');

    const season = getCurrentSeason();
    console.log(`=`.repeat(70));
    console.log(`  PRICE PREDICTION ALGORITHM — Standalone Runner`);
    console.log(`  Current Season: ${season.emoji} ${season.name}`);
    console.log(`  Date: ${new Date().toLocaleString('en-IN')}`);
    console.log(`=`.repeat(70));

    // ── Fetch all products from DB ──────────────────────────────────────────
    const { QueryTypes } = require('sequelize');
    const products = await sequelize.query(
      `SELECT product_id, name, current_price, quantity, farmer_id FROM products WHERE status != 'hidden' LIMIT 50`,
      { type: QueryTypes.SELECT }
    );

    if (products.length === 0) {
      console.log('\n⚠️  No products found in the database.');
      return;
    }

    console.log(`\n📦 Products found: ${products.length}\n`);

    // ── Run prediction for each product ─────────────────────────────────────
    const results = [];
    for (const p of products) {
      try {
        const pred = await predictPrice(p.product_id);
        results.push(pred);

        const arrow   = pred.action === 'INCREASE' ? '🔼' : pred.action === 'DECREASE' ? '🔽' : '➡️ ';
        const demand  = pred.demand_level === 'HIGH' ? '🔴' : pred.demand_level === 'MODERATE' ? '🟡' : '🟢';
        const season  = pred.in_season ? '✅' : '❌';

        console.log(`─`.repeat(70));
        console.log(`  ${arrow}  ${pred.product_name.padEnd(25)}  (ID: ${pred.product_id})`);
        console.log(`     Current:    ₹${pred.current_price.toFixed(2)}/kg`);
        console.log(`     Suggested:  ₹${pred.predicted_price.toFixed(2)}/kg  (${pred.price_change >= 0 ? '+' : ''}₹${pred.price_change.toFixed(2)} / ${pred.price_change_pct >= 0 ? '+' : ''}${pred.price_change_pct.toFixed(1)}%)`);
        console.log(`     Demand:     ${demand} ${pred.demand_level}  |  Stock: ${pred.current_stock} units  |  Today Sold: ${pred.today_sales}`);
        console.log(`     Season:     ${pred.product_season}  ${season} ${pred.in_season ? 'In Season' : 'Off Season'}  (factor: ${pred.seasonal_factor}x)`);
        if (pred.was_adjusted) {
          console.log(`     ⚠️  Adjusted: ${pred.adjustment_reason}`);
        }
        console.log(`     💡 ${pred.recommendation}`);
      } catch (err) {
        console.log(`  ✗ Product ID ${p.product_id} (${p.name}): ${err.message}`);
      }
    }

    // ── Summary table ────────────────────────────────────────────────────────
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  SUMMARY`);
    console.log(`${'='.repeat(70)}`);
    console.log(`  ${'Product'.padEnd(28)} ${'Current'.padStart(10)} ${'Suggested'.padStart(10)} ${'Change'.padStart(10)}  Action`);
    console.log(`  ${'-'.repeat(66)}`);
    for (const r of results) {
      const arrow = r.action === 'INCREASE' ? '🔼' : r.action === 'DECREASE' ? '🔽' : '➡️ ';
      console.log(
        `  ${r.product_name.substring(0, 26).padEnd(28)}` +
        ` ₹${String(r.current_price.toFixed(2)).padStart(8)}` +
        ` ₹${String(r.predicted_price.toFixed(2)).padStart(8)}` +
        `  ${(r.price_change >= 0 ? '+' : '')}₹${String(r.price_change.toFixed(2)).padStart(6)}` +
        `  ${arrow} ${r.action}`
      );
    }

    const inc  = results.filter(r => r.action === 'INCREASE').length;
    const dec  = results.filter(r => r.action === 'DECREASE').length;
    const mnt  = results.filter(r => r.action === 'MAINTAIN').length;

    console.log(`  ${'-'.repeat(66)}`);
    console.log(`  Total: ${results.length}  |  🔼 Increase: ${inc}  |  🔽 Decrease: ${dec}  |  ➡️  Maintain: ${mnt}`);
    console.log(`${'='.repeat(70)}\n`);

  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

run();
