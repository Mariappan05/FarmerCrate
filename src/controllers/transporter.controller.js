const TransporterUser = require('../models/transporter_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const Order = require('../models/order.model');
const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');
const GoogleMapsService = require('../services/googleMaps.service');

const getProfile = async (req, res) => {
  try {
    const transporter = await TransporterUser.findByPk(req.user.transporter_id);
    if (!transporter) return res.status(404).json({ message: 'Transporter not found' });
    
    res.json(transporter);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateProfile = async (req, res) => {
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
  const { name, mobile_number, vehicle_number, license_number, vehicle_type, license_url, image_url, current_location } = req.body;
  
  try {
    const password = Math.random().toString(36).slice(-8);
    const cleanMobileNumber = mobile_number.replace(/\s+/g, '');
    
    const deliveryPerson = await DeliveryPerson.create({
      transporter_id: req.user.transporter_id,
      name,
      mobile_number: cleanMobileNumber,
      password,
      vehicle_number,
      license_number,
      vehicle_type,
      license_url,
      image_url,
      current_location
    });
    
    res.status(201).json({
      message: 'Delivery person added successfully.',
      credentials: {
        mobile_number: cleanMobileNumber,
        password: password
      },
      delivery_person_id: deliveryPerson.delivery_person_id
    });
  } catch (error) {
    console.error('Delivery person creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteDeliveryPerson = async (req, res) => {
  const { id } = req.params;
  
  try {
    const deleted = await DeliveryPerson.destroy({ where: { delivery_person_id: id } });
    if (!deleted) return res.status(404).json({ message: 'Delivery person not found' });
    
    res.json({ message: 'Delivery person deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const assignVehicleToOrder = async (req, res) => {
  const { order_id, vehicle_id, vehicle_type } = req.body;
  
  try {
    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    const VehicleModel = vehicle_type === 'permanent' ? PermanentVehicle : TemporaryVehicle;
    const vehicle = await VehicleModel.findOne({
      where: { 
        vehicle_id, 
        transporter_id: req.user.transporter_id,
        is_available: true 
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found or not available' });
    }
    
    const updateData = vehicle_type === 'permanent' 
      ? { permanent_vehicle_id: vehicle_id }
      : { temp_vehicle_id: vehicle_id };
    
    await Order.update(updateData, { where: { order_id } });
    await vehicle.update({ is_available: false });
    
    res.json({ 
      success: true,
      message: 'Vehicle assigned to order successfully',
      data: { order_id, vehicle_id, vehicle_type }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


//manual order
const assignOrderToDeliveryPerson = async (req, res) => {
  const { order_id, delivery_person_id, permanent_vehicle_id, temp_vehicle_id } = req.body;
  
  try {
    const deliveryPerson = await DeliveryPerson.findOne({
      where: { 
        delivery_person_id,
        transporter_id: req.user.transporter_id,
        is_available: true
      }
    });
    
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found, not owned by this transporter, or not available' });
    }
    
    const updated = await Order.update(
      { 
        delivery_person_id,
        permanent_vehicle_id: permanent_vehicle_id || null,
        temp_vehicle_id: temp_vehicle_id || null,
        current_status: 'ASSIGNED'
      },
      { where: { order_id } }
    );
    
    if (!updated[0]) return res.status(404).json({ message: 'Order not found' });
    
    await deliveryPerson.update({ is_available: false });
    
    res.json({ 
      success: true,
      message: 'Order assigned to delivery person successfully',
      data: {
        order_id,
        delivery_person_id,
        vehicle_id: permanent_vehicle_id || temp_vehicle_id,
        status: 'ASSIGNED'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
//automatic order
const assignPickupDeliveryPerson = async (req, res) => {
  const { order_id, permanent_vehicle_id, temp_vehicle_id } = req.body;
  
  try {
    const order = await Order.findOne({
      where: {
        order_id,
        source_transporter_id: req.user.transporter_id
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to this transporter' });
    }
    
    const availableDeliveryPersons = await DeliveryPerson.findAll({
      where: { 
        transporter_id: req.user.transporter_id,
        is_available: true
      }
    });
    
    if (availableDeliveryPersons.length === 0) {
      return res.status(404).json({ message: 'No available delivery persons found' });
    }
    
    let selectedDeliveryPerson = availableDeliveryPersons[0];
    let shortestDistance = Infinity;
    
    try {
      for (const deliveryPerson of availableDeliveryPersons) {
        if (deliveryPerson.current_location) {
          const distance = await GoogleMapsService.calculateDistanceAndDuration(
            [order.pickup_address],
            [deliveryPerson.current_location]
          );
          
          if (distance.distance < shortestDistance) {
            shortestDistance = distance.distance;
            selectedDeliveryPerson = deliveryPerson;
          }
        }
      }
    } catch (error) {
      console.warn('Google Maps API failed, using first available delivery person:', error.message);
    }
    
    const updateData = {
      current_status: 'ASSIGNED',
      delivery_person_id: selectedDeliveryPerson.delivery_person_id
    };
    
    if (permanent_vehicle_id) updateData.permanent_vehicle_id = permanent_vehicle_id;
    if (temp_vehicle_id) updateData.temp_vehicle_id = temp_vehicle_id;
    
    await order.update(updateData);
    await selectedDeliveryPerson.update({ is_available: false });
    
    res.json({
      success: true,
      message: 'Pickup assigned to nearest available delivery person',
      data: {
        order_id,
        status: 'ASSIGNED',
        delivery_person_id: selectedDeliveryPerson.delivery_person_id,
        delivery_person_name: selectedDeliveryPerson.name,
        vehicle_id: permanent_vehicle_id || temp_vehicle_id,
        distance: shortestDistance !== Infinity ? shortestDistance + 'km' : 'N/A'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
//manual receive order
const manualReceiveOrder = async (req, res) => {
  const { order_id, delivery_person_id, permanent_vehicle_id, temp_vehicle_id } = req.body;
  
  try {
    const order = await Order.findOne({
      where: {
        order_id,
        destination_transporter_id: req.user.transporter_id
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to this transporter' });
    }
    
    const deliveryPerson = await DeliveryPerson.findOne({
      where: { 
        delivery_person_id,
        transporter_id: req.user.transporter_id,
        is_available: true
      }
    });
    
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found or not available' });
    }
    
    const updateData = {
      current_status: 'RECEIVED',
      delivery_person_id
    };
    
    if (permanent_vehicle_id) updateData.permanent_vehicle_id = permanent_vehicle_id;
    if (temp_vehicle_id) updateData.temp_vehicle_id = temp_vehicle_id;
    
    await order.update(updateData);
    await deliveryPerson.update({ is_available: false });
    
    res.json({
      success: true,
      message: 'Order received and manually assigned to delivery person',
      data: {
        order_id,
        status: 'RECEIVED',
        delivery_person_id,
        delivery_person_name: deliveryPerson.name,
        vehicle_id: permanent_vehicle_id || temp_vehicle_id
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//automatic receive order
const receiveOrderAndAssignDelivery = async (req, res) => {
  const { order_id } = req.body;
  
  try {
    const order = await Order.findOne({
      where: {
        order_id,
        destination_transporter_id: req.user.transporter_id
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to this transporter' });
    }
    
    const availableDeliveryPersons = await DeliveryPerson.findAll({
      where: { 
        transporter_id: req.user.transporter_id,
        is_available: true
      }
    });
    
    if (availableDeliveryPersons.length === 0) {
      return res.status(404).json({ message: 'No available delivery persons found' });
    }
    
    let selectedDeliveryPerson = availableDeliveryPersons[0];
    let shortestDistance = Infinity;
    
    try {
      for (const deliveryPerson of availableDeliveryPersons) {
        if (deliveryPerson.current_location) {
          const distance = await GoogleMapsService.calculateDistanceAndDuration(
            [order.delivery_address],
            [deliveryPerson.current_location]
          );
          
          if (distance.distance < shortestDistance) {
            shortestDistance = distance.distance;
            selectedDeliveryPerson = deliveryPerson;
          }
        }
      }
    } catch (error) {
      console.warn('Google Maps API failed, using first available delivery person:', error.message);
    }
    
    await order.update({
      current_status: 'RECEIVED',
      delivery_person_id: selectedDeliveryPerson.delivery_person_id
    });
    
    await selectedDeliveryPerson.update({ is_available: false });
    
    res.json({
      success: true,
      message: 'Order received and assigned to nearest available delivery person',
      data: {
        order_id,
        status: 'RECEIVED',
        delivery_person_id: selectedDeliveryPerson.delivery_person_id,
        delivery_person_name: selectedDeliveryPerson.name,
        distance: shortestDistance !== Infinity ? shortestDistance + 'km' : 'N/A'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAssignedOrders = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { source_transporter_id: req.user.transporter_id },
          { destination_transporter_id: req.user.transporter_id }
        ]
      },
      order: [['created_at', 'DESC']]
    });
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { order_id, status } = req.body;
  
  try {
    const validStatuses = ['PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const updated = await Order.update(
      { current_status: status },
      { where: { order_id } }
    );
    
    if (!updated[0]) return res.status(404).json({ message: 'Order not found' });
    
    res.json({ 
      success: true,
      message: 'Order status updated successfully',
      data: { order_id, status }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getDeliveryPersons = async (req, res) => {
  try {
    const deliveryPersons = await DeliveryPerson.findAll({
      where: { transporter_id: req.user.transporter_id },
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    
    // Get total deliveries count for each delivery person
    const deliveryPersonsWithStats = await Promise.all(
      deliveryPersons.map(async (person) => {
        const totalDeliveries = await Order.count({
          where: {
            delivery_person_id: person.delivery_person_id,
            current_status: 'COMPLETED'
          }
        });
        
        return {
          ...person.toJSON(),
          total_deliveries: totalDeliveries
        };
      })
    );
    
    res.json({ success: true, data: deliveryPersonsWithStats });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getVehicles = async (req, res) => {
  try {
    const permanentVehicles = await PermanentVehicle.findAll({
      where: { transporter_id: req.user.transporter_id },
      include: [{
        model: TransporterUser,
        as: 'transporter',
        attributes: ['transporter_id', 'name', 'mobile_number', 'zone', 'district', 'state']
      }],
      order: [['created_at', 'DESC']]
    });
    
    const temporaryVehicles = await TemporaryVehicle.findAll({
      where: { transporter_id: req.user.transporter_id },
      include: [{
        model: TransporterUser,
        as: 'transporter',
        attributes: ['transporter_id', 'name', 'mobile_number', 'zone', 'district', 'state']
      }],
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        permanent: permanentVehicles,
        temporary: temporaryVehicles,
        total: permanentVehicles.length + temporaryVehicles.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  getProfile, 
  updateProfile, 
  addDeliveryPerson, 
  deleteDeliveryPerson, 
  assignVehicleToOrder,
  assignOrderToDeliveryPerson,
  assignPickupDeliveryPerson,
  manualReceiveOrder,
  receiveOrderAndAssignDelivery,
  getAssignedOrders,
  updateOrderStatus,
  getDeliveryPersons,
  getVehicles
};