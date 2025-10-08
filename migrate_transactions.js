const { sequelize } = require('./src/config/database');

async function migrateTransactions() {
  try {
    console.log('Adding missing columns to transactions table...');
    
    // Add missing columns
    await sequelize.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS user_type VARCHAR(20),
      ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);
    
    // Update existing records
    await sequelize.query(`
      UPDATE transactions 
      SET user_type = 'farmer', user_id = farmer_id 
      WHERE farmer_id IS NOT NULL AND user_type IS NULL;
    `);
    
    console.log('✅ Transactions table migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTransactions();