-- Add transport_charge column to orders table
ALTER TABLE orders ADD COLUMN transport_charge DECIMAL(10,2) DEFAULT 0.00;

-- Update existing orders to have a default transport charge of 50.00
UPDATE orders SET transport_charge = 50.00 WHERE transport_charge IS NULL;