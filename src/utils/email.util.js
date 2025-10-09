const nodemailer = require('nodemailer');

const createTransporter = () => {
  const emailPassword = process.env.EMAIL_PASSWORD?.replace(/\s+/g, '');
  
  if (!emailPassword) {
    console.error('EMAIL_PASSWORD not configured');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'farmercrate@gmail.com',
      pass: emailPassword
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

exports.sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('Email transporter not configured');
      return false;
    }
    
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

    console.log('\n=== SENDING EMAIL ===');
    console.log('To:', email);
    console.log('OTP:', otp);
    console.log('From:', process.env.EMAIL_USER);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('=== EMAIL SENT ===\n');
    
    return true;
  } catch (error) {
    console.error('\n=== EMAIL ERROR ===');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Response:', error.response);
    console.error('=== END EMAIL ERROR ===\n');
    return false;
  }
};