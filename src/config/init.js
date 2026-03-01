const { sequelize } = require('./database');
const AdminUser = require('../models/admin_user.model');

// Load all model associations from the canonical associations file
const initAssociations = () => {
  require('../models/associations');
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

    // Safety migration FIRST (before sync, so it always runs even if sync fails)
    try {
      await sequelize.query(`
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'COD',
          ADD COLUMN IF NOT EXISTS items_json TEXT,
          ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS qr_image_url VARCHAR(255)
      `);
      await sequelize.query(`
        ALTER TABLE products
          ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg',
          ADD COLUMN IF NOT EXISTS harvest_date DATE,
          ADD COLUMN IF NOT EXISTS expiry_date DATE
      `);
      console.log('Safety column migration completed');
    } catch (migrationError) {
      console.log('Column migration note (non-fatal):', migrationError.message);
    }

    // Sync models (wrapped so a partial failure does not abort startup)
    try {
      await sequelize.sync({ alter: true });
      console.log('Database synchronized successfully');
    } catch (syncError) {
      console.log('Sync warning (non-fatal, columns already migrated above):', syncError.message);
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