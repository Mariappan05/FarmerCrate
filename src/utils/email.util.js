const nodemailer = require('nodemailer');

// Create transporter with better error handling
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'farmercrate@gmail.com',
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Send OTP email
exports.sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'farmercrate@gmail.com',
      to: email,
      subject: 'FarmerCrate - First Login Verification',
      html: `
        <h2>Welcome to FarmerCrate!</h2>
        <p>Your verification code for first login is:</p>
        <h1 style="color: #4CAF50; font-size: 32px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};