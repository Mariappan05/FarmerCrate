# Vehicle Management API Testing Guide

## 📋 Overview

The vehicle management system has been updated to implement **atomic operations** - when creating a vehicle, ALL required documents must be provided simultaneously. This ensures data consistency and compliance requirements.

## 🔑 Authentication Required

All endpoints require authentication. Include the authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 🚛 Permanent Vehicle Creation

### Endpoint
```http
POST /api/vehicles/permanent
Content-Type: application/json
Authorization: Bearer <token>
```

### Required Fields (ALL MANDATORY)

#### Vehicle Information
- `vehicle_number` - Registration number (unique)
- `vehicle_type` - One of: truck, trailer, container, pickup, tempo
- `chassis_number` - Chassis number (unique)
- `engine_number` - Engine number (unique)
- `make` - Vehicle manufacturer
- `model` - Vehicle model
- `year_of_manufacture` - Manufacturing year
- `capacity_kg` - Carrying capacity in kg

#### Required Documents (ALL MANDATORY)
- **RC Book**: `rc_book_number`, `rc_book_issue_date`, `rc_book_expiry_date`, `rc_book_issuing_authority`, `rc_book_url`
- **Insurance**: `insurance_number`, `insurance_issue_date`, `insurance_expiry_date`, `insurance_issuing_authority`, `insurance_url`
- **Fitness**: `fitness_number`, `fitness_issue_date`, `fitness_expiry_date`, `fitness_issuing_authority`, `fitness_url`
- **Pollution**: `pollution_number`, `pollution_issue_date`, `pollution_expiry_date`, `pollution_issuing_authority`, `pollution_url`

### Test Request Example
```json
{
  "vehicle_number": "KA01AB1234",
  "vehicle_type": "truck",
  "capacity_kg": 5000.00,
  "make": "Tata",
  "model": "407",
  "year_of_manufacture": 2020,
  "chassis_number": "CH123456789",
  "engine_number": "EN987654321",
  "ownership_certificate_number": "OC123456",
  "notes": "New truck for long-distance transport",
  
  "rc_book_number": "RC123456789",
  "rc_book_issue_date": "2020-01-15",
  "rc_book_expiry_date": "2025-01-15",
  "rc_book_issuing_authority": "Karnataka RTO Bangalore",
  "rc_book_url": "https://storage.example.com/documents/rc_123456.pdf",
  
  "insurance_number": "INS789012345",
  "insurance_issue_date": "2024-06-01",
  "insurance_expiry_date": "2025-06-01",
  "insurance_issuing_authority": "New India Assurance Co Ltd",
  "insurance_url": "https://storage.example.com/documents/insurance_789012.pdf",
  
  "fitness_number": "FIT456789123",
  "fitness_issue_date": "2024-01-01",
  "fitness_expiry_date": "2025-01-01",
  "fitness_issuing_authority": "RTO Bangalore Central",
  "fitness_url": "https://storage.example.com/documents/fitness_456789.pdf",
  
  "pollution_number": "PUC321654987",
  "pollution_issue_date": "2024-08-01",
  "pollution_expiry_date": "2025-02-01",
  "pollution_issuing_authority": "Authorized PUC Testing Center",
  "pollution_url": "https://storage.example.com/documents/pollution_321654.pdf"
}
```

### Success Response (201)
```json
{
  "success": true,
  "message": "Permanent vehicle and documents added successfully. Pending admin verification.",
  "data": {
    "vehicle": {
      "id": 1,
      "transporter_id": 123,
      "vehicle_number": "KA01AB1234",
      "vehicle_type": "truck",
      "verification_status": "pending",
      "availability_status": "available",
      "documents": {
        "id": 1,
        "vehicle_id": 1,
        "rc_book_number": "RC123456789",
        "insurance_number": "INS789012345",
        "is_verified": false
      }
    },
    "next_steps": [
      "Vehicle is now pending admin verification",
      "All documents have been uploaded and recorded",
      "You will be notified once verification is complete",
      "Vehicle will be available for use after verification"
    ]
  }
}
```

