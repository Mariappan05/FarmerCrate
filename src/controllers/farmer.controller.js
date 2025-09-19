const FarmerUser = require('../models/farmer_user.model');
const { validationResult } = require('express-validator');

exports.getMe = async (req, res) => {
  try {
    const farmer = await FarmerUser.findByPk(req.user.id, {
      attributes: { exclude: [] }
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
    const farmer = await FarmerUser.findByPk(req.user.id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    // Update all fields except id, unique_id, created_at, updated_at
    const updatableFields = [
      'name', 'mobile_number', 'email', 'address', 'zone', 'state', 'district', 'password', 'age', 'image_url',
      'verified_status', 'account_number', 'ifsc_code', 'approved_at', 'approval_notes', 'rejected_at', 'rejection_reason', 'code_updated_at'
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

exports.getAllFarmerNames = async (req, res) => {
  try {
    const farmers = await FarmerUser.findAll({ attributes: ['name'] });
    const names = farmers.map(farmer => farmer.name);
    res.json({ success: true, data: names });
  } catch (error) {
    console.error('Get all farmer names error:', error);
    res.status(500).json({ message: 'Error retrieving farmer names' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Optional filters
    const whereClause = {};
    if (req.query.verified_status) {
      whereClause.verified_status = req.query.verified_status;
    }
    if (req.query.zone) {
      whereClause.zone = req.query.zone;
    }
    if (req.query.state) {
      whereClause.state = req.query.state;
    }
    if (req.query.district) {
      whereClause.district = req.query.district;
    }

    const farmers = await FarmerUser.findAndCountAll({
      where: whereClause,
      attributes: { 
        exclude: ['password'] // Exclude sensitive information
      },
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(farmers.count / limit);

    res.json({ 
      success: true, 
      data: farmers.rows,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: farmers.count,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Get all farmers error:', error);
    res.status(500).json({ message: 'Error retrieving farmers' });
  }
}; 