const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance with Railway MySQL credentials
const sequelize = new Sequelize(
  'railway',
  'root',
  'nPBcINVORdTwsJSHmjyeLCctECcwPgwV',
  {
    host: 'interchange.proxy.rlwy.net',
    port: 41805,
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
    const User = require('../models/user.model');
    require('../models/product.model');
    require('../models/order.model');
    require('../models/transaction.model');
    require('../models/cart.model');

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync all models with database
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully.');

    // Create admin user if not exists
    const adminExists = await User.findOne({ where: { email: 'admin@farmercrate.com' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@farmercrate.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Admin user created successfully.');
    }

  } catch (error) {
    console.error('Unable to initialize database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  initializeDatabase
}; 