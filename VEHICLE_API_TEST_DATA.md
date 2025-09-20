# Vehicle Management API - Complete Test Data & Endpoints

## Table of Contents
1. [Authentication Setup](#authentication-setup)
2. [Endpoint Documentation](#endpoint-documentation)
3. [Test Data Sets](#test-data-sets)
4. [Sample Responses](#sample-responses)
5. [Error Test Cases](#error-test-cases)

---

## Authentication Setup

### 1. Register Transporter (Prerequisites)
```http
POST /api/auth/register/transporter
Content-Type: application/json

{
  "name": "Raj Transport Solutions",
  "email": "raj.transport@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!",
  "business_license": "BL123456789",
  "company_name": "Raj Transport Solutions Pvt Ltd",
  "company_address": "123 Transport Hub, Bangalore, Karnataka 560001",
  "gst_number": "29ABCDE1234F1Z5",
  "pan_number": "ABCDE1234F"
}
```

### 2. Login to Get Token
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "raj.transport@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Raj Transport Solutions",
    "email": "raj.transport@example.com",
    "role": "transporter"
  }
}
```

---

## Endpoint Documentation

### Base URL
```
http://localhost:3000/api/vehicles
```

### Authentication Header
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Test Data Sets

### Test Case 1: Add Permanent Vehicle (Success)

**Endpoint:**
```http
POST /api/vehicles/permanent
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "vehicle_number": "KA01AB1234",
  "vehicle_type": "truck",
  "capacity_kg": 5000.00,
  "make": "Tata",
  "model": "407 Pickup",
  "year_of_manufacture": 2020,
  "chassis_number": "MAT123456789012345",
  "engine_number": "ENG987654321098765",
  
  "rc_book_number": "KA011234567890",
  "rc_book_issue_date": "2020-01-15",
  "rc_book_expiry_date": "2035-01-15",
  "rc_book_issuing_authority": "RTO Bangalore East",
  "rc_book_url": "https://storage.farmercrate.com/documents/rc_ka01ab1234.pdf",
  
  "insurance_number": "NICI202400123456",
  "insurance_issue_date": "2024-06-01",
  "insurance_expiry_date": "2025-06-01",
  "insurance_issuing_authority": "New India Assurance Co Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/insurance_ka01ab1234.pdf",
  
  "fitness_number": "FIT2024BLR001234",
  "fitness_issue_date": "2024-01-01",
  "fitness_expiry_date": "2025-01-01",
  "fitness_issuing_authority": "RTO Bangalore East",
  "fitness_url": "https://storage.farmercrate.com/documents/fitness_ka01ab1234.pdf",
  
  "pollution_number": "PUC2024080112345",
  "pollution_issue_date": "2024-08-01",
  "pollution_expiry_date": "2025-02-01",
  "pollution_issuing_authority": "Authorized PUC Center - Koramangala",
  "pollution_url": "https://storage.farmercrate.com/documents/puc_ka01ab1234.pdf"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Permanent vehicle added successfully with all required documents",
  "data": {
    "vehicle": {
      "id": 1,
      "transporter_id": 1,
      "vehicle_number": "KA01AB1234",
      "vehicle_type": "truck",
      "capacity_kg": 5000.00,
      "make": "Tata",
      "model": "407 Pickup",
      "year_of_manufacture": 2020,
      "chassis_number": "MAT123456789012345",
      "engine_number": "ENG987654321098765",
      "availability_status": "available",
      "verification_status": "pending",
      "is_active": true,
      "created_at": "2024-09-20T10:30:00.000Z",
      "updated_at": "2024-09-20T10:30:00.000Z"
    },
    "documents": {
      "id": 1,
      "permanent_vehicle_id": 1,
      "rc_book_number": "KA011234567890",
      "rc_book_issue_date": "2020-01-15T00:00:00.000Z",
      "rc_book_expiry_date": "2035-01-15T00:00:00.000Z",
      "rc_book_issuing_authority": "RTO Bangalore East",
      "rc_book_url": "https://storage.farmercrate.com/documents/rc_ka01ab1234.pdf",
      "rc_book_verified": false,
      "insurance_number": "NICI202400123456",
      "insurance_issue_date": "2024-06-01T00:00:00.000Z",
      "insurance_expiry_date": "2025-06-01T00:00:00.000Z",
      "insurance_issuing_authority": "New India Assurance Co Ltd",
      "insurance_url": "https://storage.farmercrate.com/documents/insurance_ka01ab1234.pdf",
      "insurance_verified": false,
      "fitness_number": "FIT2024BLR001234",
      "fitness_issue_date": "2024-01-01T00:00:00.000Z",
      "fitness_expiry_date": "2025-01-01T00:00:00.000Z",
      "fitness_issuing_authority": "RTO Bangalore East",
      "fitness_url": "https://storage.farmercrate.com/documents/fitness_ka01ab1234.pdf",
      "fitness_verified": false,
      "pollution_number": "PUC2024080112345",
      "pollution_issue_date": "2024-08-01T00:00:00.000Z",
      "pollution_expiry_date": "2025-02-01T00:00:00.000Z",
      "pollution_issuing_authority": "Authorized PUC Center - Koramangala",
      "pollution_url": "https://storage.farmercrate.com/documents/puc_ka01ab1234.pdf",
      "pollution_verified": false,
      "created_at": "2024-09-20T10:30:00.000Z",
      "updated_at": "2024-09-20T10:30:00.000Z"
    }
  }
}
```

### Test Case 2: Add Temporary Vehicle (Success)

**Endpoint:**
```http
POST /api/vehicles/temporary
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "vehicle_number": "KA02CD5678",
  "vehicle_type": "pickup",
  "ownership_type": "temporary",
  "capacity_kg": 2000.00,
  "day_limit": 30,
  "notes": "Rented from ABC Vehicle Rental Services for 1 month",
  
  "rc_book_number": "KA029876543210",
  "rc_book_issue_date": "2019-05-10",
  "rc_book_expiry_date": "2034-05-10",
  "rc_book_issuing_authority": "RTO Bangalore North",
  "rc_book_url": "https://storage.farmercrate.com/documents/owner_rc_ka02cd5678.pdf",
  
  "insurance_number": "ICICI202400654321",
  "insurance_issue_date": "2024-03-01",
  "insurance_expiry_date": "2025-03-01",
  "insurance_issuing_authority": "ICICI Lombard General Insurance",
  "insurance_url": "https://storage.farmercrate.com/documents/owner_insurance_ka02cd5678.pdf"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Temporary vehicle added successfully with required documents",
  "data": {
    "vehicle": {
      "id": 1,
      "transporter_id": 1,
      "vehicle_number": "KA02CD5678",
      "vehicle_type": "pickup",
      "ownership_type": "temporary",
      "capacity_kg": 2000.00,
      "day_limit": 30,
      "notes": "Rented from ABC Vehicle Rental Services for 1 month",
      "availability_status": "available",
      "is_active": true,
      "created_at": "2024-09-20T10:35:00.000Z",
      "updated_at": "2024-09-20T10:35:00.000Z"
    },
    "documents": {
      "id": 1,
      "temporary_vehicle_id": 1,
      "rc_book_number": "KA029876543210",
      "rc_book_issue_date": "2019-05-10T00:00:00.000Z",
      "rc_book_expiry_date": "2034-05-10T00:00:00.000Z",
      "rc_book_issuing_authority": "RTO Bangalore North",
      "rc_book_url": "https://storage.farmercrate.com/documents/owner_rc_ka02cd5678.pdf",
      "insurance_number": "ICICI202400654321",
      "insurance_issue_date": "2024-03-01T00:00:00.000Z",
      "insurance_expiry_date": "2025-03-01T00:00:00.000Z",
      "insurance_issuing_authority": "ICICI Lombard General Insurance",
      "insurance_url": "https://storage.farmercrate.com/documents/owner_insurance_ka02cd5678.pdf",
      "created_at": "2024-09-20T10:35:00.000Z",
      "updated_at": "2024-09-20T10:35:00.000Z"
    }
  }
}
```

### Test Case 3: Get All Vehicles (Fleet Overview)

**Endpoint:**
```http
GET /api/vehicles
Authorization: Bearer <token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Fleet overview retrieved successfully",
  "data": {
    "summary": {
      "total_vehicles": 5,
      "permanent_vehicles": 3,
      "temporary_vehicles": 2,
      "available_vehicles": 4,
      "in_transit_vehicles": 1,
      "maintenance_vehicles": 0
    },
    "permanent_vehicles": [
      {
        "id": 1,
        "vehicle_number": "KA01AB1234",
        "vehicle_type": "truck",
        "capacity_kg": 5000.00,
        "make": "Tata",
        "model": "407 Pickup",
        "availability_status": "available",
        "verification_status": "pending",
        "created_at": "2024-09-20T10:30:00.000Z"
      }
    ],
    "temporary_vehicles": [
      {
        "id": 1,
        "vehicle_number": "KA02CD5678",
        "vehicle_type": "pickup",
        "ownership_type": "temporary",
        "capacity_kg": 2000.00,
        "day_limit": 30,
        "availability_status": "available",
        "created_at": "2024-09-20T10:35:00.000Z"
      }
    ]
  }
}
```

### Test Case 4: Get Vehicle by Status

**Endpoint:**
```http
GET /api/vehicles/status/available
Authorization: Bearer <token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Available vehicles retrieved successfully",
  "data": {
    "status": "available",
    "count": 4,
    "vehicles": [
      {
        "type": "permanent",
        "id": 1,
        "vehicle_number": "KA01AB1234",
        "vehicle_type": "truck",
        "capacity_kg": 5000.00,
        "make": "Tata",
        "model": "407 Pickup",
        "availability_status": "available"
      },
      {
        "type": "temporary",
        "id": 1,
        "vehicle_number": "KA02CD5678",
        "vehicle_type": "pickup",
        "capacity_kg": 2000.00,
        "ownership_type": "temporary",
        "availability_status": "available"
      }
    ]
  }
}
```

### Test Case 5: Get Vehicle Details

**Endpoint:**
```http
GET /api/vehicles/permanent/1
Authorization: Bearer <token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Vehicle details retrieved successfully",
  "data": {
    "vehicle": {
      "id": 1,
      "transporter_id": 1,
      "vehicle_number": "KA01AB1234",
      "vehicle_type": "truck",
      "capacity_kg": 5000.00,
      "make": "Tata",
      "model": "407 Pickup",
      "year_of_manufacture": 2020,
      "chassis_number": "MAT123456789012345",
      "engine_number": "ENG987654321098765",
      "availability_status": "available",
      "verification_status": "pending",
      "is_active": true,
      "created_at": "2024-09-20T10:30:00.000Z",
      "updated_at": "2024-09-20T10:30:00.000Z"
    },
    "documents": {
      "rc_book": {
        "number": "KA011234567890",
        "issue_date": "2020-01-15",
        "expiry_date": "2035-01-15",
        "issuing_authority": "RTO Bangalore East",
        "url": "https://storage.farmercrate.com/documents/rc_ka01ab1234.pdf",
        "verified": false
      },
      "insurance": {
        "number": "NICI202400123456",
        "issue_date": "2024-06-01",
        "expiry_date": "2025-06-01",
        "issuing_authority": "New India Assurance Co Ltd",
        "url": "https://storage.farmercrate.com/documents/insurance_ka01ab1234.pdf",
        "verified": false
      },
      "fitness": {
        "number": "FIT2024BLR001234",
        "issue_date": "2024-01-01",
        "expiry_date": "2025-01-01",
        "issuing_authority": "RTO Bangalore East",
        "url": "https://storage.farmercrate.com/documents/fitness_ka01ab1234.pdf",
        "verified": false
      },
      "pollution": {
        "number": "PUC2024080112345",
        "issue_date": "2024-08-01",
        "expiry_date": "2025-02-01",
        "issuing_authority": "Authorized PUC Center - Koramangala",
        "url": "https://storage.farmercrate.com/documents/puc_ka01ab1234.pdf",
        "verified": false
      }
    },
    "transporter": {
      "id": 1,
      "name": "Raj Transport Solutions",
      "company_name": "Raj Transport Solutions Pvt Ltd"
    }
  }
}
```

### Test Case 6: Update Vehicle Status

**Endpoint:**
```http
PATCH /api/vehicles/permanent/1/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "availability_status": "in_transit",
  "notes": "Vehicle dispatched for delivery to Mysore"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Vehicle status updated successfully",
  "data": {
    "id": 1,
    "vehicle_number": "KA01AB1234",
    "availability_status": "in_transit",
    "notes": "Vehicle dispatched for delivery to Mysore",
    "updated_at": "2024-09-20T11:45:00.000Z"
  }
}
```

### Test Case 7: Update Vehicle Documents

**Endpoint:**
```http
PUT /api/vehicles/permanent/1/documents
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "insurance_number": "NICI202400123457",
  "insurance_issue_date": "2024-09-01",
  "insurance_expiry_date": "2025-09-01",
  "insurance_issuing_authority": "New India Assurance Co Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/insurance_renewed_ka01ab1234.pdf"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Vehicle documents updated successfully",
  "data": {
    "document_type": "insurance",
    "updated_fields": [
      "insurance_number",
      "insurance_issue_date", 
      "insurance_expiry_date",
      "insurance_url"
    ],
    "insurance": {
      "number": "NICI202400123457",
      "issue_date": "2024-09-01",
      "expiry_date": "2025-09-01",
      "issuing_authority": "New India Assurance Co Ltd",
      "url": "https://storage.farmercrate.com/documents/insurance_renewed_ka01ab1234.pdf",
      "verified": false
    }
  }
}
```

---

## Error Test Cases

### Error Case 1: Missing Required Documents (Permanent Vehicle)

**Endpoint:**
```http
POST /api/vehicles/permanent
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (Missing Pollution Certificate):**
```json
{
  "vehicle_number": "KA03EF9999",
  "vehicle_type": "truck",
  "capacity_kg": 3000.00,
  "make": "Mahindra",
  "model": "Bolero Pickup",
  "year_of_manufacture": 2021,
  
  "rc_book_number": "KA031122334455",
  "rc_book_issue_date": "2021-03-15",
  "rc_book_expiry_date": "2036-03-15",
  "rc_book_issuing_authority": "RTO Bangalore South",
  "rc_book_url": "https://storage.farmercrate.com/documents/rc_ka03ef9999.pdf",
  
  "insurance_number": "HDFC202400789012",
  "insurance_issue_date": "2024-04-01",
  "insurance_expiry_date": "2025-04-01",
  "insurance_issuing_authority": "HDFC ERGO General Insurance",
  "insurance_url": "https://storage.farmercrate.com/documents/insurance_ka03ef9999.pdf",
  
  "fitness_number": "FIT2024BLR005678",
  "fitness_issue_date": "2024-02-01",
  "fitness_expiry_date": "2025-02-01",
  "fitness_issuing_authority": "RTO Bangalore South",
  "fitness_url": "https://storage.farmercrate.com/documents/fitness_ka03ef9999.pdf"
  
  // MISSING: All pollution certificate fields
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Vehicle creation failed: Missing required documents",
  "error": {
    "type": "MISSING_DOCUMENTS",
    "details": "All required documents must be provided simultaneously for permanent vehicle creation",
    "missing_fields": [
      "pollution_number",
      "pollution_issue_date", 
      "pollution_expiry_date",
      "pollution_issuing_authority",
      "pollution_url"
    ],
    "validation_errors": [],
    "help": "Please provide all required document fields: RC Book, Insurance, Fitness Certificate, and Pollution Certificate"
  }
}
```

