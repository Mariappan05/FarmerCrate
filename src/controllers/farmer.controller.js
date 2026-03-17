const FarmerUser = require('../models/farmer_user.model');
const ProductImage = require('../models/productImage.model');
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

// Get all orders for farmer (order history)
exports.getAllOrders = async (req, res) => {
  try {
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const CustomerUser = require('../models/customer_user.model');
    
    const orders = await Order.findAll({
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id },
        attributes: ['product_id', 'name', 'current_price'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name', 'mobile_number', 'email', 'address', 'image_url']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Error retrieving orders' });
  }
};

// Get accepted orders for farmer
exports.getAcceptedOrders = async (req, res) => {
  try {
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const CustomerUser = require('../models/customer_user.model');
    const { Op } = require('sequelize');
    
    const orders = await Order.findAll({
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id },
        attributes: ['product_id', 'name', 'current_price'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name', 'mobile_number', 'email', 'address', 'image_url']
      }],
      where: {
        current_status: {
          [Op.in]: ['PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY']
        }
      },
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get accepted orders error:', error);
    res.status(500).json({ message: 'Error retrieving accepted orders' });
  }
};

// Get rejected orders for farmer
exports.getRejectedOrders = async (req, res) => {
  try {
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const CustomerUser = require('../models/customer_user.model');
    
    const orders = await Order.findAll({
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id },
        attributes: ['product_id', 'name', 'current_price'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name', 'mobile_number', 'email', 'address', 'image_url']
      }],
      where: { current_status: 'CANCELLED' },
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get rejected orders error:', error);
    res.status(500).json({ message: 'Error retrieving rejected orders' });
  }
};

// Get completed orders for farmer
exports.getCompletedOrders = async (req, res) => {
  try {
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const CustomerUser = require('../models/customer_user.model');
    
    const orders = await Order.findAll({
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id },
        attributes: ['product_id', 'name', 'current_price'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name', 'mobile_number', 'email', 'address', 'image_url']
      }],
      where: { current_status: 'COMPLETED' },
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get completed orders error:', error);
    res.status(500).json({ message: 'Error retrieving completed orders' });
  }
};

// Get pending orders for farmer
exports.getPendingOrders = async (req, res) => {
  try {
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const CustomerUser = require('../models/customer_user.model');
    
    const orders = await Order.findAll({
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id },
        attributes: ['product_id', 'name', 'current_price'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name', 'mobile_number', 'email', 'address', 'image_url']
      }],
      where: { current_status: 'PENDING' },
      order: [['created_at', 'DESC']]
    });

    console.log('\n=== PENDING ORDERS FOR FARMER ===');
    console.log('Farmer ID:', req.user.farmer_id);
    console.log('Total Pending Orders:', orders.length);
    orders.forEach(order => {
      const productName = order.Product?.name || order.product?.name || 'Unknown Product';
      const customerName = order.customer?.name || 'Unknown Customer';
      console.log(`Order #${order.order_id}: ${productName} x${order.quantity} - ₹${order.total_price} from ${customerName}`);
    });
    console.log('=== END PENDING ORDERS ===\n');

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get pending orders error:', error);
    res.status(500).json({ message: 'Error retrieving pending orders' });
  }
};

