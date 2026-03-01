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

    // Safety migration FIRST — each column is a separate statement so one failure
    // cannot block the others (PostgreSQL rejects the entire statement if any
    // column in a multi-ADD clause already exists in an unexpected state).
    const safeAddCol = async (sql) => {
      try { await sequelize.query(sql); }
      catch (e) { console.log('Column migration note (non-fatal):', e.message); }
    };

    // orders table
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'COD'`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_json TEXT`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255)`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255)`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255)`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_image_url VARCHAR(255)`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS bill_url VARCHAR(255)`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_address TEXT`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_distance DECIMAL(8,2)`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMPTZ`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_transporter_id INTEGER`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS destination_transporter_id INTEGER`);
    await safeAddCol(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_person_id INTEGER`);

    // products table
    await safeAddCol(`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg'`);
    await safeAddCol(`ALTER TABLE products ADD COLUMN IF NOT EXISTS harvest_date DATE`);
    await safeAddCol(`ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE`);

    console.log('Safety column migration completed');

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