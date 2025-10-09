# Email Setup - Gmail SMTP

## Configuration
- Email: `farmercrate@gmail.com`
- Password: `ozihonxsuhkumrpp`
- Method: Gmail SMTP

## Deploy Steps

1. **Commit changes:**
```bash
git add .
git commit -m "Fix email configuration"
git push
```

2. **In Render Dashboard:**
   - Go to your service
   - Click "Manual Deploy" → "Clear build cache & deploy"
   - This will reinstall all dependencies including nodemailer

3. **Set Environment Variables (if not set):**
```
EMAIL_USER=farmercrate@gmail.com
EMAIL_PASSWORD=ozihonxsuhkumrpp
NODE_ENV=production
```

## Expected Result

**Locally:** ✅ Emails work  
**Production (Render):** ❌ Connection timeout (SMTP ports blocked)

## Why Production Fails

Render blocks SMTP ports 587 and 465. This is a hosting limitation, not a code issue.

## Solution

Use SendGrid instead (works on Render):
1. Sign up: https://signup.sendgrid.com/
2. Get API key
3. Add to Render: `SENDGRID_API_KEY=SG.xxx`
4. Update `src/utils/email.js` to use SendGrid

Or accept that emails only work locally for testing.
