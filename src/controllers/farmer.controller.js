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
    const DeliveryPerson = require('../models/deliveryPerson.model');
    const GoogleMapsService = require('../services/googleMaps.service');
    
    console.log('\n=== TRANSPORTER ASSIGNMENT WITH GOOGLE MAPS STARTED ===');
    console.log('Order ID:', order_id);
    console.log('Farmer ID:', req.user.farmer_id);
    
    // Find the order
    const order = await Order.findOne({
      where: { order_id },
      include: [{
        model: Product,
        where: { farmer_id: req.user.farmer_id }
      }]
    });
    
    if (!order) {
      console.log('❌ Order not found');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    console.log('✅ Order found, current status:', order.current_status);
    console.log('Delivery Address:', order.delivery_address);
    
    if (order.current_status !== 'PLACED') {
      console.log('❌ Order is not in PLACED status');
      return res.status(400).json({ 
        success: false, 
        message: 'Order must be in PLACED status to assign transporters' 
      });
    }
    
    // Get farmer details
    const farmer = await FarmerUser.findByPk(req.user.farmer_id);
    if (!farmer) {
      console.log('❌ Farmer not found');
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }
    
    const farmerAddress = `${farmer.address}, ${farmer.zone}, ${farmer.district}, ${farmer.state}`;
    console.log('✅ Farmer Address:', farmerAddress);
    
    // Get all transporters
    const allTransporters = await TransporterUser.findAll();
    console.log('Total Transporters in DB:', allTransporters.length);
    
    if (allTransporters.length === 0) {
      console.log('⚠️ No transporters found in database');
      // Still update order to ASSIGNED for testing
      await order.update({ current_status: 'ASSIGNED' });
      
      try {
        await Notification.create({
          user_type: 'customer',
          user_id: order.customer_id,
          title: 'Order Processing',
          message: `Your order #${order.order_id} is being processed for delivery`,
          type: 'order',
          order_id: order.order_id
        });
      } catch (notifError) {
        console.log('⚠️ Notification failed:', notifError.message);
      }
      
      return res.json({
        success: true,
        message: 'Order assigned (no transporters available)',
        data: {
          order_id,
          status: 'ASSIGNED',
          current_status: 'ASSIGNED',
          note: 'No transporters in database'
        }
      });
    }
    
    // Filter transporters with available delivery persons (optional check)
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
    
    console.log('Transporters with available delivery persons:', transportersWithDelivery.length);
    
    // Use transporters with delivery persons if available, otherwise use all
    const selectedTransporters = transportersWithDelivery.length > 0 ? transportersWithDelivery : allTransporters;
    console.log('Selected transporters for assignment:', selectedTransporters.length);
    
    // Find closest transporter to farmer (source)
    let sourceTransporter = null;
    let shortestSourceDistance = Infinity;
    
    console.log('\n--- Finding Source Transporter (closest to farmer) ---');
    for (const transporter of selectedTransporters) {
      const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
      console.log(`Checking transporter: ${transporter.name} at ${transporterAddress}`);
      
      try {
        const distanceData = await GoogleMapsService.calculateDistanceAndDuration(
          [farmerAddress],
          [transporterAddress]
        );
        
        console.log(`  Distance: ${distanceData.distance} meters, Duration: ${distanceData.duration} seconds`);
        
        if (distanceData.distance < shortestSourceDistance) {
          shortestSourceDistance = distanceData.distance;
          sourceTransporter = transporter;
          console.log(`  ✅ New closest source transporter: ${transporter.name}`);
        }
      } catch (error) {
        console.log(`  ⚠️ Google Maps error for ${transporter.name}:`, error.message);
      }
    }
    
    // Fallback if Google Maps failed for all
    if (!sourceTransporter) {
      console.log('⚠️ Google Maps failed for all source transporters, using first available');
      sourceTransporter = selectedTransporters[0];
    }
    
    console.log(`\n✅ Selected Source Transporter: ${sourceTransporter.name} (${shortestSourceDistance}m from farmer)`);
    
    // Find closest transporter to customer (destination)
    let destTransporter = null;
    let shortestDestDistance = Infinity;
    const destinationCandidates = [];
    
    console.log('\n--- Finding Destination Transporter (closest to customer) ---');
    for (const transporter of selectedTransporters) {
      const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
      console.log(`Checking transporter: ${transporter.name} at ${transporterAddress}`);
      
      try {
        const distanceData = await GoogleMapsService.calculateDistanceAndDuration(
          [order.delivery_address],
          [transporterAddress]
        );
        
        console.log(`  Distance: ${distanceData.distance} meters, Duration: ${distanceData.duration} seconds`);
        
        if (distanceData.distance < shortestDestDistance) {
          shortestDestDistance = distanceData.distance;
          destTransporter = transporter;
          console.log(`  ✅ New closest destination transporter: ${transporter.name}`);
        }

        destinationCandidates.push({ transporter, distance: distanceData.distance });
      } catch (error) {
        console.log(`  ⚠️ Google Maps error for ${transporter.name}:`, error.message);
      }
    }
    
    // Fallback if Google Maps failed for all
    if (!destTransporter) {
      console.log('⚠️ Google Maps failed for all destination transporters, using second available or same as source');
      destTransporter = selectedTransporters.length > 1 ? selectedTransporters[1] : selectedTransporters[0];
    }

    // Enforce different source and destination transporters when possible.
    if (
      sourceTransporter &&
      destTransporter &&
      sourceTransporter.transporter_id === destTransporter.transporter_id &&
      selectedTransporters.length > 1
    ) {
      console.log('⚠️ Source and destination transporter matched. Trying distinct destination transporter...');

      const alternateByDistance = destinationCandidates
        .filter(candidate => candidate.transporter.transporter_id !== sourceTransporter.transporter_id)
        .sort((a, b) => a.distance - b.distance)[0];

      const alternateFallback = selectedTransporters.find(
        transporter => transporter.transporter_id !== sourceTransporter.transporter_id
      );

      if (alternateByDistance) {
        destTransporter = alternateByDistance.transporter;
        shortestDestDistance = alternateByDistance.distance;
      } else if (alternateFallback) {
        destTransporter = alternateFallback;
      }

      console.log(`✅ Distinct destination transporter selected: ${destTransporter.name}`);
    }
    
    console.log(`\n✅ Selected Destination Transporter: ${destTransporter.name} (${shortestDestDistance}m from customer)`);
    
    // Update order with transporter assignments
    await order.update({
      current_status: 'ASSIGNED',
      source_transporter_id: sourceTransporter.transporter_id,
      destination_transporter_id: destTransporter.transporter_id
    });
    
    console.log('\n✅ Order updated with transporter assignments');
    
    // Notify customer
    try {
      await Notification.create({
        user_type: 'customer',
        user_id: order.customer_id,
        title: 'Transporters Assigned',
        message: `Transporters have been assigned to your order #${order.order_id}. Your order will be picked up soon.`,
        type: 'order',
        order_id: order.order_id
      });
      console.log('✅ Customer notification sent');
    } catch (notifError) {
      console.log('⚠️ Notification failed but continuing:', notifError.message);
    }
    
    console.log('\n=== TRANSPORTER ASSIGNMENT COMPLETED ===');
    console.log('Order ID:', order_id);
    console.log('Status: PLACED → ASSIGNED');
    console.log('Source Transporter:', sourceTransporter.name, `(${(shortestSourceDistance / 1000).toFixed(2)} km from farmer)`);
    console.log('Destination Transporter:', destTransporter.name, `(${(shortestDestDistance / 1000).toFixed(2)} km from customer)`);
    console.log('=== END ASSIGNMENT ===\n');
    
    res.json({
      success: true,
      message: 'Transporters assigned successfully using Google Maps',
      data: {
        order_id,
        status: 'ASSIGNED',
        current_status: 'ASSIGNED',
        source_transporter: {
          id: sourceTransporter.transporter_id,
          name: sourceTransporter.name,
          distance_from_farmer_km: (shortestSourceDistance / 1000).toFixed(2)
        },
        destination_transporter: {
          id: destTransporter.transporter_id,
          name: destTransporter.name,
          distance_from_customer_km: (shortestDestDistance / 1000).toFixed(2)
        }
      }
    });
    
  } catch (error) {
    console.error('\n❌ ASSIGN TRANSPORTERS ERROR:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Order ID:', req.params.order_id);
    console.error('Farmer ID:', req.user?.farmer_id);
    console.error('=== END ERROR LOG ===\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Error assigning transporters',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    const TransporterUser = require('../models/transporter_user.model');
    const DeliveryPerson = require('../models/deliveryPerson.model');
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
        attributes: ['customer_id', 'name', 'mobile_number', 'address', 'zone', 'district', 'state', 'image_url'],
        required: false
      }, {
        model: TransporterUser,
        as: 'source_transporter',
        attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state', 'image_url'],
        required: false
      }, {
        model: TransporterUser,
        as: 'destination_transporter',
        attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state', 'image_url'],
        required: false
      }, {
        model: DeliveryPerson,
        as: 'delivery_person',
        attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_type', 'vehicle_number'],
        required: false
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
      { status: 'PENDING', label: 'Order Placed', icon: '🛒' },
      { status: 'ASSIGNED', label: 'Farmer Accepted + Transporters Assigned', icon: '🚛' },
      { status: 'PICKUP_ASSIGNED', label: 'Pickup Person Assigned', icon: '👤' },
      { status: 'PICKED_UP', label: 'Picked Up from Farmer', icon: '📦' },
      { status: 'RECEIVED', label: 'Received at Source Office', icon: '🏢' },
      { status: 'SHIPPED', label: 'Shipped from Source', icon: '📤' },
      { status: 'IN_TRANSIT', label: 'In Transit to Destination', icon: '🚚' },
      { status: 'REACHED_DESTINATION', label: 'Reached Destination', icon: '🏭' },
      { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🚴' },
      { status: 'DELIVERED', label: 'Delivered to Customer', icon: '✅' }
    ];

    // Map status to step index — support alternate status names
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
