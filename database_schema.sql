-- FarmerCrate Database Schema

-- 1. Farmer Users Table
CREATE TABLE farmer_users (
    id SERIAL PRIMARY KEY,
    unique_id VARCHAR(6),
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255),
    zone VARCHAR(255),
    state VARCHAR(255),
    district VARCHAR(255),
    verified_status BOOLEAN DEFAULT FALSE,
    password VARCHAR(255) NOT NULL,
    age INTEGER,
    account_number VARCHAR(255),
    ifsc_code VARCHAR(255),
    image_url VARCHAR(255),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    code_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customer Users Table
CREATE TABLE customer_users (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255),
    zone VARCHAR(255),
    state VARCHAR(255),
    district VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    age INTEGER,
    image_url VARCHAR(255),
    first_login_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transporter Users Table
CREATE TABLE transporter_users (
    transporter_id SERIAL PRIMARY KEY,
    unique_id VARCHAR(6),
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255),
    zone VARCHAR(255),
    state VARCHAR(255),
    district VARCHAR(255),
    verified_status BOOLEAN DEFAULT FALSE,
    password VARCHAR(255) NOT NULL,
    age INTEGER,
    image_url VARCHAR(255),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Admin Users Table
CREATE TABLE admin_users (
    admin_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(255),
    role VARCHAR(255) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Delivery Persons Table
CREATE TABLE delivery_persons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    license_url VARCHAR(255),
    vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('bike', 'auto', 'van', 'truck')) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    rating DECIMAL(4, 2) DEFAULT 0.00,
    total_deliveries INTEGER DEFAULT 0,
    first_login_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    images VARCHAR(255),
    category VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('available', 'sold_out', 'hidden')) DEFAULT 'available',
    last_price_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    views INTEGER DEFAULT 0,
    harvest_date VARCHAR(255),
    expiry_date VARCHAR(255),
    farmer_id INTEGER NOT NULL REFERENCES farmer_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    commission DECIMAL(10, 2) NOT NULL,
    farmer_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')) DEFAULT 'pending',
    delivery_address TEXT NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    farmer_id INTEGER NOT NULL REFERENCES farmer_users(id) ON DELETE CASCADE,
    consumer_id INTEGER NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    delivery_person_id INTEGER REFERENCES delivery_persons(id) ON DELETE SET NULL,
    transport_charge DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Transactions Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER NOT NULL REFERENCES farmer_users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Cart Table
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Wishlist Table
CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_farmer_users_email ON farmer_users(email);
CREATE INDEX idx_farmer_users_unique_id ON farmer_users(unique_id);
CREATE INDEX idx_customer_users_email ON customer_users(email);
CREATE INDEX idx_products_farmer_id ON products(farmer_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_farmer_id ON orders(farmer_id);
CREATE INDEX idx_orders_consumer_id ON orders(consumer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_transactions_farmer_id ON transactions(farmer_id);
CREATE INDEX idx_cart_customer_id ON carts(customer_id);
CREATE INDEX idx_wishlist_customer_id ON wishlists(customer_id);