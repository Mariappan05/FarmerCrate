# Vehicle Module Test Data

This file contains realistic test data for testing the vehicle management module endpoints.

## Authentication Setup

First, you need to authenticate as a transporter to get a JWT token:

```bash
# Register as transporter (if not already registered)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "transporter",
    "name": "Test Transport Company",
    "email": "testtransporter@example.com",
    "password": "password123",
    "mobile_number": "+919876543210",
    "address": "123 Transport Street, Bangalore",
    "zone": "South Zone",
    "district": "Bangalore Urban",
    "state": "Karnataka"
  }'

# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testtransporter@example.com",
    "password": "password123",
    "userType": "transporter"
  }'
```

**Save the JWT token from login response and use it in Authorization header for all vehicle API calls.**

---

## Test Data 1: Permanent Vehicle - Large Truck

### Vehicle Details
```json
{
  "vehicle_number": "KA01AB1234",
  "vehicle_type": "truck",
  "capacity_kg": 8000.00,
  "make": "Tata Motors",
  "model": "LPT 407",
  "year_of_manufacture": 2020,
  "chassis_number": "MAT407ABC123456789",
  "engine_number": "407ENGXYZ987654321",
  "ownership_certificate_number": "OC2020KA001234",
  "notes": "Heavy duty truck for long-distance cargo transport. Recently serviced.",
  
  "rc_book_number": "KA01202012345678",
  "rc_book_issue_date": "2020-03-15",
  "rc_book_expiry_date": "2025-03-14",
  "rc_book_issuing_authority": "Regional Transport Office, Bangalore East",
  "rc_book_url": "https://storage.farmercrate.com/documents/rc/KA01202012345678.pdf",
  
  "insurance_number": "NIAIC2024BLR789012",
  "insurance_issue_date": "2024-04-01",
  "insurance_expiry_date": "2025-03-31",
  "insurance_issuing_authority": "New India Assurance Company Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/insurance/NIAIC2024BLR789012.pdf",
  
  "fitness_number": "FIT2024BLR456789",
  "fitness_issue_date": "2024-01-10",
  "fitness_expiry_date": "2025-01-09",
  "fitness_issuing_authority": "Regional Transport Office, Bangalore Central",
  "fitness_url": "https://storage.farmercrate.com/documents/fitness/FIT2024BLR456789.pdf",
  
  "pollution_number": "PUC2024KA321654",
  "pollution_issue_date": "2024-09-01",
  "pollution_expiry_date": "2025-03-01",
  "pollution_issuing_authority": "Authorized Pollution Testing Center, Whitefield",
  "pollution_url": "https://storage.farmercrate.com/documents/pollution/PUC2024KA321654.pdf"
}
```

### CURL Command
```bash
curl -X POST http://localhost:3000/api/vehicles/permanent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "vehicle_number": "KA01AB1234",
    "vehicle_type": "truck",
    "capacity_kg": 8000.00,
    "make": "Tata Motors",
    "model": "LPT 407",
    "year_of_manufacture": 2020,
    "chassis_number": "MAT407ABC123456789",
    "engine_number": "407ENGXYZ987654321",
    "ownership_certificate_number": "OC2020KA001234",
    "notes": "Heavy duty truck for long-distance cargo transport",
    "rc_book_number": "KA01202012345678",
    "rc_book_issue_date": "2020-03-15",
    "rc_book_expiry_date": "2025-03-14",
    "rc_book_issuing_authority": "Regional Transport Office, Bangalore East",
    "rc_book_url": "https://storage.farmercrate.com/documents/rc/KA01202012345678.pdf",
    "insurance_number": "NIAIC2024BLR789012",
    "insurance_issue_date": "2024-04-01",
    "insurance_expiry_date": "2025-03-31",
    "insurance_issuing_authority": "New India Assurance Company Ltd",
    "insurance_url": "https://storage.farmercrate.com/documents/insurance/NIAIC2024BLR789012.pdf",
    "fitness_number": "FIT2024BLR456789",
    "fitness_issue_date": "2024-01-10",
    "fitness_expiry_date": "2025-01-09",
    "fitness_issuing_authority": "Regional Transport Office, Bangalore Central",
    "fitness_url": "https://storage.farmercrate.com/documents/fitness/FIT2024BLR456789.pdf",
    "pollution_number": "PUC2024KA321654",
    "pollution_issue_date": "2024-09-01",
    "pollution_expiry_date": "2025-03-01",
    "pollution_issuing_authority": "Authorized Pollution Testing Center, Whitefield",
    "pollution_url": "https://storage.farmercrate.com/documents/pollution/PUC2024KA321654.pdf"
  }'
```