### Error Response - Missing Documents (400)
```json
{
  "success": false,
  "message": "Cannot create vehicle without all required documents",
  "validation_errors": {
    "missing_fields": [
      "rc_book_number",
      "insurance_expiry_date",
      "fitness_url"
    ],
    "errors": [
      "Insurance must be valid (not expired)"
    ]
  },
  "required_documents": {
    "rc_book": ["number", "issue_date", "expiry_date", "issuing_authority", "url"],
    "insurance": ["number", "issue_date", "expiry_date", "issuing_authority", "url"],
    "fitness": ["number", "issue_date", "expiry_date", "issuing_authority", "url"],
    "pollution": ["number", "issue_date", "expiry_date", "issuing_authority", "url"]
  }
}
```

## 🚐 Temporary Vehicle Creation

### Endpoint
```http
POST /api/vehicles/temporary
Content-Type: application/json
Authorization: Bearer <token>
```

### Required Fields

#### Vehicle Information
- `vehicle_number` - Registration number (unique)
- `vehicle_type` - One of: truck, trailer, container, pickup, tempo
- `ownership_type` - One of: temporary, leased
- `capacity_kg` - Carrying capacity in kg (optional)
- `day_limit` - Rental day limit (optional)

#### Required Documents (ESSENTIAL)
- **RC Copy**: `rc_book_number`, `rc_book_issue_date`, `rc_book_expiry_date`, `rc_book_issuing_authority`, `rc_book_url`
- **Insurance Copy**: `insurance_number`, `insurance_issue_date`, `insurance_expiry_date`, `insurance_issuing_authority`, `insurance_url`

### Test Request Example
```json
{
  "vehicle_number": "KA02CD5678",
  "vehicle_type": "pickup",
  "ownership_type": "temporary",
  "capacity_kg": 2000.00,
  "day_limit": 30,
  "notes": "Rented from ABC Vehicle Rental Co. for 1 month",
  
  "rc_book_number": "RC987654321",
  "rc_book_issue_date": "2019-05-10",
  "rc_book_expiry_date": "2024-05-10",
  "rc_book_issuing_authority": "Karnataka RTO Mysore",
  "rc_book_url": "https://storage.example.com/documents/owner_rc_987654.pdf",
  
  "insurance_number": "INS123456789",
  "insurance_issue_date": "2024-03-01",
  "insurance_expiry_date": "2025-03-01",
  "insurance_issuing_authority": "ICICI Lombard General Insurance",
  "insurance_url": "https://storage.example.com/documents/owner_insurance_123456.pdf"
}
```

### Success Response (201)
```json
{
  "success": true,
  "message": "Temporary vehicle and documents added successfully.",
  "data": {
    "vehicle": {
      "id": 2,
      "transporter_id": 123,
      "vehicle_number": "KA02CD5678",
      "vehicle_type": "pickup",
      "ownership_type": "temporary",
      "availability_status": "available",
      "documents": {
        "id": 2,
        "vehicle_id": 2,
        "rc_book_number": "RC987654321",
        "insurance_number": "INS123456789"
      }
    },
    "rental_info": {
      "ownership_type": "temporary",
      "day_limit": 30,
      "status": "Available for use"
    },
    "next_steps": [
      "Vehicle is ready for immediate use",
      "All required documents have been recorded",
      "Ensure rental agreement compliance",
      "Monitor day limits if applicable"
    ]
  }
}
```

## 📊 Fleet Overview

### Get All Vehicles
```http
GET /api/vehicles
Authorization: Bearer <token>
```

