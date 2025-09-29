const { sequelize } = require('../src/config/database');

async function updateDatabase() {
  try {
    console.log('Starting database update with CASCADE constraints...');
    
    // Import all models to register them
    require('../src/models/farmer_user.model');
    require('../src/models/customer_user.model');
    require('../src/models/admin_user.model');
    require('../src/models/transporter_user.model');
    require('../src/models/deliveryPerson.model');
    require('../src/models/product.model');
    require('../src/models/order.model');
    require('../src/models/cart.model');
    require('../src/models/wishlist.model');
    require('../src/models/transaction.model');
    require('../src/models/productPriceHistory.model');
    require('../src/models/farmerVerificationHistory.model');
    require('../src/models/permanentVehicle.model');
    require('../src/models/temporaryVehicle.model');
    require('../src/models/permanentVehicleDocument.model');
    
    // Set up associations
    require('../src/models/associations');
    
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync with force to recreate all tables with proper CASCADE constraints
    console.log('Recreating tables with CASCADE constraints...');
    await sequelize.sync({ 
      force: true,
      logging: console.log
    });
    
    console.log('Database updated successfully with CASCADE constraints!');
    console.log('All tables have been recreated with proper foreign key relationships.');
    
  } catch (error) {
    console.error('Database update failed:', error);
  } finally {
    await sequelize.close();
  }
}

updateDatabase();