# Admin User Delete Functions - Test Data & API Documentation

## Overview
This document provides comprehensive test data and API documentation for admin user delete functionality. The delete operations are implemented as **soft deletes** to preserve data integrity while making users inactive.

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

## Delete Endpoints

### 1. Delete Farmer User

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
  "message": "Farmer deleted successfully",
  "data": {
    "farmer_id": 1,
    "name": "Ravi Kumar",
    "original_email": "ravi.farmer@example.com",
    "deleted_at": "2024-09-20T12:30:00.000Z",
    "deleted_by": 1
  }
}
```

### 2. Delete Customer User

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
  "message": "Customer deleted successfully",
  "data": {
    "customer_id": 1,
    "name": "Priya Sharma",
    "original_email": "priya.customer@example.com",
    "deleted_at": "2024-09-20T12:35:00.000Z",
    "deleted_by": 1
  }
}
```

### 3. Delete Transporter User

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
  "message": "Transporter deleted successfully",
  "data": {
    "transporter_id": 1,
    "name": "Raj Transport Solutions",
    "original_email": "raj.transport@example.com",
    "deleted_at": "2024-09-20T12:40:00.000Z",
    "deleted_by": 1
  }
}
```

### 4. Delete Delivery Person User

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
  "message": "Delivery person deleted successfully",
  "data": {
    "delivery_person_id": 1,
    "name": "Suresh Kumar",
    "original_mobile": "9876543210",
    "original_license": "KA1234567890",
    "deleted_at": "2024-09-20T12:45:00.000Z",
    "deleted_by": 1
  }
}
```

### 5. Delete User by Role (Generic)

**Endpoint:**
```http
DELETE /api/admin/users/{role}/{userId}
Authorization: Bearer <admin_token>
```

**Supported Roles:** `farmer`, `customer`, `transporter`, `delivery_person`

**Test Cases:**

**Delete Farmer via Generic Route:**
```http
DELETE /api/admin/users/farmer/2
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Delete Customer via Generic Route:**
```http
DELETE /api/admin/users/customer/3
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

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

### 2. Already Deleted User
**Request:**
```http
DELETE /api/admin/farmers/1
Authorization: Bearer <admin_token>
```
(Attempting to delete the same user again)

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Farmer is already deleted"
}
```

### 3. Invalid User ID
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

### 4. Invalid Role (Generic Route)
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

### 5. Unauthorized Access
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

## Test Data Setup

### Prerequisites - Admin Authentication

#### 1. Register Admin (if not exists)
```http
POST /api/auth/register/admin
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@farmercrate.com",
  "password": "AdminPass123!",
  "mobile_number": "9999999999",
  "role": "admin"
}
```

#### 2. Login Admin
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@farmercrate.com",
  "password": "AdminPass123!"
}
```

### Sample Users to Create for Testing

#### Create Test Farmers
```http
POST /api/auth/register/farmer
Content-Type: application/json

{
  "name": "Ravi Kumar",
  "email": "ravi.farmer@example.com",
  "mobile_number": "9876543210",
  "password": "FarmerPass123!",
  "address": "Village Kumta, Karnataka",
  "zone": "South",
  "state": "Karnataka",
  "district": "Uttara Kannada",
  "age": 35,
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234"
}
```

```http
POST /api/auth/register/farmer
Content-Type: application/json

{
  "name": "Lakshmi Devi",
  "email": "lakshmi.farmer@example.com",
  "mobile_number": "9876543211",
  "password": "FarmerPass123!",
  "address": "Village Sirsi, Karnataka",
  "zone": "South",
  "state": "Karnataka",
  "district": "Uttara Kannada",
  "age": 42
}
```

#### Create Test Customers
```http
POST /api/auth/register/customer
Content-Type: application/json

{
  "customer_name": "Priya Sharma",
  "email": "priya.customer@example.com",
  "mobile_number": "9876543212",
  "password": "CustomerPass123!",
  "address": "Koramangala, Bangalore",
  "zone": "South",
  "state": "Karnataka",
  "district": "Bangalore Urban",
  "age": 28
}
```

```http
POST /api/auth/register/customer
Content-Type: application/json

{
  "customer_name": "Arjun Patel",
  "email": "arjun.customer@example.com",
  "mobile_number": "9876543213",
  "password": "CustomerPass123!",
  "address": "Whitefield, Bangalore",
  "zone": "South",
  "state": "Karnataka",
  "district": "Bangalore Urban",
  "age": 32
}
```

#### Create Test Transporters
```http
POST /api/auth/register/transporter
Content-Type: application/json

{
  "name": "Raj Transport Solutions",
  "email": "raj.transport@example.com",
  "mobile_number": "9876543214",
  "password": "TransportPass123!",
  "address": "Transport Nagar, Bangalore",
  "zone": "South",
  "state": "Karnataka",
  "district": "Bangalore Urban",
  "age": 45,
  "aadhar_number": "123456789012",
  "pan_number": "ABCDE1234F",
  "license_number": "KA1234567890"
}
```

---

## CURL Command Examples

### Delete Operations

#### Delete Farmer
```bash
curl -X DELETE "http://localhost:3000/api/admin/farmers/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Delete Customer
```bash
curl -X DELETE "http://localhost:3000/api/admin/customers/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Delete Transporter
```bash
curl -X DELETE "http://localhost:3000/api/admin/transporters/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Delete Delivery Person
```bash
curl -X DELETE "http://localhost:3000/api/admin/delivery-persons/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Generic Delete (by Role)
```bash
curl -X DELETE "http://localhost:3000/api/admin/users/farmer/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Verification Commands

After deletion, verify users are soft-deleted by checking if they appear in user lists with modified email/mobile:

#### Get All Farmers (should show deleted users with modified emails)
```bash
curl -X GET "http://localhost:3000/api/admin/users/farmer" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Get Specific User Details (should still return user but with modified data)
```bash
curl -X GET "http://localhost:3000/api/admin/users/farmer/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Implementation Details

### Soft Delete Strategy

1. **Farmers & Customers & Transporters:**
   - Email modified to: `original_email_deleted_timestamp`
   - Mobile modified to: `original_mobile_deleted_timestamp`
   - Verification status reset to false
   - Approval status cleared

2. **Delivery Persons:**
   - Mobile modified to: `original_mobile_deleted_timestamp`
   - License number modified to: `original_license_deleted_timestamp`
   - Availability set to false

3. **Benefits:**
   - Data preservation for audit purposes
   - Prevents re-registration with same email/mobile
   - Maintains referential integrity
   - Easy to identify deleted users
   - Can be restored if needed

### Security Features

- Admin authentication required
- Input validation (numeric IDs)
- Duplicate deletion prevention
- Comprehensive error handling
- Audit trail with admin ID who performed deletion

---

## Testing Workflow

1. **Setup Phase:**
   - Register admin account
   - Login and get admin token
   - Create sample users for each type

2. **Success Tests:**
   - Delete one user of each type
   - Verify successful deletion responses
   - Check users are soft-deleted in database

3. **Error Tests:**
   - Try invalid user IDs
   - Try deleting already deleted users
   - Try without authentication
   - Try with invalid roles

4. **Verification:**
   - List users to see modified emails/mobiles
   - Ensure deleted users can't login
   - Verify referential integrity maintained

This comprehensive test suite ensures the delete functionality works correctly while maintaining data integrity and security.