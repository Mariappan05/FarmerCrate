const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const { validationResult } = require('express-validator');

exports.getMe = async (req, res) => {
  try {
    const customer = await CustomerUser.findByPk(req.user.customer_id, {
      attributes: { exclude: ['password'] }
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
    const customer = await CustomerUser.findByPk(req.user.customer_id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const updatableFields = [
      'name', 'mobile_number', 'email', 'address', 'zone', 'state', 'district', 
      'password', 'age', 'image_url'
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

exports.checkPincodeAvailability = async (req, res) => {
  try {
    const { pincode } = req.params;
    const searchPincode = pincode?.toLowerCase();
    
    // Get all transporters and filter with case-insensitive comparison
    const allTransporters = await TransporterUser.findAll({
      attributes: ['transporter_id', 'name', 'zone', 'district', 'state', 'pincode']
    });
    
    const transporters = allTransporters.filter(t => 
      t.pincode?.toLowerCase() === searchPincode
    );
    
    const isAvailable = transporters.length > 0;
    
    res.json({
      success: true,
      pincode,
      available: isAvailable,
      message: isAvailable 
        ? `Delivery available! ${transporters.length} transporter(s) serve this area.`
        : 'Sorry, delivery not available in this pincode area.',
      count: transporters.length,
      transporters: isAvailable ? transporters : []
    });
  } catch (error) {
    console.error('Check pincode availability error:', error);
    res.status(500).json({ message: 'Error checking pincode availability' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const customers = await CustomerUser.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({ 
      success: true, 
      data: customers
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({ message: 'Error retrieving customers' });
  }
};