---

## Test Data 2: Permanent Vehicle - Container Truck

### Vehicle Details
```json
{
  "vehicle_number": "KA02CD5678",
  "vehicle_type": "container",
  "capacity_kg": 12000.00,
  "make": "Ashok Leyland",
  "model": "2518 IL",
  "year_of_manufacture": 2021,
  "chassis_number": "AL2518DEF789012345",
  "engine_number": "2518ENGPQR123456789",
  "ownership_certificate_number": "OC2021KA005678",
  "notes": "Container truck for shipping cargo. Excellent condition.",
  
  "rc_book_number": "KA02202187654321",
  "rc_book_issue_date": "2021-06-20",
  "rc_book_expiry_date": "2026-06-19",
  "rc_book_issuing_authority": "Regional Transport Office, Bangalore West",
  "rc_book_url": "https://storage.farmercrate.com/documents/rc/KA02202187654321.pdf",
  
  "insurance_number": "ICICILOM2024KA567",
  "insurance_issue_date": "2024-07-15",
  "insurance_expiry_date": "2025-07-14",
  "insurance_issuing_authority": "ICICI Lombard General Insurance Co Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/insurance/ICICILOM2024KA567.pdf",
  
  "fitness_number": "FIT2024KA789123",
  "fitness_issue_date": "2024-02-28",
  "fitness_expiry_date": "2025-02-27",
  "fitness_issuing_authority": "Regional Transport Office, Bangalore North",
  "fitness_url": "https://storage.farmercrate.com/documents/fitness/FIT2024KA789123.pdf",
  
  "pollution_number": "PUC2024KA654987",
  "pollution_issue_date": "2024-08-15",
  "pollution_expiry_date": "2025-02-15",
  "pollution_issuing_authority": "Authorized Pollution Testing Center, Electronic City",
  "pollution_url": "https://storage.farmercrate.com/documents/pollution/PUC2024KA654987.pdf"
}
```

---

## Test Data 3: Permanent Vehicle - Pickup Truck

### Vehicle Details
```json
{
  "vehicle_number": "KA53EF9012",
  "vehicle_type": "pickup",
  "capacity_kg": 1500.00,
  "make": "Mahindra",
  "model": "Bolero Pickup",
  "year_of_manufacture": 2022,
  "chassis_number": "MAH2022GHI345678901",
  "engine_number": "BOLEROENGSTU456789012",
  "ownership_certificate_number": "OC2022KA009012",
  "notes": "Compact pickup for city and rural deliveries. Low mileage.",
  
  "rc_book_number": "KA53202254321098",
  "rc_book_issue_date": "2022-01-10",
  "rc_book_expiry_date": "2027-01-09",
  "rc_book_issuing_authority": "Regional Transport Office, Tumkur",
  "rc_book_url": "https://storage.farmercrate.com/documents/rc/KA53202254321098.pdf",
  
  "insurance_number": "BAJAJALLI2024TK890",
  "insurance_issue_date": "2024-05-01",
  "insurance_expiry_date": "2025-04-30",
  "insurance_issuing_authority": "Bajaj Allianz General Insurance Co Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/insurance/BAJAJALLI2024TK890.pdf",
  
  "fitness_number": "FIT2024TK123456",
  "fitness_issue_date": "2024-03-15",
  "fitness_expiry_date": "2025-03-14",
  "fitness_issuing_authority": "Regional Transport Office, Tumkur",
  "fitness_url": "https://storage.farmercrate.com/documents/fitness/FIT2024TK123456.pdf",
  
  "pollution_number": "PUC2024TK987321",
  "pollution_issue_date": "2024-09-10",
  "pollution_expiry_date": "2025-03-10",
  "pollution_issuing_authority": "Authorized Pollution Testing Center, Tumkur",
  "pollution_url": "https://storage.farmercrate.com/documents/pollution/PUC2024TK987321.pdf"
}
```

---

## Test Data 4: Temporary Vehicle - Rented Truck

