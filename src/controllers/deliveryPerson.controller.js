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

module.exports = { getProfile, updateLocation, updateAvailability, updatePassword, getAssignedOrders, completeOrder };