### Error Case 2: Expired Insurance

**Request Body (Expired Insurance):**
```json
{
  "vehicle_number": "KA04GH7777",
  "vehicle_type": "pickup",
  "capacity_kg": 1500.00,
  "make": "Ashok Leyland",
  "model": "Dost+",
  "year_of_manufacture": 2019,
  
  "rc_book_number": "KA045566778899",
  "rc_book_issue_date": "2019-06-10",
  "rc_book_expiry_date": "2034-06-10",
  "rc_book_issuing_authority": "RTO Bangalore West",
  "rc_book_url": "https://storage.farmercrate.com/documents/rc_ka04gh7777.pdf",
  
  "insurance_number": "EXPIRED202300111222",
  "insurance_issue_date": "2023-01-01",
  "insurance_expiry_date": "2024-01-01",
  "insurance_issuing_authority": "United India Insurance",
  "insurance_url": "https://storage.farmercrate.com/documents/insurance_ka04gh7777.pdf",
  
  "fitness_number": "FIT2024BLR009012",
  "fitness_issue_date": "2024-03-01",
  "fitness_expiry_date": "2025-03-01",
  "fitness_issuing_authority": "RTO Bangalore West",
  "fitness_url": "https://storage.farmercrate.com/documents/fitness_ka04gh7777.pdf",
  
  "pollution_number": "PUC2024070198765",
  "pollution_issue_date": "2024-07-01",
  "pollution_expiry_date": "2025-01-01",
  "pollution_issuing_authority": "Authorized PUC Center - Jayanagar",
  "pollution_url": "https://storage.farmercrate.com/documents/puc_ka04gh7777.pdf"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Vehicle creation failed: Document validation errors",
  "error": {
    "type": "DOCUMENT_VALIDATION_ERROR",
    "details": "Document validation failed due to invalid or expired documents",
    "missing_fields": [],
    "validation_errors": [
      "Insurance must be valid (not expired)"
    ],
    "help": "Please ensure all documents are valid and not expired. Insurance expiry date: 2024-01-01 is in the past."
  }
}
```

