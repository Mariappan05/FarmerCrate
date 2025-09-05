-- Add delivery_person_id column to orders table
ALTER TABLE orders ADD COLUMN delivery_person_id INTEGER;

-- Add foreign key constraint (optional)
-- ALTER TABLE orders ADD CONSTRAINT fk_orders_delivery_person 
-- FOREIGN KEY (delivery_person_id) REFERENCES delivery_persons(id);