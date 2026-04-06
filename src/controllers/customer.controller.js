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
    const DeliveryPerson = require('../models/deliveryPerson.model');
    const DeliveryTracking = require('../models/deliveryTracking.model');
    const ProductImage = require('../models/productImage.model');
    
    const order = await Order.findOne({
      where: { 
        order_id,
        customer_id: req.user.customer_id 
      },
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price'],
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_url', 'is_primary']
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'zone', 'district', 'state'],
              required: false
            }
          ]
        },
        {
          model: TransporterUser,
          as: 'source_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state'],
          required: false
        },
        {
          model: TransporterUser,
          as: 'destination_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state'],
          required: false
        },
        {
          model: DeliveryPerson,
          as: 'delivery_person',
          attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_type', 'vehicle_number'],
          required: false
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
      { status: 'PENDING', label: 'Order Placed', icon: '🛒' },
      { status: 'ASSIGNED', label: 'Farmer Accepted + Transporters Assigned', icon: '🚛' },
      { status: 'PICKUP_ASSIGNED', label: 'Pickup Person Assigned', icon: '👤' },
      { status: 'PICKED_UP', label: 'Picked Up from Farmer', icon: '📦' },
      { status: 'RECEIVED', label: 'Received at Source Office', icon: '🏢' },
      { status: 'SHIPPED', label: 'Shipped from Source', icon: '📤' },
      { status: 'IN_TRANSIT', label: 'In Transit to Destination', icon: '🚚' },
      { status: 'REACHED_DESTINATION', label: 'Received at Destination', icon: '🏭' },
      { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🚴' },
      { status: 'DELIVERED', label: 'Delivered to Customer', icon: '✅' }
    ];

    const STATUS_TO_INDEX = {
      PENDING: 0, PLACED: 0,
      CONFIRMED: 1, ACCEPTED: 1, ASSIGNED: 1,
      PICKUP_ASSIGNED: 2, PICKUP_IN_PROGRESS: 2,
      PICKED_UP: 3,
      RECEIVED: 4,
      SHIPPED: 5,
      IN_TRANSIT: 6,
      REACHED_DESTINATION: 7,
      OUT_FOR_DELIVERY: 8,
      DELIVERED: 9, COMPLETED: 9
    };

    const currentStatus = (order.current_status || '').toUpperCase();
    const currentStepIndex = STATUS_TO_INDEX[currentStatus] ?? 0;
    
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