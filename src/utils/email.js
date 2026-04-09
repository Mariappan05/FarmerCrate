const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

exports.sendOTPEmail = async (email, otp) => {
  return exports.sendOTPEmailWithContext(email, otp, {
    subject: 'FarmerCrate - First Login Verification',
    title: 'Welcome to FarmerCrate!',
    subtitle: 'Your verification code is:',
    expiryMinutes: 10,
  });
};

exports.sendOTPEmailWithContext = async (email, otp, options = {}) => {
  const expiryMinutes = Number(options.expiryMinutes) > 0 ? Number(options.expiryMinutes) : 10;
  const subject = options.subject || 'FarmerCrate - OTP Verification';
  const title = options.title || 'FarmerCrate Verification';
  const subtitle = options.subtitle || 'Your verification code is:';
  const returnMeta = options.returnMeta === true;

  console.log('\n=== SENDING EMAIL ===');
  console.log('From:', process.env.EMAIL_USER);
  console.log('To:', email);
  console.log('OTP:', otp);
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('⚠️  SENDGRID_API_KEY not set. Get it from: https://signup.sendgrid.com/');
    return returnMeta
      ? { success: false, reason: 'SENDGRID_API_KEY_NOT_SET' }
      : false;
  }

  if (!process.env.EMAIL_USER) {
    console.error('⚠️  EMAIL_USER not set. Configure verified sender email.');
    return returnMeta
      ? { success: false, reason: 'EMAIL_USER_NOT_SET' }
      : false;
  }
  
  try {
    const msg = {
      to: email,
      from: process.env.EMAIL_USER,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FarmerCrate</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">${title}</h2>
            <p style="color: #666; font-size: 16px;">${subtitle}</p>
            <div style="background-color: white; padding: 25px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #4CAF50;">
              <h1 style="color: #4CAF50; font-size: 42px; margin: 0; letter-spacing: 8px;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">⏰ This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
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
    return returnMeta
      ? { success: true, reason: null }
      : true;
  } catch (error) {
    console.error('\n=== EMAIL ERROR ===');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status Code:', error.response.statusCode);
      console.error('Response Body:', JSON.stringify(error.response.body, null, 2));
    }
    
    if (error.message === 'Forbidden') {
      console.error('\n⚠️  SENDER EMAIL NOT VERIFIED');
      console.error('You MUST verify farmercrate@gmail.com in SendGrid:');
      console.error('1. Go to: https://app.sendgrid.com/settings/sender_auth');
      console.error('2. Click "Verify a Single Sender"');
      console.error('3. Enter: farmercrate@gmail.com');
      console.error('4. Check farmercrate@gmail.com inbox');
      console.error('5. Click verification link');
    }
    
    console.error('=== END EMAIL ERROR ===\n');
    const reason = error?.response?.statusCode === 403
      ? 'SENDGRID_FORBIDDEN_OR_SENDER_NOT_VERIFIED'
      : error?.response?.statusCode
        ? `SENDGRID_HTTP_${error.response.statusCode}`
        : 'SENDGRID_SEND_FAILED';

    return returnMeta
      ? {
          success: false,
          reason,
          message: error?.message || 'Email send failed',
        }
      : false;
  }
};

exports.sendDeliveryCompletionOTPEmail = async (email, otp, expiryMinutes = 5, returnMeta = false) => {
  return exports.sendOTPEmailWithContext(email, otp, {
    subject: 'FarmerCrate - Delivery Completion OTP',
    title: 'Delivery Confirmation Required',
    subtitle: 'Share this OTP with the delivery person to complete your order:',
    expiryMinutes,
    returnMeta,
  });
};
