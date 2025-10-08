const { sequelize } = require('./src/config/database');

async function checkTransactionsTable() {
  try {
    console.log('Checking transactions table structure...');
    
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Current transactions table columns:');
    results.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

checkTransactionsTable();