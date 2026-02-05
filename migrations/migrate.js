const { sequelize } = require('../src/config/database');

async function migrate() {
  try {
    console.log('Starting migration...');

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
    require('../src/models/notification.model');
    require('../src/models/productImage.model');
    require('../src/models/deliveryTracking.model');

    // Set up associations
    require('../src/models/associations');

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models to database with alter, but skip enum conversion issues
    console.log('Syncing models to database...');
    
    try {
      await sequelize.sync({ 
        alter: true,
        logging: false
      });
    } catch (syncError) {
      // If sync fails due to enum issues, try without alter
      console.log('Sync with alter failed, attempting standard sync...');
      await sequelize.sync({ 
        force: false,
        logging: false
      });
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
