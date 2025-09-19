const getProfile = async (req, res) => {
  const DeliveryPerson = require('../models/deliveryPerson.model');
  
  try {
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    if (!deliveryPerson) return res.status(404).json({ message: 'Delivery person not found' });
    
    res.json(deliveryPerson);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateLocation = async (req, res) => {
  const DeliveryPerson = require('../models/deliveryPerson.model');
  const { lat, lng } = req.body;
  
  try {
    await DeliveryPerson.update(
      { current_location_lat: lat, current_location_lng: lng },
      { where: { id: req.user.id } }
    );
    
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateAvailability = async (req, res) => {
  const DeliveryPerson = require('../models/deliveryPerson.model');
  const { is_available } = req.body;
  
  try {
    await DeliveryPerson.update(
      { is_available },
      { where: { id: req.user.id } }
    );
    
    res.json({ message: 'Availability updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updatePassword = async (req, res) => {
  const DeliveryPerson = require('../models/deliveryPerson.model');
  const { password } = req.body;
  
  try {
    const updated = await DeliveryPerson.update(
      { password },
      { where: { id: req.user.id } }
    );
    
    if (!updated[0]) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAssignedOrders = async (req, res) => {
  const Order = require('../models/order.model');
  
  try {
    const orders = await Order.findAll({
      where: { delivery_person_id: req.user.id }
    });
    
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const completeOrder = async (req, res) => {
  const Order = require('../models/order.model');
  const { order_id } = req.body;
  
  try {
    const order = await Order.findOne({
      where: { 
        id: order_id,
        delivery_person_id: req.user.id 
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }
    
    await order.update({ status: 'completed' });
    
    res.json({ message: 'Order completed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  const DeliveryPerson = require('../models/deliveryPerson.model');
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Optional filters
    const whereClause = {};
    if (req.query.is_available !== undefined) {
      whereClause.is_available = req.query.is_available === 'true';
    }
    if (req.query.vehicle_type) {
      whereClause.vehicle_type = req.query.vehicle_type;
    }

    const deliveryPersons = await DeliveryPerson.findAndCountAll({
      where: whereClause,
      attributes: { 
        exclude: ['password'] // Exclude sensitive information
      },
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(deliveryPersons.count / limit);

    res.json({ 
      success: true, 
      data: deliveryPersons.rows,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: deliveryPersons.count,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Get all delivery persons error:', error);
    res.status(500).json({ message: 'Error retrieving delivery persons', error: error.message });
  }
};

module.exports = { getProfile, updateLocation, updateAvailability, updatePassword, getAssignedOrders, completeOrder, getAllUsers };