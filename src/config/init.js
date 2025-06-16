const { sequelize } = require('./database');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const Transaction = require('../models/transaction.model');

// Define model associations
const initAssociations = () => {
  // User associations
  User.hasMany(Product, { foreignKey: 'farmerId' });
  User.hasMany(Order, { foreignKey: 'consumerId' });
  User.hasMany(Order, { foreignKey: 'farmerId' });
  User.hasMany(Transaction, { foreignKey: 'userId' });

  // Product associations
  Product.hasMany(Order, { foreignKey: 'productId' });

  // Order associations
  Order.hasMany(Transaction, { foreignKey: 'orderId' });
};

// Initialize database
const initDatabase = async () => {
  try {
    // Test database connection first
    await sequelize.authenticate();
    console.log('Database connection established successfully');

    // Initialize associations
    initAssociations();
    console.log('Model associations initialized');

    // Sync all models with database
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');

    // Create admin user if not exists
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@farmercrate.com',
        password: 'admin123', // This will be hashed by the model hook
        mobileNumber: '1234567890',
        role: 'admin'
      });
      console.log('Admin user created successfully');
    }

    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    // Don't exit the process, let the application handle the error
    return false;
  }
};

module.exports = initDatabase; 