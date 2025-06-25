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
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required.' });
    const Model = getModelByRole(role);
    if (!Model) return res.status(400).json({ message: 'Invalid role specified.' });

    if (role === 'farmer') {
      const { name, email, password, mobileNumber, address, zone, state, district, age, account_number, ifsc_code, image_url } = req.body;
      const existing = await Model.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Farmer already exists' });
      const farmer = await Model.create({
        name,
        email,
        password,
        mobile_number: mobileNumber,
        address,
        zone,
        state,
        district,
        verified_status: false,
        age,
        account_number,
        ifsc_code,
        image_url
        // unique_id will be generated only when admin approves
      });
      return res.status(201).json({
        message: 'Farmer registered successfully. Await admin approval.',
        farmer: {
          id: farmer.farmer_id,
          name: farmer.name,
          email: farmer.email,
          verified_status: farmer.verified_status
        }
      });
    }
    if (role === 'customer') {
      const { name, email, password, mobileNumber, address, zone, state, district, age, image_url } = req.body;
      const existing = await Model.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Customer already exists' });
      const customer = await Model.create({
        customer_name: name,
        mobile_number: mobileNumber,
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
          name: customer.customer_name,
          email: customer.email
        }
      });
    }
    if (role === 'transporter') {
      const { name, email, password, mobileNumber, address, zone, state, district, age, image_url,
        aadhar_url, pan_url, voter_id_url, license_url,
        aadhar_number, pan_number, voter_id_number, license_number } = req.body;
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
        voter_id_number,
        license_number
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
      const { name, email, password, mobileNumber, adminRole } = req.body;
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
        mobile_number: mobileNumber,
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required.' });
    const Model = getModelByRole(role);
    if (!Model) return res.status(400).json({ message: 'Invalid role specified.' });
    const user = await Model.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.password !== password) return res.status(401).json({ message: 'Invalid credentials' });
    
    if (role === 'farmer' && !user.verified_status) {
      return res.status(403).json({ message: 'Your account is pending verification. Please contact an administrator or use your verification code.' });
    }

    if (role === 'transporter' && !user.verified_status) {
      return res.status(403).json({ message: 'Your account is pending administrator approval.' });
    }

    // Check if admin is active
    if (role === 'admin' && !user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    // Update last login for admin
    if (role === 'admin') {
      await user.update({ last_login: new Date() });
    }
    
    const idField = role === 'farmer' ? 'farmer_id' : 
                  role === 'customer' ? 'customer_id' : 
                  role === 'transporter' ? 'transporter_id' : 
                  'admin_id';
    
    const token = jwt.sign(
      { id: user[idField], role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user[idField],
        email: user.email,
        role,
        name: user.name || user.customer_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
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