const { sequelize } = require('./src/config/database');

async function addPendingStatus() {
  try {
    console.log('Adding PENDING status to orders enum...');
    
    await sequelize.query(`
      ALTER TYPE enum_orders_current_status ADD VALUE IF NOT EXISTS 'PENDING';
    `);
    
    console.log('✅ PENDING status added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

addPendingStatus();
