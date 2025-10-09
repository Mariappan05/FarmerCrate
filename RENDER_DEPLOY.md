# Deploy to Render

## Steps

1. **Commit and push:**
```bash
git add .
git commit -m "Add email debug logging"
git push
```

2. **In Render Dashboard:**
   - Go to your service
   - Click "Manual Deploy"
   - Select "Clear build cache & deploy"
   - Wait for deployment to complete

3. **Check logs for:**
```
Nodemailer loaded: object
createTransporter exists: function
```

If you see:
```
Nodemailer loaded: undefined
```

Then nodemailer isn't installed. In Render, check:
- Build logs show `npm install` ran
- `package.json` has `"nodemailer": "^6.9.1"`

## If nodemailer still doesn't work

The only solution is to use SendGrid (no SMTP):

1. Get API key: https://signup.sendgrid.com/
2. Add to Render: `SENDGRID_API_KEY=SG.xxx`
3. Replace email.js with SendGrid code

Gmail SMTP will NOT work on Render regardless.
