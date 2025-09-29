-- Remove old location columns and add new current_location column
ALTER TABLE delivery_persons 
DROP COLUMN IF EXISTS current_location_lat,
DROP COLUMN IF EXISTS current_location_lng,
ADD COLUMN current_location VARCHAR(255);