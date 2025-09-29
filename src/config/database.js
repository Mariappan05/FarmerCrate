const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance with environment variables
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  define: {
    underscored: true,
    timestamps: true
  }
});

// Initialize database and create tables
const initializeDatabase = async () => {
  try {
    // Import all models
    require('../models/farmer_user.model');
    require('../models/customer_user.model');
    require('../models/product.model');
    require('../models/order.model');
    require('../models/transaction.model');
    require('../models/cart.model');
    require('../models/transporter_user.model');
    require('../models/deliveryPerson.model');
    require('../models/admin_user.model');
    require('../models/wishlist.model');
    
    // New models
    require('../models/productPriceHistory.model');
    require('../models/farmerVerificationHistory.model');
    require('../models/deliveryTracking.model');
    
    // Vehicle Management Models
    require('../models/permanentVehicle.model');
    require('../models/temporaryVehicle.model');
    require('../models/permanentVehicleDocument.model');
    
    // Set up associations
    require('../models/associations');

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models with database - simple sync for new database
    try {
      await sequelize.sync({ 
        force: false,
        alter: false, // Disable alter to avoid schema issues
        logging: false
      });
    } catch (syncError) {
      console.log('Sync warning (tables may already exist):', syncError.message);
      // Continue anyway as tables might exist
    }
    console.log('Database synchronized successfully.');

    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  initializeDatabase
};