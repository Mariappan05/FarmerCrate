-- Add delivery_person_id column to orders table
ALTER TABLE orders ADD COLUMN delivery_person_id INTEGER;

-- Optional: Add some test data
-- UPDATE orders SET delivery_person_id = 1 WHERE id = 5;