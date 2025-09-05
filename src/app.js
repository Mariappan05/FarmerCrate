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

// No need to import models here; they are imported in initializeDatabase

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.log('Warning: Database initialization had issues, but server will continue to start');
    }

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    // app.use('/api/vault', vaultRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/farmer', farmerRoutes);
    app.use('/api/customer', customerRoutes);
    app.use('/api/transporter', transporterRoutes);
    app.use('/api/delivery-person', deliveryPersonRoutes);

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
    
    // Try to start server on specified port, if fails try next port
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy, trying ${PORT + 1}`);
        server.close();
        app.listen(PORT + 1, () => {
          console.log(`Server is running on port ${PORT + 1}`);
        });
      } else {
        console.error('Failed to start server:', err);
      }
    });

    // After sequelize is initialized, require associations
    require('./models/associations');

  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();

module.exports = app; 