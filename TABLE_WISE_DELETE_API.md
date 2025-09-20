# TABLE-WISE CASCADE DELETE API

## 🗂️ **Table-Specific User Deletion with CASCADE**

This API allows administrators to delete users from specific database tables using CASCADE delete operations. Each delete operation permanently removes the user record and all related data from the database.

## 📋 **Available Tables & Endpoints**

### 🌾 **farmer_users Table**
```http
DELETE /api/admin/tables/farmer_users/{farmerId}
```
**Deletes from farmer_users table with CASCADE:**
- ✅ farmer_users record
- 🔄 CASCADE: products table (all farmer's products)
- 🔄 CASCADE: orders table (orders for farmer's products)
- 🔄 CASCADE: transactions table (farmer transactions)
- 🔄 CASCADE: cart table (cart items with farmer's products)
- 🔄 CASCADE: wishlists table (wishlist items with farmer's products)

### 👤 **customer_users Table**
```http
DELETE /api/admin/tables/customer_users/{customerId}
```
**Deletes from customer_users table with CASCADE:**
- ✅ customer_users record
- 🔄 CASCADE: orders table (customer orders)
- 🔄 CASCADE: cart table (customer cart items)
- 🔄 CASCADE: wishlists table (customer wishlist items)

### 🚚 **transporter_users Table**
```http
DELETE /api/admin/tables/transporter_users/{transporterId}
```
**Deletes from transporter_users table with CASCADE:**
- ✅ transporter_users record
- 🔄 CASCADE: delivery_persons table (all delivery staff)
- 🔄 CASCADE: permanent_vehicles table (all permanent vehicles)
- 🔄 CASCADE: temporary_vehicles table (all temporary vehicles)
- 🔄 CASCADE: permanent_vehicle_documents table
- 🔄 CASCADE: temporary_vehicle_documents table

### 🏍️ **delivery_persons Table**
```http
DELETE /api/admin/tables/delivery_persons/{deliveryPersonId}
```
**Deletes from delivery_persons table with CASCADE:**
- ✅ delivery_persons record
- 🔄 SET NULL: orders.delivery_person_id (orders remain, reference set to NULL)

### 👨‍💼 **admin_users Table**
```http
DELETE /api/admin/tables/admin_users/{adminId}
```
**Deletes from admin_users table with CASCADE:**
- ✅ admin_users record
- 🚫 Cannot delete own admin account (security prevention)

### 🔗 **Generic Table Delete**
```http
DELETE /api/admin/tables/{tableName}/{userId}
```
**Supported table names:**
- `farmer_users`
- `customer_users` 
- `transporter_users`
- `delivery_persons`
- `admin_users`

## 📨 **Request Format**

### Headers
```http
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json
```

### URL Parameters
- `{tableName}` - Database table name
- `{userId}` - ID of user to delete from specified table

## 📤 **Response Format**

### ✅ **Success Response**
```json
{
  "success": true,
  "message": "Record deleted from {table_name} table with CASCADE",
  "data": {
    "deleted_from_table": "farmer_users",
    "deleted_at": "2025-09-20T10:30:00.000Z",
    "deleted_by": 1,
    "cascade_impact": {
      "table": "farmer_users",
      "farmer_id": 123,
      "farmer_name": "John Doe",
      "farmer_email": "john@example.com",
      "related_data_deleted": {
        "products": 5,
        "orders": 12,
        "transactions": 8
      }
    },
    "note": "All related products, orders, transactions, cart items, and wishlists were CASCADE deleted"
  }
}
```

### ❌ **Error Response**
```json
{
  "success": false,
  "message": "Farmer not found in farmer_users table"
}
```

## 🧪 **Testing Examples**

### Example 1: Delete from farmer_users table
```bash
curl -X DELETE \
  "http://localhost:3000/api/admin/tables/farmer_users/123" \
  -H "Authorization: Bearer {admin_token}"
```

### Example 2: Delete from customer_users table
```bash
curl -X DELETE \
  "http://localhost:3000/api/admin/tables/customer_users/456" \
  -H "Authorization: Bearer {admin_token}"
```

### Example 3: Generic table delete
```bash
curl -X DELETE \
  "http://localhost:3000/api/admin/tables/transporter_users/789" \
  -H "Authorization: Bearer {admin_token}"
```

## 🔒 **Security & Validation**

### ✅ **Security Features**
- 🔐 Admin authentication required
- 🚫 Self-deletion prevention for admin accounts
- ✅ User ID validation (must be numeric)
- ✅ Table name validation (only allowed tables)
- ✅ Existence check before deletion

### ⚠️ **Validation Rules**
- User ID must be a valid number
- Table name must be from supported list
- Admin cannot delete their own account
- User must exist in specified table

## 📊 **CASCADE Impact Analysis**

Each delete operation returns detailed impact analysis:

| Table | Direct Delete | CASCADE Deletes | SET NULL |
|-------|---------------|-----------------|----------|
| farmer_users | farmer record | products, orders, transactions, cart, wishlists | - |
| customer_users | customer record | orders, cart, wishlists | - |
| transporter_users | transporter record | delivery_persons, vehicles, documents | - |
| delivery_persons | delivery person | - | orders.delivery_person_id |
| admin_users | admin record | - | - |

## ⚡ **Database Behavior**

### 🔥 **Hard Delete Guarantees**
- **Complete Removal**: Records permanently deleted from database
- **CASCADE Automatic**: Related data automatically removed via foreign keys
- **Force Delete**: Uses `destroy({ force: true })` for permanent deletion
- **No Recovery**: Deleted data cannot be restored

### 🔗 **Foreign Key Relationships**
All CASCADE deletes work through properly configured foreign key constraints:
```sql
-- Example CASCADE relationship
ALTER TABLE products 
ADD CONSTRAINT fk_farmer_products 
FOREIGN KEY (farmer_id) 
REFERENCES farmer_users(id) 
ON DELETE CASCADE;
```

## 🚨 **Important Warnings**

❗ **PERMANENT DELETION**: All table-wise deletes are irreversible
❗ **CASCADE IMPACT**: Deletion affects multiple related tables
❗ **BACKUP REQUIRED**: Always backup database before production deletions
❗ **BUSINESS IMPACT**: Verify business logic before deleting active users

---
**TABLE-WISE DELETE**: Complete control over which database table to delete from with full CASCADE impact visibility.