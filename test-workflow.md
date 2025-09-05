# Order Delivery Workflow Test

## API Endpoints

### 1. Customer Creates Order
**POST** `/api/orders`
```json
{
  "id": 1,
  "quantity": 2,
  "delivery_address": "123 Main St, City",
  "total_amount": 100.00,
  "commission": 10.00,
  "farmer_amount": 90.00,
  "transport_charge": 15.00
}
```

### 2. Transporter Assigns Delivery Person
**PATCH** `/api/orders/1/assign-transport`
```json
{
  "delivery_person_id": 1
}
```

### 3. Delivery Person Completes Order
**PATCH** `/api/orders/1/complete`
```json
{}
```

## Test Data

### Customer Login
**POST** `/api/auth/login`
```json
{
  "email": "customer@test.com",
  "password": "password123"
}
```

### Transporter Login
**POST** `/api/auth/login`
```json
{
  "email": "transporter@test.com",
  "password": "password123"
}
```

### Delivery Person Login
**POST** `/api/auth/login`
```json
{
  "email": "delivery@test.com",
  "password": "password123"
}
```

## Workflow Steps

1. **Customer** creates order → Status: `pending`
2. **Transporter** assigns delivery person → Status: `processing`
3. **Delivery Person** completes delivery → Status: `completed`

## Status Flow
- `pending` → `processing` → `completed`