/**
 * Migration script to add new columns and ENUM values to the orders table.
 * Run this ONCE on your PostgreSQL database to add missing columns.
 * 
 * Usage: node src/migrations/add_packing_columns.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize } = require(path.resolve(__dirname, '../config/database'));

const migrate = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // 1. Add new ENUM values to current_status
    const enumValues = [
      'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 
      'PICKED_UP', 'REACHED_DESTINATION'
    ];
    
    for (const val of enumValues) {
      try {
        await sequelize.query(`ALTER TYPE "enum_orders_current_status" ADD VALUE IF NOT EXISTS '${val}';`);
        console.log(`✅ Added ENUM value: ${val}`);
      } catch (e) {
        // IF NOT EXISTS is PG 9.3+; if it fails, the value already exists
        console.log(`⚠️  ENUM value ${val} may already exist: ${e.message}`);
      }
    }

    // 2. Add packing_image_url column
    try {
      await sequelize.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS packing_image_url TEXT;`);
      console.log('✅ Added column: packing_image_url');
    } catch (e) {
      console.log(`⚠️  packing_image_url: ${e.message}`);
    }

    // 3. Add bill_paste_image_url column
    try {
      await sequelize.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS bill_paste_image_url TEXT;`);
      console.log('✅ Added column: bill_paste_image_url');
    } catch (e) {
      console.log(`⚠️  bill_paste_image_url: ${e.message}`);
    }

    // 4. Add new columns to permanent_vehicles table
    const pvColumns = [
      { name: 'rc_book_number', type: 'VARCHAR(100)' },
      { name: 'ownership_type', type: "VARCHAR(50) DEFAULT 'Owned'" },
      { name: 'is_available', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'rc_copy_url', type: 'TEXT' },
      { name: 'insurance_url', type: 'TEXT' },
      { name: 'permit_url', type: 'TEXT' },
    ];

    for (const col of pvColumns) {
      try {
        await sequelize.query(`ALTER TABLE permanent_vehicles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
        console.log(`✅ Added column to permanent_vehicles: ${col.name}`);
      } catch (e) {
        console.log(`⚠️  permanent_vehicles.${col.name}: ${e.message}`);
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
