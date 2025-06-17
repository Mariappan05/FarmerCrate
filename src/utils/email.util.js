const nodemailer = require('nodemailer');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'farmercrate@gmail.com',
    pass: process.env.EMAIL_PASSWORD // Use the App Password generated from Google Account
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Function to send OTP email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: 'farmercrate@gmail.com',
    to: email,
    subject: 'Password Reset OTP - Farmer Crate',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>You have requested to reset your password. Please use the following OTP to proceed:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="color: #27ae60; margin: 0; font-size: 32px;">${otp}</h1>
        </div>
        <p>This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 20px;">
          Best regards,<br>
          Farmer Crate Team
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail
}; 