### Vehicle Details
```json
{
  "vehicle_number": "MH12GH3456",
  "vehicle_type": "truck",
  "ownership_type": "temporary",
  "capacity_kg": 6000.00,
  "day_limit": 45,
  "notes": "Rented from Mumbai Transport Rentals for 45 days. Good condition, regular maintenance.",
  
  "rc_book_number": "MH12201934567890",
  "rc_book_issue_date": "2019-11-05",
  "rc_book_expiry_date": "2024-11-04",
  "rc_book_issuing_authority": "Regional Transport Office, Mumbai Central",
  "rc_book_url": "https://storage.farmercrate.com/documents/rental/rc/MH12201934567890.pdf",
  
  "insurance_number": "ORIENTALINS2024MH345",
  "insurance_issue_date": "2024-06-01",
  "insurance_expiry_date": "2025-05-31",
  "insurance_issuing_authority": "Oriental Insurance Company Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/rental/insurance/ORIENTALINS2024MH345.pdf"
}
```

### CURL Command
```bash
curl -X POST http://localhost:3000/api/vehicles/temporary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "vehicle_number": "MH12GH3456",
    "vehicle_type": "truck",
    "ownership_type": "temporary",
    "capacity_kg": 6000.00,
    "day_limit": 45,
    "notes": "Rented from Mumbai Transport Rentals for 45 days",
    "rc_book_number": "MH12201934567890",
    "rc_book_issue_date": "2019-11-05",
    "rc_book_expiry_date": "2024-11-04",
    "rc_book_issuing_authority": "Regional Transport Office, Mumbai Central",
    "rc_book_url": "https://storage.farmercrate.com/documents/rental/rc/MH12201934567890.pdf",
    "insurance_number": "ORIENTALINS2024MH345",
    "insurance_issue_date": "2024-06-01",
    "insurance_expiry_date": "2025-05-31",
    "insurance_issuing_authority": "Oriental Insurance Company Ltd",
    "insurance_url": "https://storage.farmercrate.com/documents/rental/insurance/ORIENTALINS2024MH345.pdf"
  }'
```

---

## Test Data 5: Temporary Vehicle - Leased Trailer

### Vehicle Details
```json
{
  "vehicle_number": "TN09JK7890",
  "vehicle_type": "trailer",
  "ownership_type": "leased",
  "capacity_kg": 15000.00,
  "day_limit": 365,
  "notes": "Leased from Chennai Heavy Vehicle Leasing for 1 year. Annual maintenance contract included.",
  
  "rc_book_number": "TN09202078901234",
  "rc_book_issue_date": "2020-08-12",
  "rc_book_expiry_date": "2025-08-11",
  "rc_book_issuing_authority": "Regional Transport Office, Chennai South",
  "rc_book_url": "https://storage.farmercrate.com/documents/lease/rc/TN09202078901234.pdf",
  
  "insurance_number": "UNITEDIND2024TN789",
  "insurance_issue_date": "2024-04-15",
  "insurance_expiry_date": "2025-04-14",
  "insurance_issuing_authority": "United India Insurance Company Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/lease/insurance/UNITEDIND2024TN789.pdf"
}
```

---

## Test Data 6: Temporary Vehicle - Rented Pickup

### Vehicle Details
```json
{
  "vehicle_number": "AP28LM1234",
  "vehicle_type": "pickup",
  "ownership_type": "temporary",
  "capacity_kg": 1200.00,
  "day_limit": 15,
  "notes": "Short-term rental from Hyderabad Quick Rentals for 2 weeks. Emergency backup vehicle.",
  
  "rc_book_number": "AP28202145678901",
  "rc_book_issue_date": "2021-04-20",
  "rc_book_expiry_date": "2026-04-19",
  "rc_book_issuing_authority": "Regional Transport Office, Hyderabad",
  "rc_book_url": "https://storage.farmercrate.com/documents/rental/rc/AP28202145678901.pdf",
  
  "insurance_number": "RELIANCEINS2024AP123",
  "insurance_issue_date": "2024-08-01",
  "insurance_expiry_date": "2025-07-31",
  "insurance_issuing_authority": "Reliance General Insurance Company Ltd",
  "insurance_url": "https://storage.farmercrate.com/documents/rental/insurance/RELIANCEINS2024AP123.pdf"
}
```

---

## Error Test Cases

### Test Case 1: Missing Required Documents
```bash
curl -X POST http://localhost:3000/api/vehicles/permanent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "vehicle_number": "ERROR01TEST",
    "vehicle_type": "truck",
    "capacity_kg": 5000.00,
    "make": "Test Make",
    "model": "Test Model",
    "chassis_number": "ERRORTEST123",
    "engine_number": "ERRORENG456"
  }'
```
**Expected Result**: 400 Bad Request with missing documents error

