const { Sequelize } = require('sequelize');
require('dotenv').config();
const CustomerReturnRequest = require('../models/customerReturnRequest.model');

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
    require('../models/orderItem.model');
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
      require('../models/customerReturnRequest.model');
    
    // Vehicle Management Models
    require('../models/permanentVehicle.model');
    require('../models/temporaryVehicle.model');
    require('../models/permanentVehicleDocument.model');
    
    // Set up associations
    require('../models/associations');

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models with database - force sync to add new columns
    try {
      await sequelize.sync({ 
        force: false,
        alter: true, // Enable alter to add missing columns
        logging: console.log
      });
    } catch (syncError) {
      console.log('Sync warning (tables may already exist):', syncError.message);
      // Global sync can fail on unrelated enum casts. Ensure return-request schema is still aligned.
      try {
        await CustomerReturnRequest.sync({ alter: true, logging: console.log });
        console.log('Customer return request table synchronized successfully.');
      } catch (returnSyncError) {
        console.error('Customer return request table sync failed:', returnSyncError.message);
      }
      // Continue anyway as most tables may already exist.
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