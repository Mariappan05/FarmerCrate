const { validationResult } = require('express-validator');
const Order = require('../models/order.model');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const Product = require('../models/product.model');
const Transaction = require('../models/transaction.model');
const DeliveryTracking = require('../models/deliveryTracking.model');
const OrderTrackingService = require('../services/orderTracking.service');
const GoogleMapsService = require('../services/googleMaps.service');
const RazorpayService = require('../services/razorpay.service');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// Create payment order (step 1)
exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      product_id, 
      quantity, 
      delivery_address,
      customer_zone,
      customer_pincode,
      total_price,
      farmer_amount,
      admin_commission,
      transport_charge
    } = req.body;
    
    // Create Razorpay order for payment
    const receipt = `order_${Date.now()}`;
    const razorpayOrder = await RazorpayService.createOrder(total_price, 'INR', receipt);
    
    // Return payment details for frontend to process
    return res.json({
      success: true,
      message: 'Payment order created. Complete payment to place order.',
      payment_details: {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      },
      order_data: {
        product_id,
        quantity,
        delivery_address,
        customer_zone,
        customer_pincode,
        total_price,
        farmer_amount,
        admin_commission,
        transport_charge
      }
    });
    
    // Check if transporters are available for the customer's pincode (case-insensitive)
    const allTransportersForPincode = await TransporterUser.findAll();
    const availableTransporters = allTransportersForPincode.filter(t => 
      t.pincode?.toLowerCase() === customer_pincode?.toLowerCase()
    );
    
    if (availableTransporters.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Delivery not available in your area. No transporters found for pincode: ' + customer_pincode,
        pincode: customer_pincode
      });
    }
    
    // Get product details with farmer info
    const product = await Product.findByPk(product_id, {
      include: [{ model: FarmerUser, as: 'farmer' }]
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient product quantity' });
    }

    // Get all transporters and filter by zone with case-insensitive comparison
    const allTransporters = await TransporterUser.findAll();
    
    const farmerZone = product.farmer.zone?.toLowerCase();
    const customerZoneLower = customer_zone?.toLowerCase();
    
    // Helper function to find matching transporters by zone similarity
    const findTransportersByZone = (targetZone, transporters) => {
      if (!targetZone) return [];
      
      // First try exact match
      let matches = transporters.filter(t => 
        t.zone?.toLowerCase() === targetZone.toLowerCase()
      );
      
      if (matches.length > 0) return matches;
      
      // Then try partial matches - split zone into words and find overlaps
      const targetWords = targetZone.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      return transporters.filter(t => {
        if (!t.zone) return false;
        const transporterWords = t.zone.toLowerCase().split(/\s+/);
        return targetWords.some(word => 
          transporterWords.some(tWord => 
            tWord.includes(word) || word.includes(tWord)
          )
        );
      });
    };
    
    const sourceTransporters = findTransportersByZone(farmerZone, allTransporters);
    const destinationTransporters = findTransportersByZone(customerZoneLower, allTransporters);

    console.log(`Found ${sourceTransporters.length} source transporters in zone: ${product.farmer.zone}`);
    console.log(`Found ${destinationTransporters.length} destination transporters in zone: ${customer_zone}`);
    console.log('All transporter zones:', allTransporters.map(t => t.zone));

    const pickupAddress = `${product.farmer.address}, ${product.farmer.zone}, ${product.farmer.district}, ${product.farmer.state}`;
    
    let selectedSourceTransporter = null;
    let selectedDestinationTransporter = null;
    let shortestDistance = Infinity;
    let routeData = null;

    console.log('\n=== TRANSPORTER ALLOCATION PROCESS ===');
    console.log('Customer Zone:', customer_zone);
    console.log('Farmer Zone:', product.farmer.zone);
    console.log('Customer Address:', delivery_address);
    console.log('Farmer Address:', pickupAddress);
    
    let shortestFarmerDistance = Infinity;
    let shortestCustomerDistance = Infinity;
    let shortestOverallDistance = Infinity;
    let transporterToTransporterDistance = 0;
    
    try {
      // Find shortest distance from farmer address to farmer zone transporters
      console.log('\n=== FARMER TO SOURCE TRANSPORTER DISTANCES ===');
      for (const transporter of sourceTransporters) {
        const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
        const distance = await GoogleMapsService.calculateDistanceAndDuration(
          [pickupAddress],
          [transporterAddress]
        );
        
        console.log(`Farmer to ${transporter.name}: ${distance.distance}km`);
        
        if (distance.distance < shortestFarmerDistance) {
          shortestFarmerDistance = distance.distance;
          selectedSourceTransporter = transporter;
        }
      }
      
      // Find shortest distance from customer address to customer zone transporters
      console.log('\n=== CUSTOMER TO DESTINATION TRANSPORTER DISTANCES ===');
      for (const transporter of destinationTransporters) {
        const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
        const distance = await GoogleMapsService.calculateDistanceAndDuration(
          [delivery_address],
          [transporterAddress]
        );
        
        console.log(`Customer to ${transporter.name}: ${distance.distance}km`);
        
        if (distance.distance < shortestCustomerDistance) {
          shortestCustomerDistance = distance.distance;
          selectedDestinationTransporter = transporter;
        }
      }
      
      // Calculate distance between selected transporters
      if (selectedSourceTransporter && selectedDestinationTransporter) {
        console.log('\n=== SOURCE TO DESTINATION TRANSPORTER DISTANCE ===');
        const sourceAddress = `${selectedSourceTransporter.address}, ${selectedSourceTransporter.zone}, ${selectedSourceTransporter.district}, ${selectedSourceTransporter.state}`;
        const destAddress = `${selectedDestinationTransporter.address}, ${selectedDestinationTransporter.zone}, ${selectedDestinationTransporter.district}, ${selectedDestinationTransporter.state}`;
        
        const distance = await GoogleMapsService.calculateDistanceAndDuration(
          [sourceAddress],
          [destAddress]
        );
        
        transporterToTransporterDistance = distance.distance;
        routeData = distance;
        shortestOverallDistance = shortestFarmerDistance + transporterToTransporterDistance + shortestCustomerDistance;
        
        console.log(`${selectedSourceTransporter.name} to ${selectedDestinationTransporter.name}: ${distance.distance}km`);
      }
    } catch (error) {
      console.warn('Google Maps API failed, using first available transporters:', error.message);
      selectedSourceTransporter = sourceTransporters[0] || null;
      selectedDestinationTransporter = destinationTransporters[0] || null;
    }

    console.log('\n=== FINAL ALLOCATION RESULTS ===');
    console.log('Selected Source Transporter ID:', selectedSourceTransporter?.transporter_id);
    console.log('Selected Source Transporter:', selectedSourceTransporter?.name);
    console.log('Selected Destination Transporter ID:', selectedDestinationTransporter?.transporter_id);
    console.log('Selected Destination Transporter:', selectedDestinationTransporter?.name);
    console.log('Farmer to Source Distance:', shortestFarmerDistance + 'km');
    console.log('Source to Destination Distance:', transporterToTransporterDistance + 'km');
    console.log('Destination to Customer Distance:', shortestCustomerDistance + 'km');
    console.log('Total Overall Distance:', shortestOverallDistance + 'km');
    
    if (!selectedSourceTransporter || !selectedDestinationTransporter) {
      console.log('No transporters found:', {
        sourceTransporters: sourceTransporters.length,
        destinationTransporters: destinationTransporters.length,
        farmerZone: product.farmer.zone,
        customerZone: customer_zone
      });
    }

    // Calculate estimated delivery time
    const estimatedDeliveryTime = routeData 
      ? new Date(Date.now() + (routeData.duration * 60 * 1000))
      : null;


  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating payment order: ' + error.message 
    });
  }
};