### Test Case 2: Duplicate Vehicle Number
```bash
# First create a vehicle, then try to create another with same number
curl -X POST http://localhost:3000/api/vehicles/permanent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "vehicle_number": "KA01AB1234",
    "vehicle_type": "truck",
    "capacity_kg": 5000.00,
    "make": "Duplicate Test",
    "model": "Should Fail",
    "chassis_number": "DUPLICATE123",
    "engine_number": "DUPLICATE456",
    "rc_book_number": "DUPLICATE789",
    "rc_book_issue_date": "2020-01-01",
    "rc_book_expiry_date": "2025-01-01",
    "rc_book_issuing_authority": "Test Authority",
    "rc_book_url": "https://example.com/test.pdf",
    "insurance_number": "DUPINS123",
    "insurance_issue_date": "2024-01-01",
    "insurance_expiry_date": "2025-01-01",
    "insurance_issuing_authority": "Test Insurance",
    "insurance_url": "https://example.com/test.pdf",
    "fitness_number": "DUPFIT123",
    "fitness_issue_date": "2024-01-01",
    "fitness_expiry_date": "2025-01-01",
    "fitness_issuing_authority": "Test Fitness",
    "fitness_url": "https://example.com/test.pdf",
    "pollution_number": "DUPPUC123",
    "pollution_issue_date": "2024-01-01",
    "pollution_expiry_date": "2025-01-01",
    "pollution_issuing_authority": "Test PUC",
    "pollution_url": "https://example.com/test.pdf"
  }'
```
**Expected Result**: 409 Conflict with duplicate vehicle number error

### Test Case 3: Expired Insurance
```bash
curl -X POST http://localhost:3000/api/vehicles/permanent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "vehicle_number": "EXPIRED123",
    "vehicle_type": "truck",
    "capacity_kg": 5000.00,
    "make": "Test Make",
    "model": "Test Model",
    "chassis_number": "EXPIREDTEST123",
    "engine_number": "EXPIREDENG456",
    "rc_book_number": "EXPIREDRC789",
    "rc_book_issue_date": "2020-01-01",
    "rc_book_expiry_date": "2025-01-01",
    "rc_book_issuing_authority": "Test Authority",
    "rc_book_url": "https://example.com/test.pdf",
    "insurance_number": "EXPIREDINS123",
    "insurance_issue_date": "2023-01-01",
    "insurance_expiry_date": "2024-01-01",
    "insurance_issuing_authority": "Test Insurance",
    "insurance_url": "https://example.com/test.pdf",
    "fitness_number": "EXPIREDFIT123",
    "fitness_issue_date": "2024-01-01",
    "fitness_expiry_date": "2025-01-01",
    "fitness_issuing_authority": "Test Fitness",
    "fitness_url": "https://example.com/test.pdf",
    "pollution_number": "EXPIREDPUC123",
    "pollution_issue_date": "2024-01-01",
    "pollution_expiry_date": "2025-01-01",
    "pollution_issuing_authority": "Test PUC",
    "pollution_url": "https://example.com/test.pdf"
  }'
```
**Expected Result**: 400 Bad Request with expired insurance error

---

## Additional API Test Commands

### Get Fleet Overview
```bash
curl -X GET http://localhost:3000/api/vehicles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Get Vehicle Details
```bash
curl -X GET http://localhost:3000/api/vehicles/permanent/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Update Vehicle Status
```bash
curl -X PATCH http://localhost:3000/api/vehicles/permanent/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "availability_status": "in_transit",
    "notes": "Delivering agricultural produce to Mysore market"
  }'
```

### Get Available Vehicles
```bash
curl -X GET http://localhost:3000/api/vehicles/status/available \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Update Vehicle Documents
```bash
curl -X PUT http://localhost:3000/api/vehicles/permanent/1/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "insurance_number": "RENEWED2024INS999",
    "insurance_expiry_date": "2026-04-30",
    "insurance_url": "https://storage.farmercrate.com/documents/renewed/insurance999.pdf"
  }'
```

---

## Testing Sequence Recommendation

1. **Authentication**: Register and login to get JWT token
2. **Create Permanent Vehicle**: Use Test Data 1 (KA01AB1234)
3. **Create Another Permanent Vehicle**: Use Test Data 2 (KA02CD5678)
4. **Create Temporary Vehicle**: Use Test Data 4 (MH12GH3456)
5. **Test Error Cases**: Try duplicate vehicle, missing documents, expired insurance
6. **Get Fleet Overview**: Verify all vehicles are listed
7. **Update Vehicle Status**: Test status changes
8. **Update Documents**: Test document updates
9. **Filter by Status**: Test status-based filtering

This comprehensive test data covers all major scenarios and edge cases for the vehicle management module.