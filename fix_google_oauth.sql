-- Fix mobile_number constraint for Google OAuth
ALTER TABLE customer_users ALTER COLUMN mobile_number DROP NOT NULL;
ALTER TABLE farmers ALTER COLUMN mobile_number DROP NOT NULL;
ALTER TABLE transporters ALTER COLUMN mobile_number DROP NOT NULL;

-- Verify changes
SELECT table_name, column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('customer_users', 'farmers', 'transporters') 
AND column_name = 'mobile_number';
