const { sequelize } = require('./src/config/database');

async function fixTransactionsFarmerId() {
  try {
    console.log('Making farmer_id nullable in transactions table...');
    
    await sequelize.query(`
      ALTER TABLE transactions 
      ALTER COLUMN farmer_id DROP NOT NULL;
    `);
    
    console.log('✅ farmer_id is now nullable');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

fixTransactionsFarmerId();
