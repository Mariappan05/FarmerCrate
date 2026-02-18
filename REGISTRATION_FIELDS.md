# Required Fields for User Registration

## Customer Registration
**Endpoint:** POST `/api/auth/register`
**Required Fields:**
- `role`: "customer"
- `name`: string
- `email`: string (unique)
- `password`: string
- `mobile_number`: string (unique)

**Optional Fields:**
- `address`: string
- `zone`: string
- `state`: string
- `district`: string
- `age`: number
- `image_url`: string

---

## Farmer Registration
**Endpoint:** POST `/api/auth/register`
**Required Fields:**
- `role`: "farmer"
- `name`: string
- `email`: string (unique)
- `password`: string
- `mobile_number`: string (unique)

**Optional Fields:**
- `address`: string
- `zone`: string
- `state`: string
- `district`: string
- `age`: number
- `account_number`: string
- `ifsc_code`: string
- `image_url`: string

**Note:** Farmer accounts require admin verification before they can login.

---

## Transporter Registration
**Endpoint:** POST `/api/auth/register`
**Required Fields:**
- `role`: "transporter"
- `name`: string
- `email`: string (unique)
- `password`: string
- `mobileNumber`: string (unique)

**Optional Fields:**
- `address`: string
- `zone`: string
- `state`: string
- `district`: string
- `age`: number
- `image_url`: string
- `aadhar_url`: string
- `pan_url`: string
- `voter_id_url`: string
- `license_url`: string
- `aadhar_number`: string
- `pan_number`: string
- `pincode`: string
- `voter_id_number`: string
- `license_number`: string
- `account_number`: string
- `ifsc_code`: string

**Note:** Transporter accounts require admin verification before they can login.

---

## Google Sign-In Profile Completion
**Endpoint:** POST `/api/auth/google-complete-profile`
**Required Fields:**
- `email`: string (from Google)
- `name`: string (from Google)
- `googleId`: string (from Google)
- `role`: "customer" | "farmer" | "transporter"
- `mobile_number`: string (unique)

**Optional Fields:**
- `address`: string
- `zone`: string
- `state`: string
- `district`: string
- `age`: number
- `image_url`: string (from Google profile picture)
- For farmers: `account_number`, `ifsc_code`
- For transporters: all document fields

---

## Validation Rules
- Email must be unique across ALL roles
- Mobile number must be unique across ALL roles
- Password minimum length: 6 characters (for regular registration)
- Google sign-in users get a random password generated automatically
