# Updated Test URLs for FarmerCrate API

## Base URL
```
http://localhost:3000
```

## Authentication APIs

### 1. Register Customer
```
POST /api/auth/register
Content-Type: application/json

{
  "role": "customer",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "mobileNumber": "9876543210",
  "address": "123 Main St",
  "zone": "North",
  "state": "Karnataka",
  "district": "Bangalore",
  "age": 30
}
```

### 2. Register Farmer
```
POST /api/auth/register
Content-Type: application/json

{
  "role": "farmer",
  "name": "Farmer John",
  "email": "farmer@example.com",
  "password": "password123",
  "mobileNumber": "9876543211",
  "address": "Farm Address",
  "zone": "Rural",
  "state": "Karnataka",
  "district": "Mysore",
  "age": 35,
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234"
}
```

### 3. Login Customer
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "John Doe",
  "password": "password123"
}
```

### 4. Login Farmer (after admin approval)
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "GLOBAL_FARMER_ID",
  "password": "password123"
}
```

## Order APIs

### 1. Create Order
```
POST /api/orders
Authorization: Bearer <customer_jwt_token>
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2,
  "total_price": 100.00,
  "admin_commission": 10.00,
  "farmer_amount": 85.00,
  "transport_charge": 5.00
}
```

### 2. Get Customer Orders
```
GET /api/orders
Authorization: Bearer <customer_jwt_token>
```

### 3. Get Single Order
```
GET /api/orders/1
Authorization: Bearer <customer_jwt_token>
```

### 4. Get All Orders (Admin)
```
GET /api/orders/all
Authorization: Bearer <admin_jwt_token>
```

## Key Changes Made

### Database Structure Updates:
- **farmers**: `farmer_id` as primary key, `global_farmer_id` for login
- **customer_users**: `customer_id` as primary key, `name` field (not `customer_name`)
- **transporters**: `transporter_id` as primary key
- **admin_users**: `admin_id` as primary key
- **delivery_persons**: `delivery_person_id` as primary key
- **products**: `product_id` as primary key, `current_price` field
- **orders**: `order_id` as primary key, updated with all transport fields
- **transactions**: `transaction_id` as primary key

### Authentication Updates:
- JWT tokens now include correct ID fields (`farmer_id`, `customer_id`, etc.)
- Login uses appropriate username fields for each role
- Middleware updated to handle new primary key structure

### Model Updates:
- All models updated to match exact table structure
- Foreign key references corrected
- Field names standardized across all models

### Controller Updates:
- Order controller uses new field names
- Auth controller handles new primary keys
- All associations updated in associations.js

The system now fully matches your PostgreSQL table structure.