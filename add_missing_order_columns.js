/**
 * Migration: Add missing columns to orders table
 * Run: node add_missing_order_columns.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    await sequelize.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS payment_method    VARCHAR(20)   DEFAULT 'COD',
        ADD COLUMN IF NOT EXISTS items_json        TEXT,
        ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS qr_image_url      VARCHAR(255),
        ADD COLUMN IF NOT EXISTS qr_code           VARCHAR(255),
        ADD COLUMN IF NOT EXISTS bill_url          VARCHAR(255),
        ADD COLUMN IF NOT EXISTS pickup_address    TEXT,
        ADD COLUMN IF NOT EXISTS delivery_address  TEXT,
        ADD COLUMN IF NOT EXISTS estimated_distance DECIMAL(8,2),
        ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMP;
    `);

    console.log('✅ Missing columns added (or already existed) in orders table');
    console.log('Columns added: payment_method, items_json, razorpay_order_id, razorpay_payment_id, qr_image_url, qr_code, bill_url, pickup_address, delivery_address, estimated_distance, estimated_delivery_time');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
