const { sequelize } = require('./src/config/database');

async function migrateDatabase() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Force sync to update table structure
    await sequelize.sync({ alter: true });
    
    console.log('✅ Database migration completed successfully!');
    console.log('📋 Orders table updated with new columns');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();