# Admin User CASCADE Delete Functions - Test Data & API Documentation

## Overview
This document provides comprehensive test data and API documentation for admin user CASCADE delete functionality. The delete operations are implemented as **CASCADE deletes** that permanently remove users and all their related data from the database.

⚠️ **WARNING: CASCADE DELETE OPERATIONS ARE PERMANENT AND IRREVERSIBLE**

## Base URL
```
http://localhost:3000/api/admin
```

## Authentication Required
All admin endpoints require authentication with admin JWT token:
```http
Authorization: Bearer <admin_jwt_token>
```

---

## CASCADE Delete Behavior

### What Gets Deleted with Each User Type:

#### 🌾 **Farmer Deletion** → Cascades to:
- ✅ All farmer's **Products** 
- ✅ All **Orders** related to farmer's products
- ✅ All **Cart items** containing farmer's products  
- ✅ All **Wishlist items** for farmer's products
- ✅ All farmer's **Transactions**

#### 🛒 **Customer Deletion** → Cascades to:
- ✅ All customer's **Orders**
- ✅ All customer's **Cart items**
- ✅ All customer's **Wishlist items**

#### 🚛 **Transporter Deletion** → Cascades to:
- ✅ All transporter's **Delivery Persons**
- ✅ All transporter's **Permanent Vehicles** (and their documents)
- ✅ All transporter's **Temporary Vehicles** (and their documents)
- ⚠️ Orders assigned to delivery persons get `delivery_person_id = NULL`

#### 🏍️ **Delivery Person Deletion** → Cascades to:
- ⚠️ Orders get `delivery_person_id = NULL` (orders preserved)

---

## Delete Endpoints

### 1. Delete Farmer User (CASCADE)

**Endpoint:**
```http
DELETE /api/admin/farmers/{farmerId}
Authorization: Bearer <admin_token>
```

**Test Case - Success:**
```http
DELETE /api/admin/farmers/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Farmer and all related data deleted successfully (CASCADE)",
  "data": {
    "farmer_id": 1,
    "name": "Ravi Kumar",
    "email": "ravi.farmer@example.com",
    "products_count": 5,
    "orders_count": 12,
    "transactions_count": 3,
    "deleted_at": "2024-09-20T12:30:00.000Z",
    "deleted_by": 1,
    "cascade_info": {
      "products_deleted": 5,
      "orders_deleted": 12,
      "transactions_deleted": 3,
      "note": "All related cart items, wishlists, and product orders were also deleted"
    }
  }
}
```

### 2. Delete Customer User (CASCADE)

**Endpoint:**
```http
DELETE /api/admin/customers/{customerId}
Authorization: Bearer <admin_token>
```

**Test Case - Success:**
```http
DELETE /api/admin/customers/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer and all related data deleted successfully (CASCADE)",
  "data": {
    "customer_id": 1,
    "name": "Priya Sharma",
    "email": "priya.customer@example.com",
    "orders_count": 8,
    "cart_items_count": 3,
    "wishlist_count": 15,
    "deleted_at": "2024-09-20T12:35:00.000Z",
    "deleted_by": 1,
    "cascade_info": {
      "orders_deleted": 8,
      "cart_items_deleted": 3,
      "wishlist_items_deleted": 15,
      "note": "All customer orders, cart items, and wishlist items were automatically deleted"
    }
  }
}
```

### 3. Delete Transporter User (CASCADE)

**Endpoint:**
```http
DELETE /api/admin/transporters/{transporterId}
Authorization: Bearer <admin_token>
```

**Test Case - Success:**
```http
DELETE /api/admin/transporters/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Transporter and all related data deleted successfully (CASCADE)",
  "data": {
    "transporter_id": 1,
    "name": "Raj Transport Solutions",
    "email": "raj.transport@example.com",
    "delivery_persons_count": 4,
    "permanent_vehicles_count": 3,
    "temporary_vehicles_count": 2,
    "deleted_at": "2024-09-20T12:40:00.000Z",
    "deleted_by": 1,
    "cascade_info": {
      "delivery_persons_deleted": 4,
      "permanent_vehicles_deleted": 3,
      "temporary_vehicles_deleted": 2,
      "note": "All delivery persons, vehicles, and vehicle documents were automatically deleted"
    }
  }
}
```

