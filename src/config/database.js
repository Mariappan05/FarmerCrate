const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance with environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Use this only if you're connecting to a trusted database
      }
    },
    define: {
      underscored: true, // This makes Sequelize use snake_case in the database
      timestamps: true   // This enables timestamps for all models
    }
  }
);

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
    
    // Vehicle Management Models
    require('../models/permanentVehicle.model');
    require('../models/temporaryVehicle.model');
    require('../models/permanentVehicleDocument.model');
    require('../models/temporaryVehicleDocument.model');
    
    // Set up associations
    require('../models/associations');

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models with database - using safe mode
    await sequelize.sync({ 
      alter: true, // Enable to auto-create/update tables and columns
      logging: false
    });
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