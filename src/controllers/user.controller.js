const { validationResult } = require('express-validator');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');

const getModelByRole = (role) => {
  if (role === 'farmer') return FarmerUser;
  if (role === 'customer') return CustomerUser;
  if (role === 'transporter') return TransporterUser;
  return null;
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const Model = getModelByRole(req.role);
    if (!Model) return res.status(400).json({ message: 'Invalid role' });
    const idField = req.role === 'farmer' ? 'farmer_id' : req.role === 'customer' ? 'customer_id' : 'transporter_id';
    const user = await Model.findByPk(req.user[idField], {
      attributes: { exclude: ['password'] }
    });
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const Model = getModelByRole(req.role);
    if (!Model) return res.status(400).json({ message: 'Invalid role' });
    const idField = req.role === 'farmer' ? 'farmer_id' : req.role === 'customer' ? 'customer_id' : 'transporter_id';
    const { name, email, mobileNumber } = req.body;
    // Check if email is already taken
    if (email && email !== req.user.email) {
      const existingUser = await Model.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    // Update user
    const user = await Model.findByPk(req.user[idField]);
    // Use correct field for name
    let updateFields = {};
    if (req.role === 'farmer' || req.role === 'transporter') {
      updateFields.name = name || user.name;
    } else if (req.role === 'customer') {
      updateFields.customer_name = name || user.customer_name;
    }
    updateFields.email = email || user.email;
    updateFields.mobile_number = mobileNumber || user.mobile_number;
    await user.update(updateFields);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Get wallet balance (assuming all user models have walletBalance field)
exports.getWalletBalance = async (req, res) => {
  try {
    const Model = getModelByRole(req.role);
    if (!Model) return res.status(400).json({ message: 'Invalid role' });
    const idField = req.role === 'farmer' ? 'farmer_id' : req.role === 'customer' ? 'customer_id' : 'transporter_id';
    const user = await Model.findByPk(req.user[idField], {
      attributes: ['walletBalance']
    });
    res.json({
      success: true,
      data: {
        balance: user ? user.walletBalance : 0
      }
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({ message: 'Error fetching wallet balance' });
  }
}; 