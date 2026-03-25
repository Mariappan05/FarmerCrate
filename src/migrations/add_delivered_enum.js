const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize } = require(path.resolve(__dirname, '../config/database'));

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    await sequelize.query(`ALTER TYPE "enum_orders_current_status" ADD VALUE IF NOT EXISTS 'DELIVERED';`);
    console.log('Added DELIVERED ENUM value');
    
    // Also verify the columns exist
    const [cols] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('packing_image_url', 'bill_paste_image_url', 'delivery_person_id')`);
    console.log('Existing columns:', cols.map(c => c.column_name));
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
