# Vehicle Controller Updated for Model Structure

The vehicle controller has been completely rewritten to match your exact model definitions.

## Updated Vehicle Controller Features:

### Model Alignment:
- **PermanentVehicle**: Uses `vehicle_id` as primary key, `transporter_id` foreign key
- **TemporaryVehicle**: Uses `vehicle_id` as primary key, `transporter_id` foreign key  
- **PermanentVehicleDocument**: Uses `perm_doc_id` as primary key, `vehicle_id` foreign key

### Controller Methods:

#### 1. `getAllVehicles()` ✅
- Fetches both permanent and temporary vehicles for authenticated transporter
- Includes document associations for permanent vehicles
- Provides fleet statistics (total, available, etc.)
- Uses correct `transporter_id` from JWT token

#### 2. `addPermanentVehicle()` ✅
- Creates permanent vehicle with atomic transaction
- Uses correct field names: `vehicle_number`, `vehicle_type`, `capacity`
- Supports document creation with `vehicle_id` reference
- Validates unique `vehicle_number`
- Uses `transporter_id` from authenticated user

#### 3. `addTemporaryVehicle()` ✅
- Creates temporary vehicle with rental dates
- Uses model fields: `rental_start_date`, `rental_end_date`
- Includes document fields: `rc_book_number`, `rc_book_url`, etc.
- Validates unique `vehicle_number`

#### 4. `updateVehicleAvailability()` ✅
- Updates `is_available` status for both vehicle types
- Uses `vehicle_id` parameter matching model primary key
- Validates transporter ownership

#### 5. `deleteVehicle()` ✅
- Deletes vehicle by `vehicle_id` and `vehicle_type`
- Validates transporter ownership
- Supports both permanent and temporary vehicles

### Routes Updated:

#### Vehicle Routes ✅
- **GET** `/api/vehicles` - Get all vehicles
- **POST** `/api/vehicles/permanent` - Add permanent vehicle
- **POST** `/api/vehicles/temporary` - Add temporary vehicle  
- **PATCH** `/api/vehicles/:vehicle_id/availability` - Update availability
- **DELETE** `/api/vehicles/:vehicle_id` - Delete vehicle

### Key Model Alignments:

#### Primary Keys:
- `vehicle_id` for both PermanentVehicle and TemporaryVehicle
- `perm_doc_id` for PermanentVehicleDocument
- `transporter_id` for transporter reference

#### Field Names:
- `vehicle_number` (unique constraint)
- `vehicle_type` (ENUM: bike, auto, van, truck)
- `capacity` (integer)
- `is_available` (boolean)
- `rental_start_date`, `rental_end_date` (temporary vehicles)

#### Document Fields:
- `rc_url`, `insurance_url`, `permit_url` (permanent vehicles)
- `rc_book_number`, `rc_book_url`, `insurance_number`, `insurance_url` (temporary vehicles)

### Authentication:
- Uses `protect` and `authorize('transporter')` middleware
- Validates `transporter_id` from JWT token
- Ensures transporters can only manage their own vehicles

## Controller Now Matches Models ✅
The vehicle controller is now fully aligned with your model structure and will work seamlessly with your database schema!