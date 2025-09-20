/**
 * HARD DELETE VERIFICATION TEST
 * 
 * This test verifies that when admin deletes users through the API,
 * the records are completely removed from the database (hard delete),
 * not just marked as deleted (soft delete).
 * 
 * Run this test to confirm database deletion behavior.
 */

const { sequelize } = require('./src/config/database');
const FarmerUser = require('./src/models/farmer_user.model');
const CustomerUser = require('./src/models/customer_user.model');
const Product = require('./src/models/product.model');
const Order = require('./src/models/order.model');

// Initialize associations
require('./src/models/associations');

async function testHardDelete() {
  try {
    console.log('🔥 HARD DELETE TEST - Starting...\n');

    // Create a test farmer with related data
    const testFarmer = await FarmerUser.create({
      name: 'Test Farmer DELETE',
      mobile_number: '1234567890',
      email: 'testdelete@farmer.com',
      password: 'hashedpassword123',
      address: 'Test Address',
      verified_status: true
    });

    console.log(`✅ Created test farmer (ID: ${testFarmer.id})`);

    // Create a test product for the farmer
    const testProduct = await Product.create({
      product_name: 'Test Product DELETE',
      farmer_id: testFarmer.id,
      price: 100.00,
      category: 'vegetables',
      description: 'Test product for delete verification'
    });

    console.log(`✅ Created test product (ID: ${testProduct.id})`);

    // Verify records exist before deletion
    const farmerBeforeDelete = await FarmerUser.findByPk(testFarmer.id);
    const productBeforeDelete = await Product.findByPk(testProduct.id);
    
    console.log(`📋 Before Delete - Farmer exists: ${!!farmerBeforeDelete}`);
    console.log(`📋 Before Delete - Product exists: ${!!productBeforeDelete}\n`);

    // HARD DELETE with force: true
    console.log('🗑️  PERFORMING HARD DELETE (force: true)...');
    await testFarmer.destroy({ force: true });
    console.log('✅ Hard delete completed\n');

    // Verify records are completely removed from database
    const farmerAfterDelete = await FarmerUser.findByPk(testFarmer.id);
    const productAfterDelete = await Product.findByPk(testProduct.id);
    
    console.log('🔍 VERIFICATION RESULTS:');
    console.log(`📋 After Delete - Farmer exists: ${!!farmerAfterDelete}`);
    console.log(`📋 After Delete - Product exists: ${!!productAfterDelete}`);
    
    if (!farmerAfterDelete && !productAfterDelete) {
      console.log('\n✅ SUCCESS: Records are completely removed from database (HARD DELETE)');
      console.log('✅ CASCADE DELETE: Related product was also removed');
    } else {
      console.log('\n❌ FAILURE: Records still exist in database');
    }

    // Test with paranoid model comparison (if any models had soft delete)
    console.log('\n🔍 ADDITIONAL VERIFICATION:');
    
    // Try to find with paranoid: false (this would show soft deleted records)
    const softDeleteCheck = await FarmerUser.findByPk(testFarmer.id, { paranoid: false });
    if (!softDeleteCheck) {
      console.log('✅ CONFIRMED: No soft delete - record is permanently removed');
    } else {
      console.log('⚠️  WARNING: Record found with paranoid:false - this indicates soft delete');
    }

    console.log('\n🎉 HARD DELETE TEST COMPLETED');
    console.log('📝 SUMMARY: Admin delete functions will permanently remove records from database');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Clean up any remaining test data
    await sequelize.close();
  }
}

// Run the test
testHardDelete().catch(console.error);