// Unified email handler - tries SendGrid first, falls back to Gmail SMTP

const sendViaSendGrid = async (email, otp) => {
  try {
    const sgMail = require('@sendgrid/mail');
    
    if (!process.env.SENDGRID_API_KEY) {
      return { success: false, error: 'SENDGRID_API_KEY not configured' };
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: email,
      from: process.env.EMAIL_USER || 'farmercrate@gmail.com',
      subject: 'FarmerCrate - First Login Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FarmerCrate</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Welcome to FarmerCrate!</h2>
            <p style="color: #666; font-size: 16px;">Your verification code for first login is:</p>
            <div style="background-color: white; padding: 25px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #4CAF50;">
              <h1 style="color: #4CAF50; font-size: 42px; margin: 0; letter-spacing: 8px;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              ⏰ This code will expire in <strong>10 minutes</strong>.
            </p>
            <p style="color: #999; font-size: 13px; margin-top: 30px;">
              If you didn't request this code, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              © 2024 FarmerCrate. All rights reserved.
            </p>
          </div>
        </div>
      `
    };
    
    await sgMail.send(msg);
    return { success: true, method: 'SendGrid' };
  } catch (error) {
    return { success: false, error: error.message, method: 'SendGrid' };
  }
};

const sendViaGmail = async (email, otp) => {
  try {
    const nodemailer = require('nodemailer');
    const emailPassword = process.env.EMAIL_PASSWORD?.replace(/\s+/g, '');
    
    if (!emailPassword) {
      return { success: false, error: 'EMAIL_PASSWORD not configured' };
    }
    
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword
      },
      tls: { rejectUnauthorized: false }
    });
    
    const mailOptions = {
      from: `FarmerCrate <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'FarmerCrate - First Login Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Welcome to FarmerCrate!</h2>
          <p>Your verification code for first login is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px;">
            <h1 style="color: #4CAF50; font-size: 36px; margin: 0;">${otp}</h1>
          </div>
          <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    return { success: true, method: 'Gmail SMTP' };
  } catch (error) {
    return { success: false, error: error.message, method: 'Gmail SMTP' };
  }
};

exports.sendOTPEmail = async (email, otp) => {
  console.log('\n=== SENDING EMAIL ===');
  console.log('From:', process.env.EMAIL_USER);
  console.log('To:', email);
  console.log('OTP:', otp);
  console.log('Environment:', process.env.NODE_ENV);
  
  // Try SendGrid first (works in production)
  if (process.env.SENDGRID_API_KEY) {
    console.log('Attempting SendGrid...');
    const result = await sendViaSendGrid(email, otp);
    
    if (result.success) {
      console.log('✅ Email sent via SendGrid!');
      console.log('=== EMAIL SENT ===\n');
      return true;
    }
    
    console.log('❌ SendGrid failed:', result.error);
  }
  
  // Fallback to Gmail SMTP (works locally)
  console.log('Attempting Gmail SMTP...');
  const result = await sendViaGmail(email, otp);
  
  if (result.success) {
    console.log('✅ Email sent via Gmail SMTP!');
    console.log('=== EMAIL SENT ===\n');
    return true;
  }
  
  console.error('❌ Gmail SMTP failed:', result.error);
  console.error('=== EMAIL ERROR ===\n');
  return false;
};