### Response
```json
{
  "success": true,
  "message": "Fleet data retrieved successfully",
  "data": {
    "fleet_statistics": {
      "total_vehicles": 5,
      "permanent_count": 3,
      "temporary_count": 2,
      "available_count": 4,
      "verified_permanent": 2,
      "pending_verification": 1
    },
    "permanent_vehicles": [...],
    "temporary_vehicles": [...]
  }
}
```

## 🔄 Vehicle Status Update

### Update Availability Status
```http
PATCH /api/vehicles/permanent/1/status
Content-Type: application/json
Authorization: Bearer <token>
```

### Request
```json
{
  "availability_status": "in_transit",
  "notes": "Delivering goods to Bangalore - ETA 6 hours"
}
```

## 📝 Update Documents (For Existing Vehicles)

### Update Vehicle Documents
```http
PUT /api/vehicles/permanent/1/documents
Content-Type: application/json
Authorization: Bearer <token>
```

### Request (Partial Updates Allowed)
```json
{
  "insurance_number": "INS999888777",
  "insurance_expiry_date": "2026-06-01",
  "insurance_url": "https://storage.example.com/documents/renewed_insurance.pdf"
}
```

## 🚨 Important Business Rules

### ✅ What Works
- Creating vehicle + documents in single request (atomic)
- Updating documents for existing vehicles
- Updating vehicle status and availability
- Getting fleet overview and statistics

### ❌ What's NOT Allowed
- Creating vehicle without documents
- Creating documents without vehicle
- Duplicate vehicle numbers (across all vehicle types)
- Duplicate chassis/engine numbers
- Expired insurance during creation

## 🧪 CURL Test Commands

### Create Permanent Vehicle
```bash
curl -X POST http://localhost:3000/api/vehicles/permanent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vehicle_number": "KA01AB1234",
    "vehicle_type": "truck",
    "capacity_kg": 5000.00,
    "make": "Tata",
    "model": "407",
    "year_of_manufacture": 2020,
    "chassis_number": "CH123456789",
    "engine_number": "EN987654321",
    "rc_book_number": "RC123456789",
    "rc_book_issue_date": "2020-01-15",
    "rc_book_expiry_date": "2025-01-15",
    "rc_book_issuing_authority": "Karnataka RTO",
    "rc_book_url": "https://example.com/rc.pdf",
    "insurance_number": "INS789012345",
    "insurance_issue_date": "2024-06-01", 
    "insurance_expiry_date": "2025-06-01",
    "insurance_issuing_authority": "New India Assurance",
    "insurance_url": "https://example.com/insurance.pdf",
    "fitness_number": "FIT456789123",
    "fitness_issue_date": "2024-01-01",
    "fitness_expiry_date": "2025-01-01", 
    "fitness_issuing_authority": "RTO Bangalore",
    "fitness_url": "https://example.com/fitness.pdf",
    "pollution_number": "PUC321654987",
    "pollution_issue_date": "2024-08-01",
    "pollution_expiry_date": "2025-02-01",
    "pollution_issuing_authority": "PUC Center", 
    "pollution_url": "https://example.com/pollution.pdf"
  }'
```

### Get Fleet Overview
```bash
curl -X GET http://localhost:3000/api/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Vehicle Status
```bash
curl -X PATCH http://localhost:3000/api/vehicles/permanent/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "availability_status": "maintenance",
    "notes": "Scheduled maintenance check"
  }'
```

## 📚 Testing Scenarios

1. **Happy Path**: Create vehicle with all required documents
2. **Missing Documents**: Try creating vehicle without required docs (should fail)
3. **Duplicate Vehicle**: Try creating vehicle with existing registration number (should fail)
4. **Invalid Dates**: Try with invalid document dates (should fail)
5. **Expired Insurance**: Try with expired insurance (should fail)
6. **Fleet Overview**: Check that created vehicles appear in fleet
7. **Status Updates**: Update vehicle availability status
8. **Document Updates**: Update documents for existing vehicles

This implementation ensures data integrity, compliance requirements, and provides a robust vehicle management system for transporters.