### Error Case 3: Duplicate Vehicle Number

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Vehicle creation failed: Vehicle already exists",
  "error": {
    "type": "DUPLICATE_VEHICLE",
    "details": "A vehicle with number 'KA01AB1234' already exists in the system",
    "existing_vehicle": {
      "id": 1,
      "vehicle_number": "KA01AB1234",
      "vehicle_type": "truck",
      "transporter_name": "Raj Transport Solutions",
      "created_at": "2024-09-20T10:30:00.000Z"
    },
    "help": "Please use a different vehicle number or contact support if this is an error"
  }
}
```

### Error Case 4: Invalid Vehicle Type Parameter

**Endpoint:**
```http
GET /api/vehicles/invalid_type/1
Authorization: Bearer <token>
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid vehicle type. Must be either \"permanent\" or \"temporary\""
}
```

### Error Case 5: Unauthorized Access (Invalid Token)

**Endpoint:**
```http
GET /api/vehicles
Authorization: Bearer invalid_token_here
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Access denied. Invalid or expired token.",
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "details": "The provided token is invalid or has expired"
  }
}
```

### Error Case 6: Vehicle Not Found

**Endpoint:**
```http
GET /api/vehicles/permanent/99999
Authorization: Bearer <token>
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Vehicle not found",
  "error": {
    "type": "VEHICLE_NOT_FOUND",
    "details": "No permanent vehicle found with ID 99999 for this transporter",
    "vehicle_type": "permanent",
    "vehicle_id": 99999
  }
}
```

---

## Additional Test Data Sets

### More Permanent Vehicles

#### Heavy Truck (Success Case)
```json
{
  "vehicle_number": "KA05IJ8888",
  "vehicle_type": "heavy_truck",
  "capacity_kg": 10000.00,
  "make": "Bharat Benz",
  "model": "1617R",
  "year_of_manufacture": 2022,
  "chassis_number": "BB1234567890123456",
  "engine_number": "BBENG123456789012",
  
  "rc_book_number": "KA051234509876",
  "rc_book_issue_date": "2022-04-20",
  "rc_book_expiry_date": "2037-04-20",
  "rc_book_issuing_authority": "RTO Bangalore Central",
  "rc_book_url": "https://storage.farmercrate.com/documents/rc_ka05ij8888.pdf",
  
  "insurance_number": "ORIENTAL202400445566",
  "insurance_issue_date": "2024-05-15",
  "insurance_expiry_date": "2025-05-15",
  "insurance_issuing_authority": "Oriental Insurance Company Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/insurance_ka05ij8888.pdf",
  
  "fitness_number": "FIT2024BLR012345",
  "fitness_issue_date": "2024-04-01",
  "fitness_expiry_date": "2025-04-01",
  "fitness_issuing_authority": "RTO Bangalore Central",
  "fitness_url": "https://storage.farmercrate.com/documents/fitness_ka05ij8888.pdf",
  
  "pollution_number": "PUC2024090154321",
  "pollution_issue_date": "2024-09-01",
  "pollution_expiry_date": "2025-03-01",
  "pollution_issuing_authority": "Authorized PUC Center - Whitefield",
  "pollution_url": "https://storage.farmercrate.com/documents/puc_ka05ij8888.pdf"
}
```

### More Temporary Vehicles

#### Leased Mini Truck
```json
{
  "vehicle_number": "KA06KL4444",
  "vehicle_type": "mini_truck",
  "ownership_type": "leased",
  "capacity_kg": 1000.00,
  "day_limit": 90,
  "notes": "Leased from XYZ Logistics for 3 months contract",
  
  "rc_book_number": "KA064433221100",
  "rc_book_issue_date": "2020-08-15",
  "rc_book_expiry_date": "2035-08-15",
  "rc_book_issuing_authority": "RTO Bangalore Rural",
  "rc_book_url": "https://storage.farmercrate.com/documents/owner_rc_ka06kl4444.pdf",
  
  "insurance_number": "BAJAJ202400998877",
  "insurance_issue_date": "2024-07-10",
  "insurance_expiry_date": "2025-07-10",
  "insurance_issuing_authority": "Bajaj Allianz General Insurance",
  "insurance_url": "https://storage.farmercrate.com/documents/owner_insurance_ka06kl4444.pdf"
}
```

---

## Testing Workflow

### 1. Setup Phase
1. Register transporter account
2. Login and save token
3. Set Authorization header for all subsequent requests

### 2. Vehicle Creation Tests
1. Test successful permanent vehicle creation (with all documents)
2. Test successful temporary vehicle creation (with required documents)
3. Test failure cases (missing documents, expired insurance, etc.)

### 3. Fleet Management Tests
1. Get all vehicles (fleet overview)
2. Filter vehicles by status
3. Get detailed vehicle information

### 4. Operations Tests
1. Update vehicle status (available → in_transit → maintenance)
2. Update vehicle documents (insurance renewal)
3. Soft delete vehicles

### 5. Error Handling Tests
1. Invalid authentication
2. Vehicle not found
3. Duplicate vehicle numbers
4. Invalid parameters

This comprehensive test data set covers all major use cases and edge cases for the vehicle management system, ensuring proper validation of the atomic document creation requirement.