### 4. Delete Delivery Person User (CASCADE)

**Endpoint:**
```http
DELETE /api/admin/delivery-persons/{deliveryPersonId}
Authorization: Bearer <admin_token>
```

**Test Case - Success:**
```http
DELETE /api/admin/delivery-persons/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Delivery person deleted successfully (CASCADE)",
  "data": {
    "delivery_person_id": 1,
    "name": "Suresh Kumar",
    "mobile_number": "9876543210",
    "license_number": "KA1234567890",
    "vehicle_type": "bike",
    "orders_count": 25,
    "rating": 4.5,
    "total_deliveries": 150,
    "deleted_at": "2024-09-20T12:45:00.000Z",
    "deleted_by": 1,
    "cascade_info": {
      "orders_affected": 25,
      "note": "Orders delivery_person_id field was set to NULL (orders preserved)"
    }
  }
}
```

### 5. Delete User by Role (Generic CASCADE)

**Endpoint:**
```http
DELETE /api/admin/users/{role}/{userId}
Authorization: Bearer <admin_token>
```

**Supported Roles:** `farmer`, `customer`, `transporter`, `delivery_person`

---

## Error Test Cases

### 1. User Not Found
**Request:**
```http
DELETE /api/admin/farmers/99999
Authorization: Bearer <admin_token>
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Farmer not found"
}
```

### 2. Invalid User ID
**Request:**
```http
DELETE /api/admin/farmers/abc
Authorization: Bearer <admin_token>
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Valid farmer ID is required"
}
```

### 3. Invalid Role (Generic Route)
**Request:**
```http
DELETE /api/admin/users/invalid_role/1
Authorization: Bearer <admin_token>
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid role. Supported roles: farmer, customer, transporter, delivery_person"
}
```

### 4. Unauthorized Access
**Request:**
```http
DELETE /api/admin/farmers/1
Authorization: Bearer invalid_token
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Access denied. Invalid or expired token."
}
```

---

## ⚠️ CASCADE Delete Impact Analysis

### Before Deleting - Data Dependencies Check

#### Farmer Impact:
```bash
# Check farmer's products and related data
curl -X GET "http://localhost:3000/api/admin/users/farmer/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check products by farmer
curl -X GET "http://localhost:3000/api/products?farmer_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Customer Impact:
```bash
# Check customer's orders and cart
curl -X GET "http://localhost:3000/api/admin/users/customer/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check customer orders
curl -X GET "http://localhost:3000/api/orders/customer/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Transporter Impact:
```bash
# Check transporter's vehicles and delivery persons
curl -X GET "http://localhost:3000/api/vehicles" \
  -H "Authorization: Bearer TRANSPORTER_TOKEN"

curl -X GET "http://localhost:3000/api/delivery-persons" \
  -H "Authorization: Bearer TRANSPORTER_TOKEN"
```

---

## Test Data Setup for CASCADE Testing

### Create Rich Test Data (with dependencies)

#### 1. Create Farmer with Products
```http
POST /api/auth/register/farmer
{
  "name": "Ravi Kumar",
  "email": "ravi.farmer@example.com",
  "mobile_number": "9876543210",
  "password": "FarmerPass123!",
  "address": "Village Kumta, Karnataka"
}

# Then create products for this farmer
POST /api/products
{
  "name": "Organic Tomatoes",
  "price": 50.00,
  "quantity": 100,
  "farmer_id": 1
}
```

#### 2. Create Customer with Orders and Cart
```http
POST /api/auth/register/customer
{
  "customer_name": "Priya Sharma", 
  "email": "priya.customer@example.com",
  "mobile_number": "9876543212",
  "password": "CustomerPass123!"
}

# Add items to cart
POST /api/cart
{
  "customerId": 1,
  "productId": 1,
  "quantity": 5
}

# Create orders
POST /api/orders
{
  "consumer_id": 1,
  "farmer_id": 1,
  "product_id": 1,
  "quantity": 3
}
```

