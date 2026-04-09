const nodemailer = require('nodemailer');
const axios = require('axios');

const isUsableEmailPassword = (value) => {
  const pwd = String(value || '').trim();
  if (!pwd) return false;
  if (/^your[_-]?email[_-]?password/i.test(pwd)) return false;
  if (/^your[_-]?gmail[_-]?app[_-]?password/i.test(pwd)) return false;
  return true;
};

const parseBooleanEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const createGmailTransporters = () => {
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASSWORD || '').trim();

  // Try SSL first (465), then STARTTLS (587) as fallback.
  return [
    {
      label: 'gmail-465-ssl',
      transporter: nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 7000,
      }),
    },
    {
      label: 'gmail-587-starttls',
      transporter: nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user, pass },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 7000,
      }),
    },
  ];
};

const createCustomSmtpTransporters = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  if (!host) return [];

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBooleanEnv(process.env.SMTP_SECURE, port === 465);
  const requireTLS = parseBooleanEnv(process.env.SMTP_REQUIRE_TLS, !secure);
  const user = String(process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '').trim();

  return [
    {
      label: `custom-${host}:${port}`,
      transporter: nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS,
        auth: user && pass ? { user, pass } : undefined,
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 7000,
      }),
    },
  ];
};

const mapBrevoApiReason = (error) => {
  const status = Number(error?.response?.status || 0);
  const lowerMessage = String(error?.message || '').toLowerCase();
  if (status === 401 || status === 403) return 'BREVO_API_AUTH_FAILED';
  if (status === 429) return 'BREVO_API_RATE_LIMITED';
  if (status >= 400) return 'BREVO_API_REQUEST_FAILED';
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) return 'BREVO_API_TIMEOUT';
  return 'BREVO_API_SEND_FAILED';
};

const mapSmtpReason = (error) => {
  const lowerMessage = String(error?.message || '').toLowerCase();
  if (lowerMessage.includes('invalid login') || lowerMessage.includes('username and password not accepted')) {
    return 'SMTP_AUTH_FAILED';
  }
  if (lowerMessage.includes('authentication')) {
    return 'SMTP_AUTH_ERROR';
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'SMTP_TIMEOUT';
  }
  return 'SMTP_SEND_FAILED';
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
  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();

  if (!fromEmail) {
    console.error('⚠️  EMAIL_USER not set. Configure sender email.');
    return returnMeta
      ? { success: false, reason: 'EMAIL_USER_NOT_SET' }
      : false;
  }
  
  try {
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
    const sendMailWithTimeout = (transporter, label) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`SMTP send timeout (${label})`)), 8000);
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

    let lastError = null;
    let lastReason = null;

    // Provider 1: Brevo Transactional Email API over HTTPS (443).
    if (brevoApiKey) {
      try {
        console.log('[EMAIL] Trying Brevo API provider');
        await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { email: fromEmail, name: 'FarmerCrate' },
            to: [{ email }],
            subject,
            htmlContent: msg.html,
          },
          {
            headers: {
              'api-key': brevoApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            timeout: 10000,
          }
        );
        console.log('✅ Email sent via Brevo API!');
        console.log('=== EMAIL SENT ===\n');
        return returnMeta
          ? { success: true, reason: null, provider: 'brevo-api' }
          : true;
      } catch (brevoError) {
        lastError = brevoError;
        lastReason = mapBrevoApiReason(brevoError);
        console.error('[EMAIL] Brevo API failed:', brevoError.message);
      }
    }

    const attempts = smtpHost
      ? createCustomSmtpTransporters()
      : (isUsableEmailPassword(emailPassword) ? createGmailTransporters() : []);

    if (attempts.length > 0) {
      for (const attempt of attempts) {
        try {
          console.log(`[EMAIL] Trying Nodemailer SMTP transport: ${attempt.label}`);
          await sendMailWithTimeout(attempt.transporter, attempt.label);
          console.log('✅ Email sent via Nodemailer SMTP!');
          console.log('=== EMAIL SENT ===\n');
          return returnMeta
            ? { success: true, reason: null, provider: attempt.label }
            : true;
        } catch (attemptError) {
          lastError = attemptError;
          lastReason = mapSmtpReason(attemptError);
          console.error(`[EMAIL] Transport failed (${attempt.label}):`, attemptError.message);
        }
      }
    } else {
      console.log('[EMAIL] SMTP credentials/config missing for Nodemailer SMTP');
      if (!lastReason) {
        lastReason = smtpHost ? 'SMTP_CONFIG_INVALID' : 'EMAIL_PASSWORD_NOT_SET_OR_INVALID';
      }
    }

    const aggregateError = lastError || new Error('All email providers failed');
    aggregateError.reason = lastReason || 'EMAIL_SEND_FAILED';
    throw aggregateError;
  } catch (error) {
    console.error('\n=== EMAIL ERROR ===');
    console.error('Error:', error.message);

    if (String(error?.message || '').toLowerCase().includes('invalid login')) {
      console.error('⚠️  Gmail SMTP invalid login. Use a valid Gmail App Password (not normal Gmail password).');
    }

    console.error('=== END EMAIL ERROR ===\n');
    const reason = error?.reason || mapSmtpReason(error);

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
