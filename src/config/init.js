const { sequelize } = require('./database');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const Transaction = require('../models/transaction.model');

// Define model associations
const initAssociations = () => {
  // Farmer associations
  FarmerUser.hasMany(Product, { foreignKey: 'farmerId' });
  FarmerUser.hasMany(Order, { foreignKey: 'farmerId' });
  
  // Customer associations
  CustomerUser.hasMany(Order, { foreignKey: 'customerId' });
  
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

    // Ensure global_farmer_id column exists - run raw SQL
    try {
      const [results] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='farmers' AND column_name='global_farmer_id';
      `);
      
      if (results.length === 0) {
        await sequelize.query(`
          ALTER TABLE farmers ADD COLUMN global_farmer_id VARCHAR(50) UNIQUE;
        `);
        console.log('✅ Added global_farmer_id column to farmers table');
      } else {
        console.log('✅ global_farmer_id column already exists');
      }
    } catch (err) {
      console.log('Column check error:', err.message);
    }

    // Create default admin user if not exists
    const adminExists = await AdminUser.findOne({ where: { email: 'admin@farmercrate.com' } });
    if (!adminExists) {
      await AdminUser.create({
        name: 'System Admin',
        email: 'admin@farmercrate.com',
        password: 'admin123',
        mobile_number: '+919876543210',
        role: 'super_admin',
        is_active: true
      });
      console.log('Default admin user created successfully');
    }

    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    // Don't exit the process, let the application handle the error
    return false;
  }
};

module.exports = initDatabase; 