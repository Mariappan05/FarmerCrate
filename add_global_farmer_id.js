const { sequelize } = require('./src/config/database');

async function addGlobalFarmerIdColumn() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    await sequelize.query(`
      ALTER TABLE farmers 
      ADD COLUMN IF NOT EXISTS global_farmer_id VARCHAR(50) UNIQUE;
    `);

    console.log('✅ global_farmer_id column added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  }
}

addGlobalFarmerIdColumn();
