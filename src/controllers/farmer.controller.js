const FarmerUser = require('../models/farmer_user.model');
const { validationResult } = require('express-validator');

exports.getMe = async (req, res) => {
  try {
    const farmer = await FarmerUser.findByPk(req.user.farmer_id, {
      attributes: { exclude: ['password'] }
    });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    res.json({ success: true, data: farmer });
  } catch (error) {
    console.error('Get farmer details error:', error);
    res.status(500).json({ message: 'Error retrieving farmer details' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const farmer = await FarmerUser.findByPk(req.user.farmer_id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    
    const updatableFields = [
      'name', 'mobile_number', 'email', 'address', 'zone', 'state', 'district', 
      'password', 'age', 'account_number', 'ifsc_code', 'image_url'
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        farmer[field] = req.body[field];
      }
    });
    
    await farmer.save();
    res.json({ success: true, message: 'Farmer details updated successfully', data: farmer });
  } catch (error) {
    console.error('Update farmer details error:', error);
    res.status(500).json({ message: 'Error updating farmer details' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const farmers = await FarmerUser.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({ 
      success: true, 
      data: farmers
    });
  } catch (error) {
    console.error('Get all farmers error:', error);
    res.status(500).json({ message: 'Error retrieving farmers' });
  }
};