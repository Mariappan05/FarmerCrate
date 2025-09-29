# Controllers Updated for New Table Structure

All controllers have been updated to match your exact PostgreSQL table structure.

## Updated Controllers

### 1. farmer.controller.js
- Uses `farmer_id` as primary key
- Updated field references for farmers table
- Removed deprecated fields

### 2. customer.controller.js  
- Uses `customer_id` as primary key
- Updated field references for customer_users table
- Uses `name` field instead of `customer_name`

### 3. product.controller.js
- Uses `product_id` as primary key
- Uses `current_price` instead of `price`
- Updated farmer association references

### 4. cart.controller.js
- Uses `cart_id` as primary key
- Uses `customer_id` and `product_id` foreign keys
- Updated associations and field references

### 5. wishlist.controller.js
- Uses `wishlist_id` as primary key
- Uses `customer_id` and `product_id` foreign keys
- Updated for customer authentication

### 6. transporter.controller.js
- Uses `transporter_id` as primary key
- Updated field references for transporters table
- Updated delivery person creation

### 7. deliveryPerson.controller.js
- Uses `delivery_person_id` as primary key
- Updated field references for delivery_persons table
- Updated order status to use `current_status`

### 8. admin.controller.js
- Uses `admin_id` as primary key
- Updated farmer verification to use `is_verified_by_gov`
- Uses `global_farmer_id` for farmer login codes
- Updated transporter approval process

### 9. auth.controller.js (Previously Updated)
- Updated login logic for all user types
- Uses correct primary key fields in JWT tokens
- Updated field references throughout

### 10. order.controller.js (Previously Updated)
- Uses `order_id` as primary key
- Uses `customer_id` and `product_id` foreign keys
- Updated field references

## Key Field Changes Applied

### Primary Keys:
- `farmer_id` (farmers table)
- `customer_id` (customer_users table)
- `transporter_id` (transporters table)
- `admin_id` (admin_users table)
- `delivery_person_id` (delivery_persons table)
- `product_id` (products table)
- `order_id` (orders table)
- `cart_id` (carts table)
- `wishlist_id` (wishlists table)

### Field Name Changes:
- `current_price` instead of `price` (products)
- `name` instead of `customer_name` (customer_users)
- `is_verified_by_gov` instead of `verified_status` (farmers)
- `global_farmer_id` for farmer login (farmers)
- `current_status` for order status (orders)

### Authentication Updates:
- JWT tokens use correct ID fields
- Middleware updated for new primary keys
- Login logic uses appropriate username fields

## Routes Updated

### product.routes.js
- Validation uses `current_price`
- Removed image validation (not in table)

### cart.routes.js  
- Validation uses `product_id`
- Route parameters updated

### order.routes.js (Previously Updated)
- Validation uses new field names

## Test URLs Still Valid
All test URLs in `UPDATED_TEST_URLS.md` remain valid with the controller updates.

## Database Compatibility
All controllers now fully match your PostgreSQL table structure with:
- Correct primary key usage
- Proper foreign key references  
- Accurate field names
- Updated associations