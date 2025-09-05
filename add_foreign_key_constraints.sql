-- Add foreign key constraints with CASCADE delete to all tables

-- Orders table
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_farmer 
FOREIGN KEY (farmer_id) REFERENCES farmer_users(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_consumer 
FOREIGN KEY (consumer_id) REFERENCES customer_users(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_delivery_person 
FOREIGN KEY (delivery_person_id) REFERENCES delivery_persons(id) ON DELETE SET NULL;

-- Products table
ALTER TABLE products 
ADD CONSTRAINT fk_products_farmer 
FOREIGN KEY (farmer_id) REFERENCES farmer_users(id) ON DELETE CASCADE;

-- Transactions table
ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_farmer 
FOREIGN KEY (farmer_id) REFERENCES farmer_users(id) ON DELETE CASCADE;

ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_order 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Cart table (assuming table name is 'carts')
ALTER TABLE carts 
ADD CONSTRAINT fk_cart_customer 
FOREIGN KEY ("customerId") REFERENCES customer_users(id) ON DELETE CASCADE;

ALTER TABLE carts 
ADD CONSTRAINT fk_cart_product 
FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE;

-- Delivery persons table
ALTER TABLE delivery_persons 
ADD CONSTRAINT fk_delivery_person_transporter 
FOREIGN KEY (user_id) REFERENCES transporter_users(transporter_id) ON DELETE CASCADE;