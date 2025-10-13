const { sequelize } = require('./src/config/database');

async function removeImagesColumn() {
  try {
    await sequelize.query(`
      ALTER TABLE products DROP COLUMN IF EXISTS images;
    `);
    
    console.log('Images column removed from products table successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error removing images column:', error);
    process.exit(1);
  }
}

removeImagesColumn();