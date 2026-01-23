-- Drop All Tables from FarmerCrate Database
-- WARNING: This will delete ALL data permanently!
-- Run this in Neon DB SQL Editor

DROP TABLE IF EXISTS delivery_tracking CASCADE;
DROP TABLE IF EXISTS farmer_verification_history CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_price_history CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS permanent_vehicle_documents CASCADE;
DROP TABLE IF EXISTS temporary_vehicles CASCADE;
DROP TABLE IF EXISTS permanent_vehicles CASCADE;
DROP TABLE IF EXISTS delivery_persons CASCADE;
DROP TABLE IF EXISTS transporters CASCADE;
DROP TABLE IF EXISTS customer_users CASCADE;
DROP TABLE IF EXISTS farmers CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

SELECT 'All tables dropped successfully!' AS status;