// Complete order after payment (step 2)
exports.completeOrder = async (req, res) => {
  try {
    const { 
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_data
    } = req.body;
    
    console.log('\n=== ORDER COMPLETION STARTED ===');
    console.log('Request Data:', { razorpay_order_id, razorpay_payment_id, razorpay_signature });
    console.log('Order Data:', order_data);
    
    // Verify payment
    const isPaymentValid = await RazorpayService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    
    console.log('Payment Verification Result:', isPaymentValid);
    
    if (!isPaymentValid) {
      console.log('❌ Payment verification failed - Order creation aborted');
      return res.status(400).json({ 
        success: false,
        message: 'Payment verification failed. Order not created.' 
      });
    }
    
    console.log('✅ Payment verified successfully - Proceeding with order creation');
    
    const { 
      product_id, 
      quantity, 
      delivery_address,
      customer_zone,
      customer_pincode,
      total_price,
      farmer_amount,
      admin_commission,
      transport_charge
    } = order_data;
    
    // Get product with farmer details
    const product = await Product.findByPk(product_id, {
      include: [{ model: FarmerUser, as: 'farmer' }]
    });
    
    if (!product || product.quantity < quantity) {
      return res.status(400).json({ 
        success: false,
        message: 'Product not available or insufficient quantity' 
      });
    }
    
    // Check transporter availability for pincode
    const allTransportersForPincode = await TransporterUser.findAll();
    const availableTransporters = allTransportersForPincode.filter(t => 
      t.pincode?.toLowerCase() === customer_pincode?.toLowerCase()
    );
    
    if (availableTransporters.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Delivery not available in your area. No transporters found for pincode: ' + customer_pincode,
        pincode: customer_pincode
      });
    }
    
    // Advanced transporter allocation
    const allTransporters = await TransporterUser.findAll();
    const farmerZone = product.farmer.zone?.toLowerCase();
    const customerZoneLower = customer_zone?.toLowerCase();
    
    // Helper function to find matching transporters by zone
    const findTransportersByZone = (targetZone, transporters) => {
      if (!targetZone) return [];
      
      // First try exact match
      let matches = transporters.filter(t => 
        t.zone?.toLowerCase() === targetZone.toLowerCase()
      );
      
      if (matches.length > 0) return matches;
      
      // Then try partial matches
      const targetWords = targetZone.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      return transporters.filter(t => {
        if (!t.zone) return false;
        const transporterWords = t.zone.toLowerCase().split(/\s+/);
        return targetWords.some(word => 
          transporterWords.some(tWord => 
            tWord.includes(word) || word.includes(tWord)
          )
        );
      });
    };
    
    const sourceTransporters = findTransportersByZone(farmerZone, allTransporters);
    const destinationTransporters = findTransportersByZone(customerZoneLower, allTransporters);
    
    const pickupAddress = `${product.farmer.address}, ${product.farmer.zone}, ${product.farmer.district}, ${product.farmer.state}`;
    
    let selectedSourceTransporter = null;
    let selectedDestinationTransporter = null;
    
    // Advanced transporter allocation with Google Maps optimization
    let shortestFarmerDistance = Infinity;
    let shortestCustomerDistance = Infinity;
    let transporterToTransporterDistance = 0;
    let routeData = null;
    
    console.log('\n=== TRANSPORTER ALLOCATION PROCESS ===');
    console.log('Farmer Zone:', product.farmer.zone);
    console.log('Customer Zone:', customer_zone);
    console.log('Available Source Transporters:', sourceTransporters.length);
    console.log('Available Destination Transporters:', destinationTransporters.length);
    
    try {
      // Find optimal source transporter (closest to farmer)
      console.log('\n=== FARMER TO SOURCE TRANSPORTER DISTANCES ===');
      for (const transporter of sourceTransporters) {
        const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
        const distance = await GoogleMapsService.calculateDistanceAndDuration(
          [pickupAddress],
          [transporterAddress]
        );
        
        console.log(`Farmer to ${transporter.name}: ${distance.distance}km`);
        
        if (distance.distance < shortestFarmerDistance) {
          shortestFarmerDistance = distance.distance;
          selectedSourceTransporter = transporter;
        }
      }
      
      // Find optimal destination transporter (closest to customer)
      console.log('\n=== CUSTOMER TO DESTINATION TRANSPORTER DISTANCES ===');
      for (const transporter of destinationTransporters) {
        const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
        const distance = await GoogleMapsService.calculateDistanceAndDuration(
          [delivery_address],
          [transporterAddress]
        );
        
        console.log(`Customer to ${transporter.name}: ${distance.distance}km`);
        
        if (distance.distance < shortestCustomerDistance) {
          shortestCustomerDistance = distance.distance;
          selectedDestinationTransporter = transporter;
        }
      }
      
      // Calculate inter-transporter distance
      if (selectedSourceTransporter && selectedDestinationTransporter) {
        const sourceAddress = `${selectedSourceTransporter.address}, ${selectedSourceTransporter.zone}`;
        const destAddress = `${selectedDestinationTransporter.address}, ${selectedDestinationTransporter.zone}`;
        
        const interDistance = await GoogleMapsService.calculateDistanceAndDuration(
          [sourceAddress],
          [destAddress]
        );
        
        transporterToTransporterDistance = interDistance.distance;
        routeData = interDistance;
        
        console.log(`\n=== INTER-TRANSPORTER DISTANCE ===`);
        console.log(`${selectedSourceTransporter.name} to ${selectedDestinationTransporter.name}: ${interDistance.distance}km`);
      }
    } catch (error) {
      console.warn('Google Maps API failed, using zone-based selection:', error.message);
    }
    
    console.log('\n=== FINAL ALLOCATION RESULTS ===');
    console.log('Selected Source Transporter:', selectedSourceTransporter?.name || 'None');
    console.log('Selected Destination Transporter:', selectedDestinationTransporter?.name || 'None');
    console.log('Farmer to Source Distance:', shortestFarmerDistance !== Infinity ? shortestFarmerDistance + 'km' : 'N/A');
    console.log('Source to Destination Distance:', transporterToTransporterDistance + 'km');
    console.log('Destination to Customer Distance:', shortestCustomerDistance !== Infinity ? shortestCustomerDistance + 'km' : 'N/A');
    console.log('Total Route Distance:', (shortestFarmerDistance + transporterToTransporterDistance + shortestCustomerDistance) + 'km');
    
    // Fallback to first available if no optimal found
    const sourceTransporter = selectedSourceTransporter || sourceTransporters[0] || allTransporters[0];
    const destTransporter = selectedDestinationTransporter || destinationTransporters[0] || allTransporters[1] || allTransporters[0];
    
    // Create order in PENDING status for farmer verification
    const order = await Order.create({
      customer_id: req.user.customer_id,
      product_id,
      quantity,
      delivery_address,
      total_price,
      farmer_amount,
      admin_commission,
      transport_charge,
      current_status: 'PENDING',
      payment_status: 'completed',
      pickup_address: pickupAddress
    });
    
    console.log('✅ Order created successfully:', order.order_id);
    console.log('Order Details:', {
      order_id: order.order_id,
      customer_id: order.customer_id,
      product_id: order.product_id,
      quantity: order.quantity,
      total_price: order.total_price,
      farmer_amount: order.farmer_amount,
      admin_commission: order.admin_commission,
      transport_charge: order.transport_charge,
      status: order.current_status,
      payment_status: order.payment_status
    });
    
    // Update product quantity
    await product.update({ quantity: product.quantity - quantity });
    
    res.status(201).json({
      success: true,
      message: 'Payment verified and order created. Waiting for farmer acceptance.',
      data: {
        order_id: order.order_id,
        payment_status: 'completed',
        current_status: 'PENDING',
        message: 'Order sent to farmer for verification'
      }
    });
    
  } catch (error) {
    console.error('❌ Complete order error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Error completing order: ' + error.message 
    });
  }
};



