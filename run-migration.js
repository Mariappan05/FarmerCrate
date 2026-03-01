const { sequelize } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('Running migration...');
    
    await sequelize.query(`
      -- First, check if doc_id exists, if not rename perm_doc_id to doc_id
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='permanent_vehicle_documents' AND column_name='doc_id') THEN
              IF EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='permanent_vehicle_documents' AND column_name='perm_doc_id') THEN
                  ALTER TABLE permanent_vehicle_documents RENAME COLUMN perm_doc_id TO doc_id;
              END IF;
          END IF;
      END $$;

      -- Add all document fields
      ALTER TABLE permanent_vehicle_documents
      ADD COLUMN IF NOT EXISTS rc_book_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS rc_book_issue_date DATE,
      ADD COLUMN IF NOT EXISTS rc_book_expiry_date DATE,
      ADD COLUMN IF NOT EXISTS rc_book_issuing_authority VARCHAR(150),

      ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS insurance_issue_date DATE,
      ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
      ADD COLUMN IF NOT EXISTS insurance_issuing_authority VARCHAR(150),

      ADD COLUMN IF NOT EXISTS fitness_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS fitness_issue_date DATE,
      ADD COLUMN IF NOT EXISTS fitness_expiry_date DATE,
      ADD COLUMN IF NOT EXISTS fitness_issuing_authority VARCHAR(150),
      ADD COLUMN IF NOT EXISTS fitness_url TEXT,

      ADD COLUMN IF NOT EXISTS pollution_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pollution_issue_date DATE,
      ADD COLUMN IF NOT EXISTS pollution_expiry_date DATE,
      ADD COLUMN IF NOT EXISTS pollution_issuing_authority VARCHAR(150),
      ADD COLUMN IF NOT EXISTS pollution_url TEXT,

      ADD COLUMN IF NOT EXISTS road_tax_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS road_tax_issue_date DATE,
      ADD COLUMN IF NOT EXISTS road_tax_expiry_date DATE,
      ADD COLUMN IF NOT EXISTS road_tax_issuing_authority VARCHAR(150),
      ADD COLUMN IF NOT EXISTS road_tax_url TEXT,

      ADD COLUMN IF NOT EXISTS permit_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS permit_issue_date DATE,
      ADD COLUMN IF NOT EXISTS permit_expiry_date DATE,
      ADD COLUMN IF NOT EXISTS permit_issuing_authority VARCHAR(150),

      ADD COLUMN IF NOT EXISTS inspection_report_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS inspection_report_issue_date DATE,
      ADD COLUMN IF NOT EXISTS inspection_report_expiry_date DATE,
      ADD COLUMN IF NOT EXISTS inspection_report_issuing_authority VARCHAR(150),
      ADD COLUMN IF NOT EXISTS inspection_report_url TEXT,

      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
    `);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
