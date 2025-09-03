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
const vaultRoutes = require('./routes/vault.routes');
const cartRoutes = require('./routes/cart.routes');
const adminRoutes = require('./routes/admin.routes');
const farmerRoutes = require('./routes/farmer.routes');
const customerRoutes = require('./routes/customer.routes');
const transporterRoutes = require('./routes/transporter.routes');
const wishlistRoutes = require('./routes/wishlist.routes');

// No need to import models here; they are imported in initializeDatabase

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transporters', transporterRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Initialize database and start server
const startServer = async () => {
  try {
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.log('Warning: Database initialization had issues, but server will continue to start');
    }

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/vault', vaultRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/farmer', farmerRoutes);
    app.use('/api/customer', customerRoutes);
    app.use('/api/transporter', transporterRoutes);
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

    const PORT = process.env.PORT || 3000;
    
    // Kill any existing process on the port
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log('Port is busy, trying to close existing connection...');
        require('child_process').exec(`npx kill-port ${PORT}`, (error) => {
          if (!error) {
            server.listen(PORT);
          } else {
            console.error('Could not free up port:', error);
          }
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