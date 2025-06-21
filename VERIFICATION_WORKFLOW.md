# FarmerCrate Admin Verification Workflow

## Overview
This document describes the complete workflow for admin verification of farmer accounts in the FarmerCrate application.

## Workflow Steps

### 1. Farmer Registration
- Farmer registers with all required details
- Account is created with `verified_status: false`
- Farmer receives message: "Farmer registered successfully. Await admin approval."

### 2. Admin Review Process
- Admin logs into the system
- Admin views dashboard statistics showing pending farmers
- Admin reviews pending farmer applications
- Admin can approve or reject farmers

### 3. Farmer Approval
When admin approves a farmer:
- `verified_status` is set to `true`
- A unique verification code (`unique_id`) is generated using UUID
- `approved_at` timestamp is recorded
- `approval_notes` are stored (optional)
- Verification code is automatically sent to farmer's email
- Farmer can now use the platform to sell products

### 4. Farmer Rejection
When admin rejects a farmer:
- `verified_status` remains `false`
- `rejected_at` timestamp is recorded
- `rejection_reason` is stored (required)
- Farmer can reapply or contact support

### 5. Verification Code Management
- Admin can resend verification codes to approved farmers
- Each resend generates a new unique code
- `code_updated_at` timestamp tracks when code was last updated

## API Endpoints

### Admin Dashboard
```
GET /api/admin/dashboard-stats
```
Returns statistics including pending and verified farmer counts.

### Farmer Management
```
GET /api/admin/farmers/pending          # Get unverified farmers
GET /api/admin/farmers/verified         # Get approved farmers
GET /api/admin/farmers/:id/verification-status  # Get detailed status
```

### Approval/Rejection
```
PUT /api/admin/farmers/:id/approve      # Approve farmer
PUT /api/admin/farmers/:id/reject       # Reject farmer
```

### Code Management
```
POST /api/admin/farmers/:id/resend-code # Resend verification code
```

## Database Schema Updates

### Farmer User Model
Added new fields for verification workflow:
```javascript
{
  // Existing fields...
  approved_at: { type: DataTypes.DATE, allowNull: true },
  approval_notes: { type: DataTypes.TEXT, allowNull: true },
  rejected_at: { type: DataTypes.DATE, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  code_updated_at: { type: DataTypes.DATE, allowNull: true }
}
```

## Email Integration

### Verification Code Email
When a farmer is approved, an email is sent containing:
- Unique verification code (UUID)
- Instructions for using the code
- Contact information for support

### Email Template Example
```
Subject: Your FarmerCrate Account Has Been Approved

Dear [Farmer Name],

Your FarmerCrate account has been approved! You can now start selling your products on our platform.

Your verification code is: [UNIQUE_ID]

Please keep this code safe as you may need it for account verification.

Best regards,
FarmerCrate Team
```

## Security Features

### UUID Generation
- Uses cryptographically secure UUID v4
- Each code is unique across the entire system
- Codes are regenerated on each resend

### Access Control
- Only admin users can access verification endpoints
- JWT authentication required for all admin operations
- Role-based access control ensures proper authorization

### Data Integrity
- Approval/rejection timestamps for audit trail
- Required rejection reasons for transparency
- Immutable verification status once approved

## Testing Workflow

### Complete Test Flow
1. Register a new farmer account
2. Admin logs in and checks dashboard
3. Admin views pending farmers list
4. Admin approves farmer with notes
5. Verify farmer appears in verified list
6. Check verification status details
7. Test resend verification code functionality
8. Test rejection workflow (if needed)

### Error Scenarios
- Try to approve already verified farmer
- Try to reject without providing reason
- Try to resend code to unverified farmer
- Access non-existent farmer records

## Benefits of This Workflow

### For Admins
- Centralized control over farmer verification
- Audit trail for all approval/rejection decisions
- Dashboard statistics for monitoring
- Ability to manage verification codes

### For Farmers
- Clear approval/rejection feedback
- Secure verification process
- Email notifications for status changes
- Ability to reapply if rejected

### For Platform
- Quality control over seller accounts
- Reduced fraud and spam accounts
- Professional verification process
- Scalable admin management system

## Implementation Notes

### Database Migration
The new fields will be automatically added when the application starts due to Sequelize's `alter: true` setting.

### Email Service
Ensure the email service is properly configured for sending verification codes.

### Error Handling
All endpoints include proper error handling and validation.

### Logging
All admin actions are logged for audit purposes.

## Future Enhancements

### Potential Improvements
- Bulk approval/rejection functionality
- Email templates customization
- Advanced filtering and search for farmers
- Automated verification based on criteria
- Integration with external verification services
- Mobile app notifications for status changes 