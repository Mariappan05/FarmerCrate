const { sequelize } = require('./src/config/database');

async function fixDatabaseMigration() {
  try {
    console.log('🔧 Starting comprehensive database migration fix...');
    
    // Step 1: Check if farmer_users table exists and get current structure
    const [tables] = await sequelize.query(
      "SHOW TABLES LIKE 'farmer_users'"
    );
    
    if (tables.length > 0) {
      console.log('📋 farmer_users table exists, checking structure...');
      
      // Get current column information
      const [columns] = await sequelize.query(
        "SHOW COLUMNS FROM farmer_users LIKE 'unique_id'"
      );
      
      if (columns.length > 0) {
        console.log('📊 Current unique_id column info:', columns[0]);
        
        // Check if there's data that's too long
        const [dataCheck] = await sequelize.query(
          "SELECT COUNT(*) as count FROM farmer_users WHERE unique_id IS NOT NULL AND LENGTH(unique_id) > 6"
        );
        
        if (dataCheck[0].count > 0) {
          console.log(`⚠️ Found ${dataCheck[0].count} records with unique_id longer than 6 characters`);
          console.log('🧹 Clearing problematic data...');
          
          // Clear the unique_id column
          await sequelize.query(
            "UPDATE farmer_users SET unique_id = NULL WHERE unique_id IS NOT NULL"
          );
          console.log('✅ Cleared unique_id data');
        }
        
        // Now try to alter the column
        console.log('🔧 Altering unique_id column to VARCHAR(6)...');
        try {
          await sequelize.query(
            "ALTER TABLE farmer_users MODIFY COLUMN unique_id VARCHAR(6) UNIQUE COMMENT '6-digit verification code'"
          );
          console.log('✅ Successfully altered unique_id column');
        } catch (alterError) {
          console.log('⚠️ Could not alter column, trying to drop and recreate...');
          
          // Drop the unique constraint first
          try {
            await sequelize.query(
              "ALTER TABLE farmer_users DROP INDEX unique_id"
            );
          } catch (dropIndexError) {
            console.log('ℹ️ No unique index to drop');
          }
          
          // Drop the column and recreate it
          await sequelize.query(
            "ALTER TABLE farmer_users DROP COLUMN unique_id"
          );
          
          await sequelize.query(
            "ALTER TABLE farmer_users ADD COLUMN unique_id VARCHAR(6) UNIQUE COMMENT '6-digit verification code'"
          );
          
          console.log('✅ Successfully recreated unique_id column');
        }
      } else {
        console.log('ℹ️ unique_id column does not exist, will be created during sync');
      }
    } else {
      console.log('ℹ️ farmer_users table does not exist, will be created during sync');
    }
    
    // Step 2: Check for admin_users table
    const [adminTables] = await sequelize.query(
      "SHOW TABLES LIKE 'admin_users'"
    );
    
    if (adminTables.length === 0) {
      console.log('ℹ️ admin_users table does not exist, will be created during sync');
    } else {
      console.log('✅ admin_users table already exists');
    }
    
    // Step 3: Verify all required tables exist
    const requiredTables = ['farmer_users', 'customer_users', 'transporter_users', 'admin_users', 'products', 'orders', 'transactions'];
    
    console.log('\n📋 Checking all required tables...');
    for (const tableName of requiredTables) {
      const [tableCheck] = await sequelize.query(
        `SHOW TABLES LIKE '${tableName}'`
      );
      
      if (tableCheck.length > 0) {
        console.log(`✅ ${tableName} table exists`);
      } else {
        console.log(`⚠️ ${tableName} table missing - will be created during sync`);
      }
    }
    
    console.log('\n🎉 Database migration fix completed!');
    console.log('💡 You can now restart your server safely.');
    
  } catch (error) {
    console.error('❌ Error during database migration fix:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixDatabaseMigration(); 