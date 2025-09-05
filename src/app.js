const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const { initializeDatabase, sequelize } = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
// const vaultRoutes = require('./routes/vault.routes');
const cartRoutes = require('./routes/cart.routes');
const adminRoutes = require('./routes/admin.routes');
const farmerRoutes = require('./routes/farmer.routes');
const customerRoutes = require('./routes/customer.routes');
const transporterRoutes = require('./routes/transporter.routes');
const deliveryPersonRoutes = require('./routes/deliveryPerson.routes');
const wishlistRoutes = require('./routes/wishlist.routes');

// No need to import models here; they are imported in initializeDatabase

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
// app.use('/api/vault', vaultRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transporters', transporterRoutes);
app.use('/api/delivery-person', deliveryPersonRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Try to initialize database, but continue even if it fails
    try {
      await initializeDatabase();
      require('./models/associations');
      console.log('Database initialized successfully');
    } catch (dbError) {
      console.log('Database initialization failed, but server will continue:', dbError.message);
    }

    const PORT = process.env.PORT || 3000;
    
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Available routes:');
      console.log('- PUT /api/delivery-person/complete-order');
      console.log('- GET /api/delivery-person/orders');
      console.log('- GET /api/delivery-person/profile');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy, trying ${PORT + 1}`);
        server.close();
        app.listen(PORT + 1, () => {
          console.log(`Server is running on port ${PORT + 1}`);
        });
      }
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;