const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sendOTPSMS, generateVerificationCode } = require('../utils/sms.util');
const sequelize = require('../config/database').sequelize;
const { Sequelize } = require('sequelize');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');

// In-memory OTP storage
const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to get model by role
const getModelByRole = (role) => {
  if (role === 'farmer') return FarmerUser;
  if (role === 'customer') return CustomerUser;
  if (role === 'transporter') return TransporterUser;
  if (role === 'admin') return AdminUser;
  return null;
};

// Check if email or mobile exists in any role
const checkExistingUser = async (email, mobile_number) => {
  const checks = [
    { model: FarmerUser, role: 'farmer' },
    { model: CustomerUser, role: 'customer' },
    { model: TransporterUser, role: 'transporter' },
    { model: AdminUser, role: 'admin' }
  ];
  
  for (const { model, role } of checks) {
    if (email) {
      const userByEmail = await model.findOne({ where: { email } });
      if (userByEmail) return { exists: true, role, field: 'email' };
    }
    if (mobile_number) {
      const userByMobile = await model.findOne({ where: { mobile_number } });
      if (userByMobile) return { exists: true, role, field: 'mobile_number' };
    }
  }
  return { exists: false };
};

// Register new user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) 
      {
      return res.status(400).json({ errors: errors.array() });
    }
    const { role, email, mobile_number } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required.' });
    
    // Check if user already exists in any role
    const existingUser = await checkExistingUser(email, mobile_number);
    if (existingUser.exists) {
      return res.status(400).json({ 
        message: `User with this ${existingUser.field} already registered as ${existingUser.role}`,
        existingRole: existingUser.role,
        field: existingUser.field
      });
    }
    
    const Model = getModelByRole(role);
    if (!Model) return res.status(400).json({ message: 'Invalid role specified.' });

    if (role === 'farmer') {
      const { name, email, password, mobile_number, address, zone, state, district, age, account_number, ifsc_code, image_url } = req.body;
      const existing = await Model.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Farmer already exists' });
      const unique_id = generateVerificationCode();
      const farmer = await Model.create({
        name,
        email,
        password,
        mobile_number,
        address,
        zone,
        state,
        district,
        age,
        account_number,
        ifsc_code,
        image_url,
        unique_id,
        verification_status: 'pending'
      });
      
      return res.status(201).json({
        message: 'Farmer registered successfully. Awaiting admin verification.',
        farmer: {
          name: farmer.name,
          email: farmer.email,
          unique_id: farmer.unique_id,
          verification_status: 'pending'
        }
      });
    }
    if (role === 'customer') {
      const { name, email, password, mobile_number, address, zone, state, district, age, image_url } = req.body;
      const existing = await Model.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Customer already exists' });
      const customer = await Model.create({
        name,
        mobile_number,
        email,
        address,
        zone,
        state,
        district,
        password,
        age,
        image_url
      });
      return res.status(201).json({
        message: 'Customer registered successfully.',
        customer: {
          id: customer.customer_id,
          name: customer.name,
          email: customer.email
        }
      });
    }
    if (role === 'transporter') {
      const { name, email, password, mobileNumber, address, zone, state, district, age, image_url,
        aadhar_url, pan_url, voter_id_url, license_url,
        aadhar_number, pan_number, pincode, voter_id_number, license_number,
        account_number, ifsc_code } = req.body;
      const existing = await Model.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Transporter already exists' });
      const transporter = await Model.create({
        name,
        mobile_number: mobileNumber,
        email,
        age,
        address,
        zone,
        district,
        state,
        password,
        image_url,
        aadhar_url,
        pan_url,
        voter_id_url,
        license_url,
        aadhar_number,
        pan_number,
        pincode,
        voter_id_number,
        license_number,
        account_number,
        ifsc_code
      });
      return res.status(201).json({
        message: 'Transporter registered successfully. Await admin approval.',
        transporter: {
          id: transporter.transporter_id,
          name: transporter.name,
          email: transporter.email,
          verified_status: transporter.verified_status
        }
      });
    }
    if (role === 'admin') {
      const { name, email, password, mobile_number, adminRole } = req.body;
      const existing = await Model.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Admin already exists' });
      
      // Validate admin role
      const validAdminRoles = ['super_admin', 'admin', 'moderator'];
      if (adminRole && !validAdminRoles.includes(adminRole)) {
        return res.status(400).json({ message: 'Invalid admin role specified' });
      }
      
      const admin = await Model.create({
        name,
        email,
        password,
        mobile_number,
        role: adminRole || 'admin'
      });
      return res.status(201).json({
        message: 'Admin registered successfully.',
        admin: {
          id: admin.admin_id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    if (error && error.errors) {
      error.errors.forEach(e => console.error(e));
    }
    res.status(500).json({ message: 'Error registering user' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    // Check for required JWT environment variables
    if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
      console.error('JWT_SECRET or JWT_EXPIRES_IN environment variable is missing');
      return res.status(500).json({ message: 'Server configuration error: JWT settings missing' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Both username and password are required.' });
    }

    // Farmer: username == unique_id
    let user = await FarmerUser.findOne({ where: { unique_id: username } });
    if (user && user.password === password) {
      if (user.verification_status === 'pending') {
        return res.status(403).json({ message: 'Your account is pending admin verification. Please wait for approval.' });
      }
      if (user.verification_status === 'rejected') {
        return res.status(403).json({ message: 'Your account has been rejected. Please contact support.' });
      }
      return res.json({
        message: 'Login successful',
        token: jwt.sign({ farmer_id: user.farmer_id, role: 'farmer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }),
        user: {
          id: user.farmer_id,
          email: user.email,
          role: 'farmer',
          name: user.name,
          unique_id: user.unique_id
        }
      });
    }

    // Customer: username == name
    user = await CustomerUser.findOne({ where: { name: username } });
    console.log('Customer lookup:', { username, found: !!user, passwordMatch: user ? user.password === password : false });
    if (user && user.password === password) {
      // Check if this is first login
      if (!user.first_login_completed) {
        // Generate and send OTP to email
        const otp = generateOTP();
        const timestamp = Date.now();
        otpStore.set(user.email, { otp, timestamp, attempts: 0, userId: user.customer_id });
        
        // Send OTP to email
        try {
          const { sendOTPEmail } = require('../utils/email');
          const emailSent = await sendOTPEmail(user.email, otp);
          
          if (!emailSent) {
            console.error('Email sending failed, but continuing with OTP process');
            console.log(`\n=== DEVELOPMENT OTP FOR ${user.email} ===`);
            console.log(`OTP: ${otp}`);
            console.log('=== USE THIS OTP FOR TESTING ===\n');
          }
        } catch (emailError) {
          console.error('Email utility error:', emailError);
          // Log OTP to console for development testing
          console.log(`\n=== DEVELOPMENT OTP FOR ${user.email} ===`);
          console.log(`OTP: ${otp}`);
          console.log('=== USE THIS OTP FOR TESTING ===\n');
        }
        
        return res.json({
          message: 'First login detected. OTP sent to your email.',
          requiresOTP: true,
          email: user.email,
          tempToken: jwt.sign({ customer_id: user.customer_id, role: 'customer', temp: true }, process.env.JWT_SECRET, { expiresIn: '10m' })
        });
      }
      
      return res.json({
        message: 'Login successful',
        token: jwt.sign({ customer_id: user.customer_id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }),
        user: {
          id: user.customer_id,
          email: user.email,
          role: 'customer',
          name: user.name
        }
      });
    }

    // Transporter: username == email
    user = await TransporterUser.findOne({ where: { email: username } });
    if (user && user.password === password) {
      return res.json({
        message: 'Login successful',
        token: jwt.sign({ transporter_id: user.transporter_id, role: 'transporter' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }),
        user: {
          id: user.transporter_id,
          email: user.email,
          role: 'transporter',
          name: user.name
        }
      });
    }

    // Admin: username == email
    user = await AdminUser.findOne({ where: { name: username } });
    if (user && user.password === password) {
      if (!user.is_active) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }
      await user.update({ last_login: new Date() });
      return res.json({
        message: 'Login successful',
        token: jwt.sign({ admin_id: user.admin_id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }),
        user: {
          id: user.admin_id,
          email: user.email,
          role: 'admin',
          name: user.name
        }
      });
    }

    // Delivery Person: username == mobile_number
    user = await DeliveryPerson.findOne({ where: { mobile_number: username } });
    if (user && user.password === password) {
      // Check if this is first login
      if (!user.first_login_completed) {
        return res.json({
          message: 'First login detected. Password change required.',
          requiresPasswordChange: true,
          tempToken: jwt.sign({ delivery_person_id: user.delivery_person_id, role: 'delivery', temp: true }, process.env.JWT_SECRET, { expiresIn: '15m' })
        });
      }
      
      return res.json({
        message: 'Login successful',
        token: jwt.sign({ delivery_person_id: user.delivery_person_id, role: 'delivery' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }),
        user: {
          id: user.delivery_person_id,
          role: 'delivery',
          name: user.name,
          mobile_number: user.mobile_number
        }
      });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    // Provide more detailed error message in development
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({ message: 'Error logging in', error: error.message, stack: error.stack });
    }
    res.status(500).json({ message: 'Error logging in' });
  }
};


// Send OTP for password reset
exports.sendOTP = async (req, res) => {
  try {
    const { mobile_number, role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required.' });
    const Model = getModelByRole(role);
    if (!Model) return res.status(400).json({ message: 'Invalid role specified.' });
    const user = await Model.findOne({ where: { mobile_number } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const otp = generateOTP();
    const timestamp = Date.now();
    otpStore.set(mobile_number, { otp, timestamp, attempts: 0 });
    const smsSent = await sendOTPSMS(mobile_number, otp);
    if (!smsSent) return res.status(500).json({ message: 'Error sending OTP SMS' });
    res.json({ success: true, message: 'OTP sent successfully to your mobile number' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { mobile_number, otp } = req.body;
    const storedData = otpStore.get(mobile_number);
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }
    if (Date.now() - storedData.timestamp > 600000) {
      otpStore.delete(mobile_number);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    if (storedData.otp === otp) {
      otpStore.delete(mobile_number);
      return res.status(200).json({ success: true, message: 'OTP verified successfully' });
    }
    storedData.attempts += 1;
    if (storedData.attempts >= 3) {
      otpStore.delete(mobile_number);
      return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new OTP' });
    }
    res.status(400).json({ success: false, message: 'Invalid OTP' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { mobile_number, otp, newPassword, role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required.' });
    const Model = getModelByRole(role);
    if (!Model) return res.status(400).json({ message: 'Invalid role specified.' });
    const storedData = otpStore.get(mobile_number);
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (Date.now() - storedData.timestamp > 600000) {
      otpStore.delete(mobile_number);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    const user = await Model.findOne({ where: { mobile_number } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.password = newPassword;
    await user.save();
    otpStore.delete(mobile_number);
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// Verify customer first login OTP
exports.verifyCustomerFirstLoginOTP = async (req, res) => {
  try {
    const { email, otp, tempToken } = req.body;
    
    if (!tempToken) {
      return res.status(400).json({ message: 'Temporary token is required' });
    }
    
    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.temp) {
        return res.status(400).json({ message: 'Invalid token type' });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }
    
    if (Date.now() - storedData.timestamp > 600000) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    if (storedData.otp !== otp) {
      storedData.attempts += 1;
      if (storedData.attempts >= 3) {
        otpStore.delete(email);
        return res.status(400).json({ message: 'Too many failed attempts. Please login again' });
      }
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // OTP verified, update customer record
    const customer = await CustomerUser.findByPk(decoded.customer_id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    await customer.update({ first_login_completed: true });
    otpStore.delete(email);
    
    // Generate final token
    const token = jwt.sign({ customer_id: customer.customer_id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    
    res.json({
      message: 'First login verification successful',
      token,
      user: {
        id: customer.customer_id,
        email: customer.email,
        role: 'customer',
        name: customer.name
      }
    });
  } catch (error) {
    console.error('Verify customer first login OTP error:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

// Resend customer first login OTP
exports.resendCustomerFirstLoginOTP = async (req, res) => {
  try {
    const { email, tempToken } = req.body;
    
    if (!tempToken) {
      return res.status(400).json({ message: 'Temporary token is required' });
    }
    
    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.temp) {
        return res.status(400).json({ message: 'Invalid token type' });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Find customer
    const customer = await CustomerUser.findByPk(decoded.customer_id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    if (customer.first_login_completed) {
      return res.status(400).json({ message: 'First login already completed' });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const timestamp = Date.now();
    otpStore.set(email, { otp, timestamp, attempts: 0, userId: customer.customer_id });
    
    // Send OTP to email
    try {
      const { sendOTPEmail } = require('../utils/email');
      const emailSent = await sendOTPEmail(email, otp);
      
      if (!emailSent) {
        console.error('Email sending failed, but continuing with OTP process');
        console.log(`\n=== RESEND OTP FOR ${email} ===`);
        console.log(`OTP: ${otp}`);
        console.log('=== USE THIS OTP FOR TESTING ===\n');
      }
    } catch (emailError) {
      console.error('Email utility error:', emailError);
      console.log(`\n=== RESEND OTP FOR ${email} ===`);
      console.log(`OTP: ${otp}`);
      console.log('=== USE THIS OTP FOR TESTING ===\n');
    }
    
    res.json({
      message: 'OTP resent successfully to your email',
      email: email
    });
  } catch (error) {
    console.error('Resend customer first login OTP error:', error);
    res.status(500).json({ message: 'Error resending OTP' });
  }
};

// Change delivery person password on first login
exports.changeDeliveryPersonFirstLoginPassword = async (req, res) => {
  try {
    const { newPassword, tempToken } = req.body;
    
    if (!tempToken) {
      return res.status(400).json({ message: 'Temporary token is required' });
    }
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    
    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.temp || decoded.role !== 'delivery') {
        return res.status(400).json({ message: 'Invalid token type' });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Find delivery person
    const deliveryPerson = await DeliveryPerson.findByPk(decoded.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }
    
    if (deliveryPerson.first_login_completed) {
      return res.status(400).json({ message: 'First login already completed' });
    }
    
    // Update password and mark first login as completed
    await deliveryPerson.update({
      password: newPassword,
      first_login_completed: true
    });
    
    // Generate final token
    const token = jwt.sign({ delivery_person_id: deliveryPerson.delivery_person_id, role: 'delivery' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    
    res.json({
      message: 'Password changed successfully. Login completed.',
      token,
      user: {
        id: deliveryPerson.delivery_person_id,
        role: 'delivery',
        name: deliveryPerson.name,
        mobile_number: deliveryPerson.mobile_number
      }
    });
  } catch (error) {
    console.error('Change delivery person first login password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
};


// Google Sign-In
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleSignIn = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }
    
    if (!role || !['customer', 'farmer', 'transporter'].includes(role)) {
      return res.status(400).json({ message: 'Valid role (customer/farmer/transporter) is required' });
    }
    
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;
    
    // Select model based on role
    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: 'Profile operation failed' });
    }
    
    // Check if user exists
    let user = await Model.findOne({ where: { email } });
    
    if (!user) {
      // Create new user
      const userData = {
        email,
        name,
        image_url: picture,
        google_id: googleId,
        password: Math.random().toString(36).slice(-8) // Random password
      };
      
      if (role === 'customer') {
        userData.first_login_completed = true;
        user = await CustomerUser.create(userData);
        
        const token = jwt.sign({ customer_id: user.customer_id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        
        return res.json({
          message: 'Google Sign-In successful',
          token,
          user: {
            id: user.customer_id,
            email: user.email,
            name: user.name,
            role: 'customer'
          }
        });
      } else if (role === 'farmer') {
        userData.unique_id = generateVerificationCode();
        userData.verification_status = 'pending';
        user = await FarmerUser.create(userData);
        
        return res.json({
          message: 'Farmer account created. Awaiting admin verification.',
          user: {
            id: user.farmer_id,
            email: user.email,
            name: user.name,
            role: 'farmer',
            verification_status: 'pending'
          }
        });
      } else if (role === 'transporter') {
        userData.verified_status = 'pending';
        user = await TransporterUser.create(userData);
        
        return res.json({
          message: 'Transporter account created. Awaiting admin verification.',
          user: {
            id: user.transporter_id,
            email: user.email,
            name: user.name,
            role: 'transporter',
            verified_status: 'pending'
          }
        });
      }
    }
    
    // User exists - login
    if (role === 'customer') {
      const token = jwt.sign({ customer_id: user.customer_id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      
      return res.json({
        message: 'Google Sign-In successful',
        token,
        user: {
          id: user.customer_id,
          email: user.email,
          name: user.name,
          role: 'customer'
        }
      });
    } else if (role === 'farmer') {
      if (user.verification_status === 'pending') {
        return res.status(403).json({ message: 'Your account is pending admin verification' });
      }
      if (user.verification_status === 'rejected') {
        return res.status(403).json({ message: 'Your account has been rejected' });
      }
      
      const token = jwt.sign({ farmer_id: user.farmer_id, role: 'farmer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      
      return res.json({
        message: 'Google Sign-In successful',
        token,
        user: {
          id: user.farmer_id,
          email: user.email,
          name: user.name,
          role: 'farmer'
        }
      });
    } else if (role === 'transporter') {
      if (user.verified_status === 'pending') {
        return res.status(403).json({ message: 'Your account is pending admin verification' });
      }
      
      const token = jwt.sign({ transporter_id: user.transporter_id, role: 'transporter' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      
      return res.json({
        message: 'Google Sign-In successful',
        token,
        user: {
          id: user.transporter_id,
          email: user.email,
          name: user.name,
          role: 'transporter'
        }
      });
    }
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ message: 'Error with Google Sign-In', error: error.message });
  }
};

exports.googleCompleteProfile = async (req, res) => { try { console.log('[GOOGLE PROFILE] Request body:', req.body); const { email, name, googleId, role, mobile_number, address, zone, state, district, age, account_number, ifsc_code } = req.body; if (!role || !['customer', 'farmer', 'transporter'].includes(role)) { return res.status(400).json({ message: 'Valid role (customer/farmer/transporter) is required' }); } const existingUser = await checkExistingUser(email, mobile_number); if (existingUser.exists) { return res.status(400).json({ message: `User with this ${existingUser.field} already registered as ${existingUser.role}`, existingRole: existingUser.role, field: existingUser.field }); } const Model = getModelByRole(role); console.log('[GOOGLE PROFILE] Searching for user with email:', email); let user = await Model.findOne({ where: { email } }); console.log('[GOOGLE PROFILE] User found:', !!user); if (!user) { console.log('[GOOGLE PROFILE] Creating new user'); const userData = { email, name, google_id: googleId, password: Math.random().toString(36).slice(-8) }; if (mobile_number) userData.mobile_number = mobile_number; if (address) userData.address = address; if (zone) userData.zone = zone; if (state) userData.state = state; if (district) userData.district = district; if (age) userData.age = age; if (role === 'farmer') { userData.unique_id = generateVerificationCode(); userData.verification_status = 'verified'; if (account_number) userData.account_number = account_number; if (ifsc_code) userData.ifsc_code = ifsc_code; user = await FarmerUser.create(userData); const token = jwt.sign({ farmer_id: user.farmer_id, role: 'farmer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }); return res.json({ message: 'Farmer profile created successfully', token, user: { id: user.farmer_id, email: user.email, name: user.name, role: 'farmer' } }); } else if (role === 'customer') { userData.first_login_completed = true; user = await CustomerUser.create(userData); const token = jwt.sign({ customer_id: user.customer_id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }); return res.json({ message: 'Customer profile created successfully', token, user: { id: user.customer_id, email: user.email, name: user.name, role: 'customer' } }); } else if (role === 'transporter') { userData.verified_status = 'verified'; user = await TransporterUser.create(userData); const token = jwt.sign({ transporter_id: user.transporter_id, role: 'transporter' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }); return res.json({ message: 'Transporter profile created successfully', token, user: { id: user.transporter_id, email: user.email, name: user.name, role: 'transporter' } }); } } else { console.log('[GOOGLE PROFILE] Updating existing user'); if (mobile_number) user.mobile_number = mobile_number; if (address) user.address = address; if (zone) user.zone = zone; if (state) user.state = state; if (district) user.district = district; if (age) user.age = age; if (googleId) user.google_id = googleId; if (role === 'farmer') { if (account_number) user.account_number = account_number; if (ifsc_code) user.ifsc_code = ifsc_code; await user.save(); const token = jwt.sign({ farmer_id: user.farmer_id, role: 'farmer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }); return res.json({ message: 'Farmer profile updated successfully', token, user: { id: user.farmer_id, email: user.email, name: user.name, role: 'farmer' } }); } else if (role === 'customer') { user.first_login_completed = true; await user.save(); const token = jwt.sign({ customer_id: user.customer_id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }); return res.json({ message: 'Customer profile updated successfully', token, user: { id: user.customer_id, email: user.email, name: user.name, role: 'customer' } }); } else if (role === 'transporter') { await user.save(); const token = jwt.sign({ transporter_id: user.transporter_id, role: 'transporter' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }); return res.json({ message: 'Transporter profile updated successfully', token, user: { id: user.transporter_id, email: user.email, name: user.name, role: 'transporter' } }); } } console.log('[GOOGLE PROFILE] Reached end without return - Invalid role'); return res.status(400).json({ message: 'Invalid role' }); } catch (error) { console.error('[GOOGLE PROFILE ERROR]', error); console.error('Stack:', error.stack); res.status(500).json({ message: 'Error completing profile', error: error.message }); } };