// Assign transporters to accepted order (Step 2: Assign transporters after acceptance)
exports.assignTransporters = async (req, res) => {
  try {
    const { order_id } = req.params;
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const TransporterUser = require('../models/transporter_user.model');
    const Notification = require('../models/notification.model');
    
    console.log('\n=== TRANSPORTER ASSIGNMENT STARTED ===');
    console.log('Order ID:', order_id);
    
    const order = await Order.findOne({
      where: { order_id },
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id }
      }]
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.current_status !== 'PLACED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must be in PLACED status to assign transporters' 
      });
    }
    
    // Get farmer details
    const farmer = await FarmerUser.findByPk(req.user.farmer_id);
    const allTransporters = await TransporterUser.findAll();
    
    console.log('Total Transporters in DB:', allTransporters.length);
    
    // If no transporters exist, create a mock assignment
    if (allTransporters.length === 0) {
      console.log('No transporters found, creating mock assignment');
      
      // Update order status to ASSIGNED without actual transporter IDs
      await order.update({
        current_status: 'ASSIGNED',
        source_transporter_id: null,
        destination_transporter_id: null
      });
      
      // Notify customer
      await Notification.create({
        user_type: 'customer',
        user_id: order.customer_id,
        title: 'Order Processing',
        message: `Your order #${order.order_id} is being processed for delivery`,
        type: 'order',
        order_id: order.order_id
      });
      
      console.log('Mock assignment completed - Order status updated to ASSIGNED');
      
      return res.json({
        success: true,
        message: 'Order assigned for processing (mock assignment)',
        data: {
          order_id,
          status: 'ASSIGNED',
          current_status: 'ASSIGNED',
          note: 'Mock assignment - no transporters available'
        }
      });
    }
    
    const DeliveryPerson = require('../models/deliveryPerson.model');
    const GoogleMapsService = require('../services/googleMaps.service');
    
    // Filter transporters with available delivery persons
    const transportersWithDelivery = [];
    for (const transporter of allTransporters) {
      const availableDeliveryCount = await DeliveryPerson.count({
        where: {
          transporter_id: transporter.transporter_id,
          is_available: true
        }
      });
      
      if (availableDeliveryCount > 0) {
        transportersWithDelivery.push(transporter);
      }
    }
    
    console.log('Available Transporters with Delivery Persons:', transportersWithDelivery.length);
    
    // If no transporters with delivery persons, use any available transporter
    let selectedTransporters = transportersWithDelivery;
    if (selectedTransporters.length === 0) {
      console.log('No transporters with available delivery persons, using any available transporter');
      selectedTransporters = allTransporters;
    }
    
    if (selectedTransporters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No transporters found in the system'
      });
    }
    
    const farmerAddress = `${farmer.address}, ${farmer.zone}, ${farmer.district}, ${farmer.state}`;
    
    let sourceTransporter = selectedTransporters[0]; // Default to first transporter
    let destTransporter = selectedTransporters[selectedTransporters.length > 1 ? 1 : 0]; // Use second if available, otherwise same
    
    try {
      // Try to find closest transporters using Google Maps
      let shortestSourceDistance = Infinity;
      let shortestDestDistance = Infinity;
      
      // Find closest transporter to farmer
      for (const transporter of selectedTransporters) {
        const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
        const distance = await GoogleMapsService.calculateDistanceAndDuration([farmerAddress], [transporterAddress]);
        
        if (distance.distance < shortestSourceDistance) {
          shortestSourceDistance = distance.distance;
          sourceTransporter = transporter;
        }
      }
      
      // Find closest transporter to customer
      for (const transporter of selectedTransporters) {
        const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
        const distance = await GoogleMapsService.calculateDistanceAndDuration([order.delivery_address], [transporterAddress]);
        
        if (distance.distance < shortestDestDistance) {
          shortestDestDistance = distance.distance;
          destTransporter = transporter;
        }
      }
    } catch (error) {
      console.warn('Google Maps failed, using fallback assignment:', error.message);
      // Keep the default assignments
    }
    
    // Update order with transporter assignments
    await order.update({
      current_status: 'ASSIGNED',
      source_transporter_id: sourceTransporter?.transporter_id,
      destination_transporter_id: destTransporter?.transporter_id
    });
    
    // Notify customer
    await Notification.create({
      user_type: 'customer',
      user_id: order.customer_id,
      title: 'Transporters Assigned',
      message: `Transporters have been assigned to your order #${order.order_id}`,
      type: 'order',
      order_id: order.order_id
    });
    
    console.log('\n--- TRANSPORTER ASSIGNMENT COMPLETED ---');
    console.log('Status: PLACED → ASSIGNED');
    console.log('Source Transporter:', sourceTransporter?.name);
    console.log('Destination Transporter:', destTransporter?.name);
    console.log('=== END TRANSPORTER ASSIGNMENT ===\n');
    
    res.json({
      success: true,
      message: 'Transporters assigned successfully',
      data: {
        order_id,
        status: 'ASSIGNED',
        current_status: 'ASSIGNED',
        source_transporter: sourceTransporter?.name,
        destination_transporter: destTransporter?.name
      }
    });
  } catch (error) {
    console.error('Assign transporters error:', error);
    res.status(500).json({ message: 'Error assigning transporters' });
  }
};

