-- Update orders table to match the model
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS source_transporter_id INTEGER,
ADD COLUMN IF NOT EXISTS destination_transporter_id INTEGER,
ADD COLUMN IF NOT EXISTS delivery_person_id INTEGER,
ADD COLUMN IF NOT EXISTS permanent_vehicle_id INTEGER,
ADD COLUMN IF NOT EXISTS temp_vehicle_id INTEGER,
ADD COLUMN IF NOT EXISTS farmer_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS admin_commission DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS transport_charge DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS estimated_distance DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMP;

-- Add foreign key constraints
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_source_transporter 
FOREIGN KEY (source_transporter_id) REFERENCES transporter_users(transporter_id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_destination_transporter 
FOREIGN KEY (destination_transporter_id) REFERENCES transporter_users(transporter_id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_delivery_person 
FOREIGN KEY (delivery_person_id) REFERENCES delivery_persons(delivery_person_id) ON DELETE SET NULL;

-- Update existing orders with default values
UPDATE orders 
SET farmer_amount = COALESCE(farmer_amount, total_amount * 0.9),
    admin_commission = COALESCE(admin_commission, total_amount * 0.1),
    transport_charge = COALESCE(transport_charge, 0.00),
    payment_status = COALESCE(payment_status, 'pending')
WHERE farmer_amount IS NULL OR admin_commission IS NULL;