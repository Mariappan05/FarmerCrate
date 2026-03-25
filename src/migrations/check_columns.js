const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize } = require(path.resolve(__dirname, '../config/database'));

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    // Check what columns exist on each table
    const tables = ['transporters', 'customer_users', 'orders', 'delivery_persons'];
    for (const table of tables) {
      try {
        const [cols] = await sequelize.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`
        );
        console.log(`\n=== ${table} columns ===`);
        console.log(cols.map(c => c.column_name).join(', '));
      } catch (e) {
        console.log(`Error checking ${table}: ${e.message}`);
      }
    }

    // Add missing columns if needed
    const alterQueries = [
      `ALTER TABLE transporters ADD COLUMN IF NOT EXISTS image_url TEXT`,
      `ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS image_url TEXT`,
      `ALTER TABLE delivery_persons ADD COLUMN IF NOT EXISTS image_url TEXT`,
    ];

    for (const q of alterQueries) {
      try {
        await sequelize.query(q);
        console.log(`✅ ${q}`);
      } catch (e) {
        console.log(`⚠️ ${q}: ${e.message}`);
      }
    }

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