// Accept order by farmer (Step 1: Just accept, don't assign transporters yet)
exports.acceptOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const Notification = require('../models/notification.model');
    
    console.log('\n=== ORDER ACCEPTANCE STARTED ===');
    console.log('Order ID:', order_id);
    console.log('Farmer ID:', req.user.farmer_id);
    
    const order = await Order.findOne({
      where: { order_id },
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id },
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }]
    });
    
    if (!order) {
      console.log('❌ Order not found');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.current_status !== 'PENDING') {
      console.log('❌ Order is not in pending status, current status:', order.current_status);
      return res.status(400).json({ success: false, message: 'Order is not in pending status' });
    }

    // Step 1: Just accept the order, don't assign transporters yet
    await order.update({
      current_status: 'PLACED'
    });
    
    // Create notification for customer
    await Notification.create({
      user_type: 'customer',
      user_id: order.customer_id,
      title: 'Order Accepted',
      message: `Your order #${order.order_id} has been accepted by the farmer`,
      type: 'order',
      order_id: order.order_id
    });
    
    console.log('\n--- ORDER STATUS UPDATE ---');
    console.log('Status: PENDING → PLACED');
    console.log('✅ Order accepted by farmer');
    console.log('✅ Customer notification sent');
    console.log('⏳ Transporter assignment will happen separately');
    console.log('=== ORDER ACCEPTANCE COMPLETED ===\n');
    
    // Send real-time update
    const WebSocketService = require('../services/websocket.service');
    WebSocketService.sendOrderUpdate(order_id, {
      status: 'PLACED',
      message: 'Order accepted by farmer - awaiting transporter assignment'
    });

    res.json({
      success: true,
      message: 'Order accepted successfully. Transporter will be assigned shortly.',
      data: {
        order_id,
        status: 'PLACED',
        current_status: 'PLACED',
        message: 'Order accepted - awaiting transporter assignment'
      }
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ message: 'Error accepting order' });
  }
};

