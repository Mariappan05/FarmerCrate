const { sequelize } = require('./src/config/database');

async function addTransporterBankDetails() {
  try {
    console.log('Adding bank details columns to transporters table...');
    
    await sequelize.query(`
      ALTER TABLE transporters 
      ADD COLUMN IF NOT EXISTS account_number VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(255);
    `);
    
    console.log('✅ Bank details columns added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

addTransporterBankDetails();