exports.getOrders = async (req, res) => {
  try {
    if (!req.user || !req.user.customer_id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const orders = await Order.findAll({
      where: { customer_id: req.user.customer_id },
      include: [
        { model: Product, attributes: ['name', 'current_price'] },
        { model: FarmerUser, as: 'farmer', attributes: ['name', 'email', 'mobile_number', 'image_url'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { order_id: req.params.id, customer_id: req.user.customer_id },
      include: [
        { model: Product, attributes: ['name', 'current_price'] },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'email', 'mobile_number', 'image_url'] },
        { model: DeliveryPerson, as: 'delivery_person', attributes: ['name', 'mobile_number', 'vehicle_number'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: Product, attributes: ['name', 'current_price'] },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'email', 'mobile_number', 'image_url'] },
        { model: DeliveryPerson, as: 'delivery_person', attributes: ['name', 'mobile_number', 'vehicle_number'] }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Scan QR code
exports.scanQRCode = async (req, res) => {
  try {
    const { qr_code, location_lat, location_lng, location_address, notes } = req.body;

    const result = await OrderTrackingService.scanQRCode(qr_code, {
      scanned_by_id: req.user[`${req.role}_id`],
      scanned_by_role: req.role,
      location_lat,
      location_lng,
      location_address,
      notes
    });

    res.json({
      success: true,
      message: `Status updated from ${result.previous_status} to ${result.new_status}`,
      result
    });
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get order tracking history
exports.getOrderTracking = async (req, res) => {
  try {
    const { order_id } = req.params;
    const tracking = await OrderTrackingService.getOrderTracking(order_id);

    res.json({
      success: true,
      order_id,
      tracking_history: tracking
    });
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get orders allocated to transporter
exports.getTransporterOrders = async (req, res) => {
  try {
    const transporterId = req.user.transporter_id;
    
    // Get source transporter orders (always visible)
    const sourceOrders = await Order.findAll({
      where: { source_transporter_id: transporterId },
      include: [
        { model: Product, attributes: ['name', 'current_price'] },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number'] }
      ]
    });

    // Get destination transporter orders (only if shipped)
    const destinationOrders = await Order.findAll({
      where: { 
        destination_transporter_id: transporterId,
        current_status: ['SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY', 'COMPLETED']
      },
      include: [
        { model: Product, attributes: ['name', 'current_price'] },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number'] }
      ]
    });

    // Get transporter details for addresses
    const sourceTransporterIds = [...new Set([...sourceOrders.map(o => o.destination_transporter_id), ...destinationOrders.map(o => o.source_transporter_id)])].filter(Boolean);
    const transporters = await TransporterUser.findAll({
      where: { transporter_id: sourceTransporterIds },
      attributes: ['transporter_id', 'name', 'address', 'zone', 'district', 'state']
    });
    const transporterMap = transporters.reduce((acc, t) => ({ ...acc, [t.transporter_id]: t }), {});

    const processOrders = (orders, isSource) => orders.map(order => {
      const otherTransporterId = isSource ? order.destination_transporter_id : order.source_transporter_id;
      const otherTransporter = transporterMap[otherTransporterId];
      const otherAddress = otherTransporter ? `${otherTransporter.address}, ${otherTransporter.zone}, ${otherTransporter.district}, ${otherTransporter.state}` : 'Address not available';
      
      return {
        ...order.toJSON(),
        transporter_role: isSource ? 'PICKUP_SHIPPING' : 'DELIVERY',
        responsibility: isSource ? 'Pickup from farmer and ship to destination transporter' : 'Receive from source transporter and deliver to customer',
        pickup_location: isSource ? order.pickup_address : otherAddress,
        delivery_location: isSource ? otherAddress : order.delivery_address,
        other_transporter: otherTransporter ? {
          name: otherTransporter.name,
          address: otherAddress
        } : null
      };
    });

    const allOrders = [
      ...processOrders(sourceOrders, true),
      ...processOrders(destinationOrders, false)
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      count: allOrders.length,
      data: allOrders
    });
  } catch (error) {
    console.error('Get transporter orders error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Check transporter availability by pincode
exports.checkTransporterAvailability = async (req, res) => {
  try {
    const { pincode } = req.params;
    const searchPincode = pincode?.toLowerCase();
    
    const allTransportersForCheck = await TransporterUser.findAll({
      attributes: ['transporter_id', 'name', 'zone', 'district', 'state', 'pincode', 'verified_status']
    });
    
    const transporters = allTransportersForCheck.filter(t => 
      t.pincode?.toLowerCase() === searchPincode
    );
    
    res.json({
      success: true,
      pincode,
      available: transporters.length > 0,
      count: transporters.length,
      transporters
    });
  } catch (error) {
    console.error('Check transporter availability error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { order_id, status } = req.body;

    const validStatuses = ['PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByPk(order_id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.update({ current_status: status });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order_id,
        previous_status: order.current_status,
        new_status: status
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update QR code for order
exports.updateQRCode = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({ message: 'QR code is required' });
    }

    const order = await Order.findByPk(order_id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.update({ qr_code });

    res.json({
      success: true,
      message: 'QR code updated successfully',
      data: {
        order_id,
        qr_code
      }
    });
  } catch (error) {
    console.error('Update QR code error:', error);
    res.status(500).json({ message: error.message });
  }
};