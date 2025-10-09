const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

exports.sendOTPEmail = async (email, otp) => {
  console.log('\n=== SENDING EMAIL ===');
  console.log('From:', process.env.EMAIL_USER);
  console.log('To:', email);
  console.log('OTP:', otp);
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('⚠️  SENDGRID_API_KEY not set. Get it from: https://signup.sendgrid.com/');
    return false;
  }
  
  try {
    const msg = {
      to: email,
      from: process.env.EMAIL_USER,
      subject: 'FarmerCrate - First Login Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FarmerCrate</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Welcome to FarmerCrate!</h2>
            <p style="color: #666; font-size: 16px;">Your verification code is:</p>
            <div style="background-color: white; padding: 25px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #4CAF50;">
              <h1 style="color: #4CAF50; font-size: 42px; margin: 0; letter-spacing: 8px;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">⏰ This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #999; font-size: 13px; margin-top: 30px;">If you didn't request this, ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© 2024 FarmerCrate. All rights reserved.</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('✅ Email sent via SendGrid!');
    console.log('=== EMAIL SENT ===\n');
    return true;
  } catch (error) {
    console.error('\n=== EMAIL ERROR ===');
    console.error('Error:', error.message);
    console.error('=== END EMAIL ERROR ===\n');
    return false;
  }
};
