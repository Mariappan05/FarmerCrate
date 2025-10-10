const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sendOTPSMS } = require('../utils/sms.util');
const sequelize = require('../config/database').sequelize;
const { Sequelize } = require('sequelize');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const GovVerificationService = require('../services/govVerification.service');

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

// Register new user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) 
      {
      return res.status(400).json({ errors: errors.array() });
    }
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required.' });
    const Model = getModelByRole(role);
    if (!Model) return res.status(400).json({ message: 'Invalid role specified.' });

    if (role === 'farmer') {
      const { name, email, password, mobile_number, address, zone, state, district, age, account_number, ifsc_code, image_url, global_farmer_id } = req.body;
      const existing = await Model.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Farmer already exists' });
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
        global_farmer_id
      });
      
      // Trigger government verification if global_farmer_id is provided
      if (farmer.global_farmer_id) {
        // Run verification in background
        GovVerificationService.verifyFarmerWithGov(farmer.global_farmer_id, farmer.farmer_id)
          .then(result => {
            console.log(`Gov verification result for farmer ${farmer.farmer_id}:`, result);
          })
          .catch(error => {
            console.error(`Gov verification failed for farmer ${farmer.farmer_id}:`, error);
          });
      }
      
      return res.status(201).json({
        message: 'Farmer registered successfully. Government verification initiated.',
        farmer: {
          id: farmer.farmer_id,
          name: farmer.name,
          email: farmer.email,
          is_verified_by_gov: farmer.is_verified_by_gov,
          verification_status: farmer.global_farmer_id ? 'pending' : 'not_initiated'
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
      const { name, email, password, mobile_number, address, zone, state, district, age, image_url,
        aadhar_url, pan_url, voter_id_url, license_url,
        aadhar_number, pan_number, pincode,voter_id_number, license_number,
        account_number, ifsc_code } = req.body;
      const existing = await Model.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Transporter already exists' });
      const transporter = await Model.create({
        name,
        mobile_number,
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

    // Farmer: username == global_farmer_id (case-insensitive)
    const allFarmers = await FarmerUser.findAll();
    let user = allFarmers.find(f => f.global_farmer_id?.toLowerCase() === username?.toLowerCase());
    if (user && user.password === password) {
      return res.json({
        message: 'Login successful',
        token: jwt.sign({ farmer_id: user.farmer_id, role: 'farmer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }),
        user: {
          id: user.farmer_id,
          email: user.email,
          role: 'farmer',
          name: user.name,
          global_farmer_id: user.global_farmer_id
        }
      });
    }

    // Customer: username == name (case-insensitive)
    const allCustomers = await CustomerUser.findAll();
    user = allCustomers.find(c => c.name?.toLowerCase() === username?.toLowerCase());
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

    // Transporter: username == unique_id (case-insensitive)
    const allTransporters = await TransporterUser.findAll();
    user = allTransporters.find(t => t.unique_id?.toLowerCase() === username?.toLowerCase());
    if (user && user.password === password) {
      return res.json({
        message: 'Login successful',
        token: jwt.sign({ transporter_id: user.transporter_id, role: 'transporter' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }),
        user: {
          id: user.transporter_id,
          email: user.email,
          role: 'transporter',
          name: user.name,
          unique_id: user.unique_id
        }
      });
    }

    // Admin: username == name (case-insensitive)
    const allAdmins = await AdminUser.findAll();
    user = allAdmins.find(a => a.name?.toLowerCase() === username?.toLowerCase());
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

    // Delivery Person: username == mobile_number (case-insensitive)
    const allDeliveryPersons = await DeliveryPerson.findAll();
    user = allDeliveryPersons.find(d => d.mobile_number?.toLowerCase() === username?.toLowerCase());
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

// Farmer code verification (unchanged)
exports.verifyFarmerCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const farmer = await FarmerUser.findOne({ where: { email } });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    if (farmer.unique_id !== code) {
      return res.status(400).json({ message: 'Invalid code' });
    }
    farmer.verified_status = true;
    await farmer.save();
    res.json({ success: true, message: 'Farmer verified successfully.' });
  } catch (error) {
    console.error('Error verifying farmer code:', error);
    res.status(500).json({ message: 'Error verifying farmer code' });
  }
};