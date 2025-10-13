const { sequelize } = require('./src/config/database');

async function createProductImagesTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        image_id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
      );
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_id ON product_images(product_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_is_primary ON product_images(is_primary);
    `);
    
    console.log('Product images table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating product images table:', error);
    process.exit(1);
  }
}

createProductImagesTable();