// Ship order (triggers fund transfers)
exports.shipOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const TransporterUser = require('../models/transporter_user.model');
    const RazorpayService = require('../services/razorpay.service');
    const Transaction = require('../models/transaction.model');
    
    const order = await Order.findOne({
      where: { order_id },
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id }
      }]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.current_status !== 'PLACED') {
      return res.status(400).json({ message: 'Order must be in PLACED status to ship' });
    }
    
    // Get farmer and transporter details
    const farmer = await FarmerUser.findByPk(req.user.farmer_id);
    const sourceTransporter = await TransporterUser.findByPk(order.source_transporter_id);
    const destTransporter = await TransporterUser.findByPk(order.destination_transporter_id);
    
    const transferResults = { allSuccess: true, transfers: [] };
    
    // Transfer to farmer
    if (farmer.account_number && farmer.ifsc_code) {
      const farmerTransfer = await RazorpayService.transferFunds({
        account_number: farmer.account_number,
        ifsc_code: farmer.ifsc_code,
        amount: order.farmer_amount,
        purpose: 'Product sale payment',
        reference: `order_${order_id}_farmer`
      });
      
      transferResults.transfers.push({
        type: 'farmer',
        amount: order.farmer_amount,
        status: farmerTransfer.success ? 'success' : 'failed',
        details: farmerTransfer
      });
      
      await Transaction.create({
        farmer_id: farmer.farmer_id,
        user_type: 'farmer',
        user_id: farmer.farmer_id,
        order_id: order.order_id,
        amount: order.farmer_amount,
        type: 'credit',
        status: farmerTransfer.success ? 'completed' : 'failed',
        description: `Farmer payment for order #${order.order_id}`
      });
    }
    
    // Transfer to transporters
    const transportAmount = order.transport_charge / 2;
    
    if (sourceTransporter?.account_number && sourceTransporter?.ifsc_code) {
      const sourceTransfer = await RazorpayService.transferFunds({
        account_number: sourceTransporter.account_number,
        ifsc_code: sourceTransporter.ifsc_code,
        amount: transportAmount,
        purpose: 'Transport service payment',
        reference: `order_${order_id}_source_transport`
      });
      
      transferResults.transfers.push({
        type: 'source_transporter',
        amount: transportAmount,
        status: sourceTransfer.success ? 'success' : 'failed'
      });
    }
    
    if (destTransporter?.account_number && destTransporter?.ifsc_code) {
      const destTransfer = await RazorpayService.transferFunds({
        account_number: destTransporter.account_number,
        ifsc_code: destTransporter.ifsc_code,
        amount: transportAmount,
        purpose: 'Transport service payment',
        reference: `order_${order_id}_dest_transport`
      });
      
      transferResults.transfers.push({
        type: 'dest_transporter',
        amount: transportAmount,
        status: destTransfer.success ? 'success' : 'failed'
      });
    }
    
    // Admin commission stays in Razorpay
    transferResults.transfers.push({
      type: 'admin_commission',
      amount: order.admin_commission,
      status: 'retained',
      details: 'Commission retained in Razorpay account'
    });
    
    // Update order status
    await order.update({ current_status: 'SHIPPED' });
    
    console.log('\n=== ORDER SHIPPING COMPLETED ===');
    console.log('Order ID:', order_id);
    console.log('Farmer:', farmer.name, '- Account:', farmer.account_number);
    console.log('Source Transporter:', sourceTransporter?.name, '- Account:', sourceTransporter?.account_number);
    console.log('Destination Transporter:', destTransporter?.name, '- Account:', destTransporter?.account_number);
    console.log('Transfer Results:', JSON.stringify(transferResults, null, 2));
    console.log('Order Status Updated to: SHIPPED');
    console.log('=== END SHIPPING PROCESS ===\n');
    
    res.json({
      success: true,
      message: 'Order shipped and funds transferred',
      data: {
        order_id,
        status: 'SHIPPED',
        transfer_results: transferResults
      }
    });
  } catch (error) {
    console.error('Ship order error:', error);
    res.status(500).json({ message: 'Error shipping order' });
  }
};


// Track specific order for farmer
exports.trackOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const CustomerUser = require('../models/customer_user.model');
    const DeliveryTracking = require('../models/deliveryTracking.model');
    
    const order = await Order.findOne({
      where: { order_id },
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id },
        attributes: ['product_id', 'name', 'current_price'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name', 'mobile_number', 'address', 'zone']
      }]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const trackingHistory = await DeliveryTracking.findAll({
      where: { order_id },
      order: [['scanned_at', 'ASC']]
    });

    const trackingSteps = [
      { status: 'PLACED', label: 'Order Accepted', icon: '✅' },
      { status: 'ASSIGNED', label: 'Transporter Assigned', icon: '🚛' },
      { status: 'SHIPPED', label: 'Picked Up from Farm', icon: '📤' },
      { status: 'IN_TRANSIT', label: 'In Transit', icon: '🚚' },
      { status: 'RECEIVED', label: 'Reached Destination Hub', icon: '🏢' },
      { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🚴' },
      { status: 'COMPLETED', label: 'Delivered to Customer', icon: '✅' }
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

// Get real-time tracking updates for farmer
exports.getTrackingUpdates = async (req, res) => {
  try {
    const { order_id } = req.params;
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const DeliveryTracking = require('../models/deliveryTracking.model');
    
    const order = await Order.findOne({
      where: { order_id },
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id }
      }]
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
        last_updated: latestTracking?.scanned_at || order.updated_at,
        source_transporter_id: order.source_transporter_id,
        destination_transporter_id: order.destination_transporter_id
      }
    });
  } catch (error) {
    console.error('Get tracking updates error:', error);
    res.status(500).json({ message: 'Error getting tracking updates' });
  }
};

