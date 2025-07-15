const CustomerUser = require('../models/customer_user.model');
const { validationResult } = require('express-validator');

exports.getMe = async (req, res) => {
  try {
    console.log('req.user:', req.user); // Debug
    const customer = await CustomerUser.findByPk(req.user.id, {
      // Return all fields
      attributes: { exclude: [] }
    });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer details error:', error);
    res.status(500).json({ message: 'Error retrieving customer details' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const customer = await CustomerUser.findByPk(req.user.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    // Update all fields except id, created_at, updated_at
    const updatableFields = [
      'customer_name', 'mobile_number', 'email', 'address', 'zone', 'state', 'district', 'password', 'age', 'image_url'
    ];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });
    await customer.save();
    res.json({ success: true, message: 'Customer details updated successfully', data: customer });
  } catch (error) {
    console.error('Update customer details error:', error);
    res.status(500).json({ message: 'Error updating customer details' });
  }
}; 