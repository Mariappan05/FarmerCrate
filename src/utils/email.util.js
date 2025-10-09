const nodemailer = require('nodemailer');

const createTransporter = () => {
  const emailPassword = process.env.EMAIL_PASSWORD?.replace(/\s+/g, '');
  
  if (!emailPassword) {
    console.error('EMAIL_PASSWORD not configured');
    return null;
  }
  
  return nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'farmercrate@gmail.com',
      pass: emailPassword
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
};

exports.sendOTPEmail = async (email, otp) => {
  console.log('\n=== SENDING EMAIL ===');
  console.log('From:', process.env.EMAIL_USER);
  console.log('To:', email);
  console.log('OTP:', otp);
  console.log('Environment:', process.env.NODE_ENV);
  
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('Email transporter not configured');
      return false;
    }
    
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified!');
    
    const mailOptions = {
      from: `FarmerCrate <${process.env.EMAIL_USER || 'farmercrate@gmail.com'}>`,
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
          <p style="color: #666;">If you didn't request this, please ignore this email.</p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px;">© 2024 FarmerCrate. All rights reserved.</p>
        </div>
      `
    };
    
    console.log('Sending email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('=== EMAIL SENT ===\n');
    
    return true;
  } catch (error) {
    console.error('\n=== EMAIL ERROR ===');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Command:', error.command);
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.error('\n⚠️  CONNECTION TIMEOUT - Possible causes:');
      console.error('1. Hosting provider blocking SMTP ports (587/465)');
      console.error('2. Firewall blocking outbound SMTP');
      console.error('3. Gmail blocking connection from server IP');
      console.error('\nSolution: Use SendGrid/Mailgun/AWS SES instead of Gmail SMTP');
    }
    
    if (error.responseCode === 535) {
      console.error('\n⚠️  AUTHENTICATION FAILED');
      console.error('Check: Gmail App Password is correct');
      console.error('Check: 2-Step Verification is enabled');
    }
    
    console.error('=== END EMAIL ERROR ===\n');
    return false;
  }
};