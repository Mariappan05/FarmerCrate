// SMS utility for sending verification codes using Twilio
// Make sure to set up your environment variables for Twilio

// Generate 6-digit numeric verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendSMS = async (mobileNumber, message) => {
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn('Twilio not configured. Using mock SMS for development.');
      console.log(`[MOCK SMS] To: ${mobileNumber}, Message: ${message}`);
      return true; // Return true for development
    }

    // Use Twilio for real SMS sending
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber
    });
    
    console.log(`SMS sent successfully to ${mobileNumber}. SID: ${result.sid}`);
    return true;
    
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Log specific Twilio errors
    if (error.code) {
      console.error(`Twilio Error Code: ${error.code}`);
      console.error(`Twilio Error Message: ${error.message}`);
    }
    
    return false;
  }
};

// Function to send verification code via SMS
const sendVerificationCodeSMS = async (mobileNumber, verificationCode) => {
  const message = `Your FarmerCrate verification code is: ${verificationCode}. Keep this code safe for account verification. Valid for 24 hours.`;
  
  return await sendSMS(mobileNumber, message);
};

// Function to send OTP for password reset via SMS
const sendOTPSMS = async (mobileNumber, otp) => {
  const message = `Your FarmerCrate password reset OTP is: ${otp}. This OTP is valid for 10 minutes. If you didn't request this, please ignore this message.`;
  
  return await sendSMS(mobileNumber, message);
};

// Function to send approval notification via SMS
const sendApprovalNotificationSMS = async (mobileNumber, farmerName) => {
  const message = `Dear ${farmerName}, your FarmerCrate account has been approved! You can now start selling your products. Check your SMS for verification code.`;
  
  return await sendSMS(mobileNumber, message);
};

// Function to send rejection notification via SMS
const sendRejectionNotificationSMS = async (mobileNumber, farmerName, reason) => {
  const message = `Dear ${farmerName}, your FarmerCrate account application was not approved. Reason: ${reason}. Please contact support for assistance.`;
  
  return await sendSMS(mobileNumber, message);
};

// Function to send delivery person credentials via SMS
const sendCredentialsSMS = async (mobileNumber, username, password) => {
  const message = `Welcome to FarmerCrate Delivery! Your login credentials: Username: ${username}, Password: ${password}. Please keep this information secure.`;
  
  return await sendSMS(mobileNumber, message);
};

module.exports = {
  sendSMS,
  generateVerificationCode,
  sendVerificationCodeSMS,
  sendOTPSMS,
  sendApprovalNotificationSMS,
  sendRejectionNotificationSMS,
  sendCredentialsSMS
}; 