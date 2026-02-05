-- Fix mobile_number constraint for Google OAuth
ALTER TABLE customer_users ALTER COLUMN mobile_number DROP NOT NULL;
ALTER TABLE farmers ALTER COLUMN mobile_number DROP NOT NULL;
ALTER TABLE transporters ALTER COLUMN mobile_number DROP NOT NULL;
