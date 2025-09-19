const getProfile = async (req, res) => {
  const TransporterUser = require('../models/transporter_user.model');
  
  try {
    const transporter = await TransporterUser.findByPk(req.user.transporter_id);
    if (!transporter) return res.status(404).json({ message: 'Transporter not found' });
    
    res.json(transporter);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  const TransporterUser = require('../models/transporter_user.model');
  
  try {
    const updatableFields = ['name', 'mobile_number', 'email', 'age', 'address', 'zone', 'district', 'state'];
    const updates = {};
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await TransporterUser.update(updates, { where: { transporter_id: req.user.transporter_id } });
    
    const updatedTransporter = await TransporterUser.findByPk(req.user.transporter_id);
    res.json(updatedTransporter);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addDeliveryPerson = async (req, res) => {
  const DeliveryPerson = require('../models/deliveryPerson.model');
  const { name, mobile_number, vehicle_number, license_number, vehicle_type, license_url } = req.body;
  
  try {
    const password = Math.random().toString(36).slice(-8);
    
    // Clean mobile number
    const cleanMobileNumber = mobile_number.replace(/\s+/g, '');
    
    const deliveryPerson = await DeliveryPerson.create({
      user_id: req.user.transporter_id,
      name,
      mobile_number: cleanMobileNumber,
      password,
      vehicle_number,
      license_number,
      vehicle_type,
      license_url
    });
    
    res.status(201).json({
      message: 'Delivery person added successfully.',
      credentials: {
        mobile_number: cleanMobileNumber,
        password: password
      },
      delivery_person_id: deliveryPerson.id
    });
  } catch (error) {
    console.error('Delivery person creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, details: error.errors });
  }
};

const deleteDeliveryPerson = async (req, res) => {
  const DeliveryPerson = require('../models/deliveryPerson.model');
  const { id } = req.params;
  
  try {
    const deleted = await DeliveryPerson.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Delivery person not found' });
    
    res.json({ message: 'Delivery person deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const assignOrderToDeliveryPerson = async (req, res) => {
  const Order = require('../models/order.model');
  const { order_id, delivery_person_id } = req.body;
  
  try {
    const updated = await Order.update(
      { delivery_person_id },
      { where: { id: order_id } }
    );
    
    if (!updated[0]) return res.status(404).json({ message: 'Order not found' });
    
    res.json({ message: 'Order assigned to delivery person successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  const TransporterUser = require('../models/transporter_user.model');
  
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

    const transporters = await TransporterUser.findAndCountAll({
      where: whereClause,
      attributes: { 
        exclude: ['password'] // Exclude sensitive information
      },
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(transporters.count / limit);

    res.json({ 
      success: true, 
      data: transporters.rows,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: transporters.count,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Get all transporters error:', error);
    res.status(500).json({ message: 'Error retrieving transporters', error: error.message });
  }
};

module.exports = { getProfile, updateProfile, addDeliveryPerson, deleteDeliveryPerson, assignOrderToDeliveryPerson, getAllUsers };