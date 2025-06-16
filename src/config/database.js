const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Use the Railway public MySQL URL
const sequelize = new Sequelize('mysql://root:nPBcINVORdTwsJSHmjyeLCctECcwPgwV@interchange.proxy.rlwy.net:41805/railway', {
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = sequelize; 