const { sequelize } = require('./src/config/database');

async function createNotificationsTable() {
  try {
    console.log('Creating notifications table...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('farmer', 'customer', 'transporter', 'admin')),
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('order', 'payment', 'delivery', 'system', 'promotion')),
        is_read BOOLEAN DEFAULT false,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
        action_url VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✅ Notifications table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Table creation failed:', error.message);
    process.exit(1);
  }
}

createNotificationsTable();
