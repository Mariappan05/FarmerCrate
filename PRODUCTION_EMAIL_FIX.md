# Production Email Fix - Connection Timeout Issue

## Problem
```
From: farmercrate@gmail.com
To: 2215404@nec.edu.in
OTP: 190758
=== SENDING EMAIL ===
connection timeout
```

## Root Cause
**Hosting providers (Render, Vercel, Railway, Heroku) BLOCK SMTP ports 587 and 465** for security reasons.

## ✅ Solution 1: Use SendGrid (RECOMMENDED)

SendGrid uses HTTP API instead of SMTP, so it works on all hosting platforms.

### Step 1: Create SendGrid Account
1. Go to: https://sendgrid.com/
2. Sign up for FREE account (100 emails/day free)
3. Verify your email
4. Go to Settings → API Keys
5. Create API Key → Copy it

### Step 2: Install SendGrid
```bash
npm install @sendgrid/mail
```

### Step 3: Update Environment Variables
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your_actual_api_key_here
EMAIL_USER=farmercrate@gmail.com
```

### Step 4: Use SendGrid Email Utility

Create `src/utils/email.sendgrid.js`:
```javascript
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendOTPEmail = async (email, otp) => {
  try {
    const msg = {
      to: email,
      from: process.env.EMAIL_USER,
      subject: 'FarmerCrate - First Login Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Welcome to FarmerCrate!</h2>
          <p>Your verification code for first login is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px;">
            <h1 style="color: #4CAF50; font-size: 36px; margin: 0;">${otp}</h1>
          </div>
          <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('✅ Email sent via SendGrid');
    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
};
```

---

## ✅ Solution 2: Use Mailgun

### Step 1: Create Mailgun Account
1. Go to: https://www.mailgun.com/
2. Sign up (Free: 5,000 emails/month)
3. Get API Key and Domain

### Step 2: Install Mailgun
```bash
npm install mailgun-js
```

### Step 3: Environment Variables
```env
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.mailgun.org
EMAIL_USER=farmercrate@gmail.com
```

---

## ✅ Solution 3: Use AWS SES

### Step 1: Setup AWS SES
1. Go to AWS Console → SES
2. Verify email address
3. Create SMTP credentials

### Step 2: Environment Variables
```env
EMAIL_SERVICE=aws-ses
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
EMAIL_USER=farmercrate@gmail.com
```

---

## ⚠️ Solution 4: Try Gmail with Port 465 (May Not Work)

Some hosting providers allow port 465 (SSL):

```javascript
// In email.util.js
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

---

## 🚀 Quick Fix: Use SendGrid (5 Minutes)

### 1. Install SendGrid
```bash
npm install @sendgrid/mail
```

### 2. Get API Key
- Go to: https://app.sendgrid.com/settings/api_keys
- Create API Key
- Copy it

### 3. Set Environment Variable in Production
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=sendgrid
```

### 4. Update auth.controller.js

Replace this line:
```javascript
const { sendOTPEmail } = require('../utils/email.util');
```

With:
```javascript
const { sendOTPEmail } = process.env.EMAIL_SERVICE === 'sendgrid' 
  ? require('../utils/email.sendgrid')
  : require('../utils/email.util');
```

### 5. Deploy and Test ✅

---

## Why Gmail SMTP Doesn't Work in Production

| Hosting Provider | Port 587 | Port 465 | Port 25 |
|-----------------|----------|----------|---------|
| Render          | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| Vercel          | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| Railway         | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| Heroku          | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| AWS EC2         | ✅ Works  | ✅ Works  | ❌ Blocked |
| DigitalOcean    | ✅ Works  | ✅ Works  | ❌ Blocked |

**Solution**: Use HTTP-based email services (SendGrid, Mailgun, AWS SES)

---

## Recommended: SendGrid

✅ **Free Tier**: 100 emails/day  
✅ **No SMTP**: Uses HTTP API  
✅ **Works Everywhere**: No port blocking  
✅ **Easy Setup**: 5 minutes  
✅ **Reliable**: 99.9% uptime  

---

## Test After Fix

```bash
# Test email sending
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"John Doe","password":"customer123"}'
```

Check logs for:
```
✅ Email sent via SendGrid
```

---

## Status: 🔧 ACTION REQUIRED

**Choose one solution above and implement it to fix the production email issue.**

**Recommended**: Use SendGrid (Solution 1) - Takes only 5 minutes!