#### 3. Create Transporter with Vehicles
```http
POST /api/auth/register/transporter
{
  "name": "Raj Transport Solutions",
  "email": "raj.transport@example.com",
  "mobile_number": "9876543214",
  "password": "TransportPass123!"
}

# Add vehicles
POST /api/vehicles/permanent
{
  "vehicle_number": "KA01AB1234",
  "vehicle_type": "truck",
  "capacity_kg": 5000.00,
  "make": "Tata"
  // ... include all required documents
}
```

---

## CASCADE Delete Commands

### Delete Operations with Full CASCADE

#### Delete Farmer (and all products, orders, transactions)
```bash
curl -X DELETE "http://localhost:3000/api/admin/farmers/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Delete Customer (and all orders, cart, wishlist)
```bash
curl -X DELETE "http://localhost:3000/api/admin/customers/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Delete Transporter (and all vehicles, delivery persons)
```bash
curl -X DELETE "http://localhost:3000/api/admin/transporters/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Delete Delivery Person (orders preserved with NULL delivery_person_id)
```bash
curl -X DELETE "http://localhost:3000/api/admin/delivery-persons/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Verification After CASCADE Delete

### Verify Complete Deletion

#### Check Farmer Deletion Impact:
```bash
# These should return empty or "not found"
curl -X GET "http://localhost:3000/api/products?farmer_id=1"
curl -X GET "http://localhost:3000/api/admin/users/farmer/1"
```

#### Check Customer Deletion Impact:
```bash
# These should return empty or "not found"
curl -X GET "http://localhost:3000/api/orders/customer/1"
curl -X GET "http://localhost:3000/api/cart/customer/1"
```

#### Check Transporter Deletion Impact:
```bash
# These should return empty or "not found"
curl -X GET "http://localhost:3000/api/vehicles" # (with deleted transporter token - should fail)
curl -X GET "http://localhost:3000/api/delivery-persons" # (should be empty)
```

---

## ⚠️ Production Safety Guidelines

### Pre-Delete Checklist:
1. **Backup Database** before any CASCADE delete operations
2. **Verify User ID** is correct before deletion
3. **Check Dependencies** - review what will be deleted
4. **Confirm with Stakeholders** for high-impact deletions
5. **Test on Staging** environment first

### Recovery Options:
- **Database Restore** from backup (only option for CASCADE delete)
- **Data Export** before deletion for potential reconstruction
- **Audit Logs** to track what was deleted and when

### Recommended Workflow:
```bash
# 1. Backup
pg_dump farmercrate_db > backup_before_delete_$(date +%Y%m%d_%H%M%S).sql

# 2. Analyze impact
curl -X GET "/api/admin/users/farmer/1" -H "Authorization: Bearer TOKEN"

# 3. Confirm deletion
curl -X DELETE "/api/admin/farmers/1" -H "Authorization: Bearer TOKEN"

# 4. Verify deletion
curl -X GET "/api/admin/users/farmer/1" -H "Authorization: Bearer TOKEN"  # Should return 404
```

---

## Testing Workflow

1. **Setup Phase:**
   - Register admin and get token
   - Create test users with rich relational data
   - Verify relationships are established

2. **Impact Analysis:**
   - Check what data will be deleted for each user type
   - Document dependencies before deletion

3. **CASCADE Delete Tests:**
   - Delete each user type and verify cascade behavior
   - Confirm related data is properly removed

4. **Verification:**
   - Ensure all related records are deleted
   - Verify referential integrity maintained
   - Check for orphaned records

5. **Error Handling:**
   - Test invalid IDs, unauthorized access
   - Verify proper error messages

**Note:** CASCADE delete operations are permanent and cannot be undone. Always backup your database before performing these operations in production.