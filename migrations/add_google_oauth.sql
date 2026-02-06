-- Google OAuth Migration Script
-- Add google_id columns and indexes to support Google Sign-In

-- Add google_id column to customer_users table
ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Add google_id column to farmers table
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Add google_id column to transporters table
ALTER TABLE transporters ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_users_google_id ON customer_users(google_id);
CREATE INDEX IF NOT EXISTS idx_farmers_google_id ON farmers(google_id);
CREATE INDEX IF NOT EXISTS idx_transporters_google_id ON transporters(google_id);

-- Verify changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('customer_users', 'farmers', 'transporters') 
AND column_name = 'google_id';
