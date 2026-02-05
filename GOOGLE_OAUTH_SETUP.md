# Google OAuth Implementation Guide

## Backend Implementation Complete ✅

The Google OAuth backend has been successfully implemented for FarmerCrate.

## Features Implemented

- Google Sign-In for Customer, Farmer, and Transporter roles
- Automatic user creation on first Google login
- Token-based authentication using JWT
- Role-based access control
- Verification status handling for Farmers and Transporters

## API Endpoint

### POST `/api/auth/google-signin`

**Request Body:**
```json
{
  "idToken": "google_id_token_from_frontend",
  "role": "customer" // or "farmer" or "transporter"
}
```

**Success Response (Customer):**
```json
{
  "message": "Google Sign-In successful",
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}
```

**Success Response (New Farmer):**
```json
{
  "message": "Farmer account created. Awaiting admin verification.",
  "user": {
    "id": 1,
    "email": "farmer@example.com",
    "name": "John Farmer",
    "role": "farmer",
    "verification_status": "pending"
  }
}
```

## Environment Variables

Already configured in `.env`:
```
GOOGLE_CLIENT_ID=850075546970-ht5596bvsemid65mtofatetijkrpb526.apps.googleusercontent.com
```

## Database Changes

Added `google_id` field to:
- `customer_users` table
- `farmers` table
- `transporters` table

## How It Works

1. **Frontend** sends Google ID token and role to backend
2. **Backend** verifies token with Google OAuth2Client
3. **Backend** extracts user info (email, name, picture)
4. **Backend** checks if user exists:
   - **If exists**: Login user and return JWT token
   - **If new**: Create user account based on role
5. **Role-specific behavior**:
   - **Customer**: Immediate access with JWT token
   - **Farmer**: Account created, awaits admin verification
   - **Transporter**: Account created, awaits admin verification

## Testing

### Using Postman/Thunder Client:

1. Get Google ID token from frontend
2. Send POST request to `http://localhost:3000/api/auth/google-signin`
3. Include body:
```json
{
  "idToken": "your_google_id_token",
  "role": "customer"
}
```

## Security Features

- ✅ Token verification with Google OAuth2Client
- ✅ JWT token generation for authenticated sessions
- ✅ Role-based access control
- ✅ Unique email constraint
- ✅ Automatic password generation for OAuth users
- ✅ Verification status checks for Farmers/Transporters

## Dependencies

Already installed in `package.json`:
- `google-auth-library`: ^10.5.0
- `jsonwebtoken`: ^9.0.2

## Next Steps

1. ✅ Backend implementation complete
2. ✅ Database models updated
3. ✅ API endpoint ready
4. Frontend should call this endpoint with Google ID token
5. Test the integration end-to-end

## Error Handling

The implementation handles:
- Invalid/expired Google tokens
- Missing required fields
- Invalid roles
- Duplicate email addresses
- Verification status restrictions
- Database errors

## Support

For issues or questions, check:
- Console logs for detailed error messages
- Database connection status
- Google OAuth credentials validity
