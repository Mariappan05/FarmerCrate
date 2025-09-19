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

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Optional filters
    const whereClause = {};
    if (req.query.zone) {
      whereClause.zone = req.query.zone;
    }
    if (req.query.state) {
      whereClause.state = req.query.state;
    }
    if (req.query.district) {
      whereClause.district = req.query.district;
    }

    const customers = await CustomerUser.findAndCountAll({
      where: whereClause,
      attributes: { 
        exclude: ['password'] // Exclude sensitive information
      },
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(customers.count / limit);

    res.json({ 
      success: true, 
      data: customers.rows,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: customers.count,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({ message: 'Error retrieving customers' });
  }
}; 