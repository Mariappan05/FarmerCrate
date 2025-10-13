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

// Get customer orders with tracking
exports.getMyOrders = async (req, res) => {
  try {
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const FarmerUser = require('../models/farmer_user.model');
    const DeliveryTracking = require('../models/deliveryTracking.model');
    
    const orders = await Order.findAll({
      where: { customer_id: req.user.customer_id },
      include: [
        {
          model: Product,
          attributes: ['name', 'images', 'current_price'],
          include: [{
            model: FarmerUser,
            as: 'farmer',
            attributes: ['name', 'zone', 'district', 'state']
          }]
        },
        {
          model: DeliveryTracking,
          as: 'tracking',
          order: [['scanned_at', 'DESC']],
          limit: 1
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ message: 'Error retrieving orders' });
  }
};

// Get detailed order tracking
exports.trackOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const FarmerUser = require('../models/farmer_user.model');
    const DeliveryTracking = require('../models/deliveryTracking.model');
    
    const order = await Order.findOne({
      where: { 
        order_id,
        customer_id: req.user.customer_id 
      },
      include: [
        {
          model: Product,
          attributes: ['name', 'images', 'current_price'],
          include: [{
            model: FarmerUser,
            as: 'farmer',
            attributes: ['name', 'zone', 'district', 'state', 'address']
          }]
        },
        {
          model: TransporterUser,
          as: 'sourceTransporter',
          attributes: ['name', 'mobile_number', 'zone']
        },
        {
          model: TransporterUser,
          as: 'destinationTransporter',
          attributes: ['name', 'mobile_number', 'zone']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const trackingHistory = await DeliveryTracking.findAll({
      where: { order_id },
      order: [['scanned_at', 'ASC']]
    });

    const trackingSteps = [
      { status: 'PLACED', label: 'Order Placed', icon: '📦' },
      { status: 'ACCEPTED', label: 'Order Accepted', icon: '✅' },
      { status: 'ASSIGNED', label: 'Transporter Assigned', icon: '🚛' },
      { status: 'SHIPPED', label: 'Shipped from Farm', icon: '📤' },
      { status: 'IN_TRANSIT', label: 'In Transit', icon: '🚚' },
      { status: 'RECEIVED', label: 'Received at Hub', icon: '🏢' },
      { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🚴' },
      { status: 'COMPLETED', label: 'Delivered', icon: '✅' }
    ];

    const currentStepIndex = trackingSteps.findIndex(step => step.status === order.current_status);
    
    const enrichedSteps = trackingSteps.map((step, index) => {
      const trackingEvent = trackingHistory.find(t => t.status === step.status);
      return {
        ...step,
        completed: index <= currentStepIndex,
        current: index === currentStepIndex,
        timestamp: trackingEvent?.scanned_at,
        location: trackingEvent?.location_address,
        notes: trackingEvent?.notes
      };
    });

    res.json({
      success: true,
      data: {
        order,
        tracking_steps: enrichedSteps,
        tracking_history: trackingHistory,
        estimated_delivery: order.estimated_delivery_time
      }
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ message: 'Error tracking order' });
  }
};

// Real-time tracking updates
exports.getTrackingUpdates = async (req, res) => {
  try {
    const { order_id } = req.params;
    const Order = require('../models/order.model');
    const DeliveryTracking = require('../models/deliveryTracking.model');
    
    const order = await Order.findOne({
      where: { 
        order_id,
        customer_id: req.user.customer_id 
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const latestTracking = await DeliveryTracking.findOne({
      where: { order_id },
      order: [['scanned_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        order_id,
        current_status: order.current_status,
        latest_update: latestTracking,
        last_updated: latestTracking?.scanned_at || order.updated_at
      }
    });
  } catch (error) {
    console.error('Get tracking updates error:', error);
    res.status(500).json({ message: 'Error getting tracking updates' });
  }
};