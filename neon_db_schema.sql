-- FarmerCrate Database Schema for Neon DB
-- Run this script in your Neon DB console to sync the schema

-- Drop existing tables if needed (uncomment if you want to recreate)
-- DROP TABLE IF EXISTS delivery_tracking CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS cart CASCADE;
-- DROP TABLE IF EXISTS wishlist CASCADE;
-- DROP TABLE IF EXISTS product_images CASCADE;
-- DROP TABLE IF EXISTS product_price_history CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS permanent_vehicle_documents CASCADE;
-- DROP TABLE IF EXISTS permanent_vehicles CASCADE;
-- DROP TABLE IF EXISTS temporary_vehicles CASCADE;
-- DROP TABLE IF EXISTS delivery_persons CASCADE;
-- DROP TABLE IF EXISTS farmer_verification_history CASCADE;
-- DROP TABLE IF EXISTS farmers CASCADE;
-- DROP TABLE IF EXISTS customer_users CASCADE;
-- DROP TABLE IF EXISTS transporters CASCADE;
-- DROP TABLE IF EXISTS admin_users CASCADE;

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    admin_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farmers Table
CREATE TABLE IF NOT EXISTS farmers (
    farmer_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT,
    zone VARCHAR(100),
    state VARCHAR(100),
    district VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    age INTEGER,
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    image_url TEXT,
    is_verified_by_gov BOOLEAN DEFAULT false,
    verification_request_sent TIMESTAMP,
    verification_completed_at TIMESTAMP,
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Users Table
CREATE TABLE IF NOT EXISTS customer_users (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT,
    zone VARCHAR(100),
    state VARCHAR(100),
    district VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    age INTEGER,
    image_url TEXT,
    first_login_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transporters Table
CREATE TABLE IF NOT EXISTS transporters (
    transporter_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER,
    address TEXT,
    zone VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    image_url TEXT,
    aadhar_url TEXT,
    pan_url TEXT,
    voter_id_url TEXT,
    license_url TEXT,
    aadhar_number VARCHAR(20),
    pan_number VARCHAR(20),
    pincode VARCHAR(10),
    voter_id_number VARCHAR(50),
    license_number VARCHAR(50),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    verified_status VARCHAR(50) DEFAULT 'pending',
    unique_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Persons Table
CREATE TABLE IF NOT EXISTS delivery_persons (
    delivery_person_id SERIAL PRIMARY KEY,
    transporter_id INTEGER REFERENCES transporters(transporter_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(50),
    license_number VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    first_login_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'available',
    last_price_update TIMESTAMP,
    views INTEGER DEFAULT 0,
    harvest_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
    image_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Price History Table
CREATE TABLE IF NOT EXISTS product_price_history (
    history_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permanent Vehicles Table
CREATE TABLE IF NOT EXISTS permanent_vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    transporter_id INTEGER REFERENCES transporters(transporter_id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    capacity DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permanent Vehicle Documents Table
CREATE TABLE IF NOT EXISTS permanent_vehicle_documents (
    document_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES permanent_vehicles(vehicle_id) ON DELETE CASCADE,
    rc_book_url TEXT,
    insurance_url TEXT,
    pollution_certificate_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Temporary Vehicles Table
CREATE TABLE IF NOT EXISTS temporary_vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    transporter_id INTEGER REFERENCES transporters(transporter_id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    capacity DECIMAL(10, 2),
    rental_start_date DATE,
    rental_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customer_users(customer_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    source_transporter_id INTEGER REFERENCES transporters(transporter_id) ON DELETE SET NULL,
    destination_transporter_id INTEGER REFERENCES transporters(transporter_id) ON DELETE SET NULL,
    delivery_person_id INTEGER REFERENCES delivery_persons(delivery_person_id) ON DELETE SET NULL,
    permanent_vehicle_id INTEGER REFERENCES permanent_vehicles(vehicle_id) ON DELETE SET NULL,
    temp_vehicle_id INTEGER REFERENCES temporary_vehicles(vehicle_id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    farmer_amount DECIMAL(10, 2) NOT NULL,
    admin_commission DECIMAL(10, 2) NOT NULL,
    transport_charge DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    current_status VARCHAR(50) DEFAULT 'PENDING',
    qr_code TEXT,
    bill_url TEXT,
    pickup_address TEXT,
    delivery_address TEXT,
    estimated_distance DECIMAL(8, 2),
    estimated_delivery_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart Table
CREATE TABLE IF NOT EXISTS cart (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customer_users(customer_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist Table
CREATE TABLE IF NOT EXISTS wishlist (
    wishlist_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customer_users(customer_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    user_type VARCHAR(50),
    user_id INTEGER,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50),
    status VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_type VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Tracking Table
CREATE TABLE IF NOT EXISTS delivery_tracking (
    tracking_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    location_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farmer Verification History Table
CREATE TABLE IF NOT EXISTS farmer_verification_history (
    history_id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    verification_status VARCHAR(50),
    verified_by INTEGER REFERENCES admin_users(admin_id) ON DELETE SET NULL,
    verification_notes TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_products_farmer ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(current_status);
CREATE INDEX IF NOT EXISTS idx_cart_customer ON cart(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order ON delivery_tracking(order_id);

-- Insert Default Admin User
INSERT INTO admin_users (name, email, password, mobile_number, role, is_active)
VALUES ('System Admin', 'admin@farmercrate.com', 'admin123', '+919876543210', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- Success Message
SELECT 'Database schema created successfully!' AS status;
