const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance with environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false, // Set to console.log to see SQL queries
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);

// Initialize database and create tables
const initializeDatabase = async () => {
  try {
    // Require models here to avoid circular dependency
    require('../models/product.model');
    require('../models/order.model');
    require('../models/transaction.model');
    require('../models/cart.model');

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync all models with database
    await sequelize.sync({ 
      alter: false, // Changed to false to prevent automatic schema changes
      logging: console.log,
      force: false
    });
    console.log('Database synchronized successfully.');

  } catch (error) {
    console.error('Unable to initialize database:', error);
    console.log('Continuing with server startup despite database sync issues...');
    return false;
  }
};

module.exports = {
  sequelize,
  initializeDatabase
}; 