const nodemailer = require('nodemailer');

const isUsableEmailPassword = (value) => {
  const pwd = String(value || '').trim();
  if (!pwd) return false;
  if (/^your[_-]?email[_-]?password/i.test(pwd)) return false;
  if (/^your[_-]?gmail[_-]?app[_-]?password/i.test(pwd)) return false;
  return true;
};

const createGmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: String(process.env.EMAIL_USER || '').trim(),
      pass: String(process.env.EMAIL_PASSWORD || '').trim(),
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
};

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

  const fromEmail = String(process.env.EMAIL_USER || '').trim();
  const emailPassword = String(process.env.EMAIL_PASSWORD || '').trim();

  if (!fromEmail) {
    console.error('⚠️  EMAIL_USER not set. Configure Gmail sender email.');
    return returnMeta
      ? { success: false, reason: 'EMAIL_USER_NOT_SET' }
      : false;
  }

  if (!isUsableEmailPassword(emailPassword)) {
    console.error('⚠️  EMAIL_PASSWORD not set/invalid. Use Gmail App Password for SMTP.');
    return returnMeta
      ? { success: false, reason: 'EMAIL_PASSWORD_NOT_SET_OR_INVALID' }
      : false;
  }
  
  try {
    const transporter = createGmailTransporter();

    const msg = {
      to: email,
      from: fromEmail,
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

    // Avoid hanging requests when SMTP is unreachable.
    const sendMailWithTimeout = () =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('SMTP send timeout')), 15000);
        transporter
          .sendMail(msg)
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });

    await sendMailWithTimeout();
    console.log('✅ Email sent via Gmail SMTP!');
    console.log('=== EMAIL SENT ===\n');
    return returnMeta
      ? { success: true, reason: null }
      : true;
  } catch (error) {
    console.error('\n=== EMAIL ERROR ===');
    console.error('Error:', error.message);

    if (String(error?.message || '').toLowerCase().includes('invalid login')) {
      console.error('⚠️  Gmail SMTP invalid login. Use a valid Gmail App Password (not normal Gmail password).');
    }

    console.error('=== END EMAIL ERROR ===\n');
    const lowerMessage = String(error?.message || '').toLowerCase();

    const reason = lowerMessage.includes('invalid login') || lowerMessage.includes('username and password not accepted')
      ? 'GMAIL_SMTP_AUTH_FAILED'
      : lowerMessage.includes('authentication')
        ? 'GMAIL_SMTP_AUTH_ERROR'
        : lowerMessage.includes('timed out')
          ? 'GMAIL_SMTP_TIMEOUT'
          : 'GMAIL_SMTP_SEND_FAILED';

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
