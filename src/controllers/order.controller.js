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
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

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
      transport_charge,
      qr_code
    } = req.body;
    
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

    // Create order with optimal transporter assignments
    const order = await Order.create({
      customer_id: req.user.customer_id,
      product_id,
      quantity,
      delivery_address,
      total_price,
      farmer_amount,
      admin_commission,
      transport_charge,
      qr_code,
      current_status: 'PLACED',
      source_transporter_id: selectedSourceTransporter?.transporter_id,
      destination_transporter_id: selectedDestinationTransporter?.transporter_id,
      pickup_address: pickupAddress,
      estimated_distance: routeData?.distance,
      estimated_delivery_time: estimatedDeliveryTime
    });

    // Update product quantity
    await product.update({ quantity: product.quantity - quantity });

    // Create transaction record
    await Transaction.create({
      farmer_id: product.farmer_id,
      order_id: order.order_id,
      amount: farmer_amount,
      type: 'credit',
      status: 'pending',
      description: `Payment for order #${order.order_id}`
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully with optimal transporter assignment',
      data: {
        ...order.toJSON(),
        route_info: routeData ? {
          distance: routeData.distance_text,
          duration: routeData.duration_text,
          estimated_delivery: estimatedDeliveryTime
        } : null,
        transporter_info: {
          source_transporter: selectedSourceTransporter ? {
            id: selectedSourceTransporter.transporter_id,
            name: selectedSourceTransporter.name,
            zone: selectedSourceTransporter.zone,
            address: selectedSourceTransporter.address
          } : null,
          destination_transporter: selectedDestinationTransporter ? {
            id: selectedDestinationTransporter.transporter_id,
            name: selectedDestinationTransporter.name,
            zone: selectedDestinationTransporter.zone,
            address: selectedDestinationTransporter.address
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message });
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