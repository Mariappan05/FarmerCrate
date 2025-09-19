# Order Controller Postman Test Data

Base URL: `http://localhost:3000`

## 1. Create Order
**Method:** POST  
**URL:** `http://localhost:3000/api/orders`  
**Headers:**
```
Authorization: Bearer YOUR_CONSUMER_JWT_TOKEN
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "id": 1,
  "quantity": 2,
  "delivery_address": "123 Main St, City, State 12345",
  "total_amount": 100.00,
  "commission": 10.00,
  "farmer_amount": 85.00,
  "transport_charge": 5.00
}
```

## 2. Get Orders
**Method:** GET  
**URL:** `http://localhost:3000/api/orders`  
**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 3. Get Single Order
**Method:** GET  
**URL:** `http://localhost:3000/api/orders/1`  
**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 4. Update Order Status
**Method:** PUT  
**URL:** `http://localhost:3000/api/orders/1/status`  
**Headers:**
```
Authorization: Bearer YOUR_FARMER_JWT_TOKEN
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "status": "processing"
}
```

## 5. Assign Transport
**Method:** PUT  
**URL:** `http://localhost:3000/api/orders/1/assign-transport`  
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "delivery_person_id": 1
}
```

## 6. Complete Delivery
**Method:** PUT  
**URL:** `http://localhost:3000/api/orders/1/complete`  
**Headers:**
```
Authorization: Bearer YOUR_TRANSPORTER_JWT_TOKEN
```

## 7. Get All Orders (Admin)
**Method:** GET  
**URL:** `http://localhost:3000/api/orders/all`  
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

## Test Data Notes:
- Replace `YOUR_JWT_TOKEN` with actual JWT tokens from login
- Replace `1` in URLs with actual order/product IDs
- Ensure you have products and users in database before testing
- Status values: "processing", "completed", "cancelled"