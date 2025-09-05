-- Fix delivery person foreign key constraint issue

-- First, drop the existing foreign key constraint
ALTER TABLE delivery_persons DROP CONSTRAINT IF EXISTS delivery_persons_user_id_fkey;

-- Delete delivery persons with invalid user_id references
DELETE FROM delivery_persons 
WHERE user_id NOT IN (SELECT transporter_id FROM transporter_users);

-- Recreate the foreign key constraint
ALTER TABLE delivery_persons 
ADD CONSTRAINT delivery_persons_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES transporter_users(transporter_id) ON DELETE CASCADE;