// Google OAuth Backend Test Example
// Use this with Postman, Thunder Client, or any HTTP client

/**
 * ENDPOINT: POST http://localhost:3000/api/auth/google-signin
 * 
 * HEADERS:
 * Content-Type: application/json
 * 
 * BODY (JSON):
 */

// Example 1: Customer Sign-In
const customerSignIn = {
  "idToken": "YOUR_GOOGLE_ID_TOKEN_FROM_FRONTEND",
  "role": "customer"
};

// Example 2: Farmer Sign-In
const farmerSignIn = {
  "idToken": "YOUR_GOOGLE_ID_TOKEN_FROM_FRONTEND",
  "role": "farmer"
};

// Example 3: Transporter Sign-In
const transporterSignIn = {
  "idToken": "YOUR_GOOGLE_ID_TOKEN_FROM_FRONTEND",
  "role": "transporter"
};

/**
 * EXPECTED RESPONSES:
 */

// Success - Customer (New or Existing)
const customerResponse = {
  "message": "Google Sign-In successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "customer@example.com",
    "name": "John Doe",
    "role": "customer"
  }
};

// Success - New Farmer (Needs Verification)
const newFarmerResponse = {
  "message": "Farmer account created. Awaiting admin verification.",
  "user": {
    "id": 1,
    "email": "farmer@example.com",
    "name": "John Farmer",
    "role": "farmer",
    "verification_status": "pending"
  }
};

module.exports = {
  customerSignIn,
  farmerSignIn,
  transporterSignIn
};
