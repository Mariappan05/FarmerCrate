# Routes Updated for Model Structure

All routes have been updated to match your exact model structure and controller implementations.

## Updated Routes:

### 1. auth.routes.js ✅
- Updated farmer login to use `global_farmer_id` instead of `unique_id`
- Proper validation for all authentication endpoints

### 2. admin.routes.js ✅
- Simplified to match updated admin controller
- Uses proper middleware authentication
- Farmer approval with `verification_notes`
- Transporter approval with `approval_notes`

### 3. farmer.routes.js ✅
- Uses `protect` and `authorize('farmer')` middleware
- Simplified validation matching model fields
- Removed unused endpoints

### 4. customer.routes.js ✅
- Uses `protect` and `authorize('customer')` middleware
- Proper field validation for customer updates

### 5. product.routes.js ✅ (Previously Updated)
- Uses `current_price` validation
- Proper authentication and authorization

### 6. order.routes.js ✅ (Previously Updated)
- Uses correct field names for validation
- Proper customer authorization

### 7. cart.routes.js ✅ (Previously Updated)
- Uses `product_id` validation
- Correct route parameters

### 8. transporter.routes.js ✅
- Added proper authorization middleware
- Uses `authorize('transporter')` for protected routes

### 9. deliveryPerson.routes.js ✅
- Added proper authorization middleware
- Uses `authorize('delivery')` for protected routes

### 10. wishlist.routes.js ✅
- Added authentication and authorization
- Uses `product_id` validation
- Customer-only access

## Key Route Updates:

### Authentication:
- All protected routes use `protect` middleware
- Role-based routes use `authorize(role)` middleware
- Proper validation for all input fields

### Field Names:
- `global_farmer_id` for farmer login
- `product_id` for product references
- `current_price` for product pricing
- Correct primary key references

### Authorization:
- `farmer` role for farmer routes
- `customer` role for customer routes
- `transporter` role for transporter routes
- `delivery` role for delivery person routes
- `admin` role for admin routes

### Validation:
- All routes use proper express-validator
- Field validation matches model structure
- Required fields properly validated

## Routes Now Match Models ✅
All routes are now fully aligned with your model structure and controller implementations!