// Get all active shipments for farmer
exports.getActiveShipments = async (req, res) => {
  try {
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const CustomerUser = require('../models/customer_user.model');
    const TransporterUser = require('../models/transporter_user.model');
    const DeliveryPerson = require('../models/deliveryPerson.model');
    const { Op } = require('sequelize');
    
    const orders = await Order.findAll({
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id },
        attributes: ['product_id', 'name', 'current_price'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name', 'mobile_number', 'address', 'email', 'image_url']
      }, {
        model: TransporterUser,
        as: 'source_transporter',
        attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state'],
        required: false
      }, {
        model: TransporterUser,
        as: 'destination_transporter',
        attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state'],
        required: false
      }, {
        model: DeliveryPerson,
        as: 'delivery_person',
        attributes: ['delivery_person_id', 'name', 'mobile_number', 'email', 'vehicle_type', 'vehicle_number', 'current_latitude', 'current_longitude'],
        required: false
      }],
      where: {
        current_status: {
          [Op.in]: ['PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY']
        }
      },
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get active shipments error:', error);
    res.status(500).json({ message: 'Error retrieving active shipments' });
  }
};

// Update order status (generic endpoint for Flutter app)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { status } = req.body;
    
    if (status === 'accepted') {
      return exports.acceptOrder(req, res);
    } else if (status === 'rejected') {
      return exports.rejectOrder(req, res);
    } else {
      return res.status(400).json({ message: 'Invalid status. Use "accepted" or "rejected"' });
    }
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

// Reject order by farmer
exports.rejectOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { reason } = req.body;
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const Notification = require('../models/notification.model');
    
    const order = await Order.findOne({
      where: { order_id },
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id }
      }]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.current_status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending orders can be rejected' });
    }
    
    // Update order status to CANCELLED
    await order.update({ 
      current_status: 'CANCELLED'
    });
    
    // Restore product quantity
    const product = order.Product || await Product.findByPk(order.product_id);
    if (product) {
      await product.update({ 
        quantity: product.quantity + order.quantity 
      });
    }
    
    // Notify customer
    await Notification.create({
      user_type: 'customer',
      user_id: order.customer_id,
      title: 'Order Rejected',
      message: `Your order #${order.order_id} has been rejected by the farmer${reason ? `: ${reason}` : ''}`,
      type: 'order',
      order_id: order.order_id
    });
    
    console.log('\n=== ORDER REJECTED ===');
    console.log('Order ID:', order_id);
    console.log('Farmer ID:', req.user.farmer_id);
    console.log('Reason:', reason || 'No reason provided');
    console.log('Product quantity restored:', order.quantity);
    console.log('=== END ORDER REJECTION ===\n');
    
    // Send real-time update
    const WebSocketService = require('../services/websocket.service');
    WebSocketService.sendOrderUpdate(order_id, {
      status: 'CANCELLED',
      message: 'Order rejected by farmer',
      reason: reason || null
    });

    res.json({
      success: true,
      message: 'Order rejected successfully',
      data: {
        order_id,
        status: 'CANCELLED',
        reason: reason || null
      }
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ message: 'Error rejecting order' });
  }
};
