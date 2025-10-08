-- Add missing columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Update existing records to have valid user_type and user_id
UPDATE transactions 
SET user_type = 'farmer', user_id = farmer_id 
WHERE farmer_id IS NOT NULL AND user_type IS NULL;

UPDATE transactions 
SET user_type = 'customer', user_id = customer_id 
WHERE customer_id IS NOT NULL AND user_type IS NULL;

UPDATE transactions 
SET user_type = 'transporter', user_id = transporter_id 
WHERE transporter_id IS NOT NULL AND user_type IS NULL;