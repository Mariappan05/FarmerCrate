const { validationResult } = require('express-validator');
const Order = require('../models/order.model');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');
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

    // Support new multi-item format AND legacy single-product format
    const {
      items,
      delivery_address,
      payment_method = 'ONLINE',
      total_amount,
      subtotal,
      admin_commission,
      delivery_charges,
      qr_code,
      qr_image_url,
      // Legacy fields
      product_id,
      quantity,
      customer_zone,
      customer_pincode,
      total_price,
      farmer_amount,
      transport_charge
    } = req.body;

    // Normalise total
    const total = parseFloat(total_amount || total_price || 0);

    // ── ONLINE payment path ─────────────────────────────────────
    const method = (payment_method || 'ONLINE').toUpperCase();
    if (method === 'ONLINE') {
      const receipt = `order_${Date.now()}`;
      const razorpayOrder = await RazorpayService.createOrder(total, 'INR', receipt);

      return res.json({
        success: true,
        message: 'Payment order created. Complete payment to place order.',
        data: {
          payment_details: {
            razorpay_order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key_id: process.env.RAZORPAY_KEY_ID
          },
          order_data: {
            items: items || (product_id ? [{ product_id, quantity, price: total_price / quantity }] : []),
            delivery_address,
            payment_method: 'ONLINE',
            total_amount: total,
            subtotal: subtotal || total,
            admin_commission: admin_commission || 0,
            delivery_charges: delivery_charges || transport_charge || 0,
            qr_code,
            qr_image_url,
            // Legacy
            customer_zone,
            customer_pincode
          }
        }
      });
    }

    // ── COD payment path ─────────────────────────────────────────
    const customer_id = req.user.customer_id;
    const ordersToCreate = items && items.length > 0
      ? items
      : product_id ? [{ product_id, quantity, price: total_price }] : [];

    if (ordersToCreate.length === 0) {
      return res.status(400).json({ success: false, message: 'No items provided for order' });
    }

    const createdOrders = [];
    const perItemDelivery = (parseFloat(delivery_charges || transport_charge || 0)) / ordersToCreate.length;
    const perItemCommission = parseFloat(admin_commission || 0) / ordersToCreate.length;

    for (const item of ordersToCreate) {
      const product = await Product.findByPk(item.product_id, {
        include: [{ model: FarmerUser, as: 'farmer' }]
      });
      if (!product) { console.warn(`Product ${item.product_id} not found, skipping`); continue; }

      const itemPrice = parseFloat(item.price || product.current_price || 0);
      const itemTotal = itemPrice * item.quantity;
      const itemCommission = perItemCommission || itemTotal * 0.03;
      const itemTransport = perItemDelivery || 0;
      const farmerAmt = itemTotal - itemCommission;

      const pickupAddress = product.farmer
        ? `${product.farmer.address || ''}, ${product.farmer.zone || ''}, ${product.farmer.district || ''}, ${product.farmer.state || ''}`
        : '';

      const order = await Order.create({
        customer_id,
        product_id: item.product_id,
        quantity: item.quantity,
        delivery_address: typeof delivery_address === 'object' ? JSON.stringify(delivery_address) : (delivery_address || ''),
        total_price: itemTotal,
        farmer_amount: farmerAmt,
        admin_commission: itemCommission,
        transport_charge: itemTransport,
        payment_method: 'COD',
        payment_status: 'pending',
        current_status: 'PLACED',
        pickup_address: pickupAddress,
        qr_code: qr_code || null,
        qr_image_url: qr_image_url || null,
        items_json: JSON.stringify(ordersToCreate)
      });

      // Reduce stock
      const newQty = Math.max(0, product.quantity - item.quantity);
      await product.update({ quantity: newQty });
      createdOrders.push(order);
    }

    // Clear cart
    try {
      const Cart = require('../models/cart.model');
      await Cart.destroy({ where: { customer_id } });
    } catch (cartErr) {
      console.warn('Could not clear cart:', cartErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'COD order placed successfully',
      data: {
        order_id: createdOrders[0]?.order_id,
        orders: createdOrders.map(o => ({ order_id: o.order_id, current_status: o.current_status })),
        payment_method: 'COD',
        total_amount: total
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order: ' + error.message
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
    console.log('Order Data (full):', JSON.stringify(order_data, null, 2));
    console.log('Order Data items:', order_data?.items);
    console.log('Order Data items length:', order_data?.items?.length);
    console.log('Type of order_data:', typeof order_data);
    console.log('Keys in order_data:', order_data ? Object.keys(order_data) : 'N/A');
    
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
      product_id: legacy_product_id, 
      quantity: legacy_quantity, 
      delivery_address,
      customer_zone,
      customer_pincode,
      total_price,
      farmer_amount,
      admin_commission,
      transport_charge,
      // New format
      items,
      total_amount,
      delivery_charges,
      payment_method,
      qr_code,
      qr_image_url
    } = order_data;

    // Normalise items list (supports both old and new format)
    const ordersToCreate = (items && items.length > 0)
      ? items
      : legacy_product_id ? [{ product_id: legacy_product_id, quantity: legacy_quantity, price: total_price }] : [];

    if (ordersToCreate.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order_data' });
    }

    const total = parseFloat(total_amount || total_price || 0);
    const perItemDelivery = parseFloat(delivery_charges || transport_charge || 0) / ordersToCreate.length;
    const perItemCommission = parseFloat(admin_commission || 0) / ordersToCreate.length;
    const customer_id = req.user.customer_id;
    const createdOrders = [];

    for (const item of ordersToCreate) {
      const product = await Product.findByPk(item.product_id, {
        include: [{ model: FarmerUser, as: 'farmer' }]
      });

      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product_id} not available or insufficient quantity`
        });
      }

      const itemPrice = parseFloat(item.price || product.current_price || 0);
      const itemTotal = itemPrice * item.quantity;
      const itemCommission = perItemCommission || itemTotal * 0.03;
      const itemTransport = perItemDelivery || 0;
      const farmerAmt = itemTotal - itemCommission;

      const pickupAddress = product.farmer
        ? `${product.farmer.address || ''}, ${product.farmer.zone || ''}, ${product.farmer.district || ''}, ${product.farmer.state || ''}`
        : '';

      const order = await Order.create({
        customer_id,
        product_id: item.product_id,
        quantity: item.quantity,
        delivery_address: typeof delivery_address === 'object' ? JSON.stringify(delivery_address) : (delivery_address || ''),
        total_price: itemTotal,
        farmer_amount: farmerAmt,
        admin_commission: itemCommission,
        transport_charge: itemTransport,
        payment_method: 'ONLINE',
        payment_status: 'completed',
        current_status: 'PLACED',
        pickup_address: pickupAddress,
        qr_code: qr_code || null,
        qr_image_url: qr_image_url || null,
        razorpay_order_id: razorpay_order_id || null,
        razorpay_payment_id: razorpay_payment_id || null,
        items_json: JSON.stringify(ordersToCreate)
      });

      // Reduce stock
      await product.update({ quantity: Math.max(0, product.quantity - item.quantity) });
      createdOrders.push(order);
    }

    // Clear cart
    try {
      const Cart = require('../models/cart.model');
      await Cart.destroy({ where: { customer_id } });
    } catch (cartErr) {
      console.warn('Could not clear cart:', cartErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Payment verified and order(s) created.',
      data: {
        order_id: createdOrders[0]?.order_id,
        orders: createdOrders.map(o => ({ order_id: o.order_id, current_status: o.current_status })),
        payment_status: 'completed',
        total_amount: total
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
        { 
          model: Product, 
          attributes: ['product_id', 'name', 'current_price'],
          required: false,
          include: [
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: ['name', 'email', 'mobile_number', 'image_url'],
              required: false
            },
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_url', 'is_primary'],
              required: false
            }
          ]
        },
        {
          model: TransporterUser,
          as: 'source_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'state', 'district'],
          required: false
        },
        {
          model: TransporterUser,
          as: 'destination_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'state', 'district'],
          required: false
        },
        {
          model: DeliveryPerson,
          as: 'delivery_person',
          attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_number', 'vehicle_type'],
          required: false
        }
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
    console.error('Error details:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching orders: ' + error.message 
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { order_id: req.params.id, customer_id: req.user.customer_id },
      include: [
        { 
          model: Product, 
          attributes: ['product_id', 'name', 'current_price'],
          include: [{
            model: ProductImage,
            as: 'images',
            attributes: ['image_url', 'is_primary']
          }]
        },
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
              attributes: ['farmer_id', 'name', 'email', 'mobile_number', 'address', 'image_url']
            }
          ]
        },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'email', 'mobile_number', 'image_url'] },
        { model: TransporterUser, as: 'source_transporter', attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'image_url'] },
        { model: TransporterUser, as: 'destination_transporter', attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'image_url'] },
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
        { 
          model: Product, 
          attributes: ['product_id', 'name', 'current_price'],
          include: [{
            model: ProductImage,
            as: 'images',
            attributes: ['image_url', 'is_primary']
          }]
        },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number'] }
      ]
    });

    // Get destination transporter orders (only if shipped)
    const destinationOrders = await Order.findAll({
      where: { 
        destination_transporter_id: transporterId,
        current_status: {
          [Op.in]: [ 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY', 'COMPLETED']
        }
      },
      include: [
        { 
          model: Product, 
          attributes: ['product_id', 'name', 'current_price'],
          include: [{
            model: ProductImage,
            as: 'images',
            attributes: ['image_url', 'is_primary']
          }]
        },
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

// Get current location address from coordinates
exports.getCurrentLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const address = await GoogleMapsService.getAddressFromCoordinates(lat, lng);

    res.json({
      success: true,
      data: {
        lat,
        lng,
        address
      }
    });
  } catch (error) {
    console.error('Get current location error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get complete order details by order_id
exports.getOrderDetailsById = async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = await Order.findByPk(order_id, {
      include: [
        { 
          model: Product, 
          attributes: ['product_id', 'name', 'current_price', 'description'],
          include: [{
            model: ProductImage,
            as: 'images',
            attributes: ['image_url', 'is_primary', 'display_order']
          }]
        },
        { model: CustomerUser, as: 'customer', attributes: ['customer_id', 'name', 'email', 'mobile_number', 'address', 'image_url'] },
        { model: FarmerUser, as: 'farmer', attributes: ['farmer_id', 'name', 'email', 'mobile_number', 'address', 'zone', 'state', 'district', 'image_url'] },
        { model: TransporterUser, as: 'source_transporter', attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'state', 'district'] },
        { model: TransporterUser, as: 'destination_transporter', attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'state', 'district'] },
        { model: DeliveryPerson, as: 'delivery_person', attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_number', 'vehicle_type'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ message: error.message });
  }
};


// Get active shipments for customer
exports.getActiveShipments = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        customer_id: req.user.customer_id,
        current_status: {
          [Op.in]: ['PENDING', 'PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY']
        }
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
              attributes: ['name', 'mobile_number', 'address']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ 
      success: true,
      data: orders 
    });
  } catch (error) {
    console.error('Get active shipments error:', error);
    res.status(500).json({ message: 'Error retrieving active shipments' });
  }
};

// Track specific order for customer
exports.trackOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const order = await Order.findOne({
      where: { order_id, customer_id: req.user.customer_id },
      include: [{
        model: Product,
        attributes: ['product_id', 'name', 'current_price'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
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
      { status: 'SHIPPED', label: 'Picked Up', icon: '📤' },
      { status: 'IN_TRANSIT', label: 'In Transit', icon: '🚚' },
      { status: 'RECEIVED', label: 'Reached Hub', icon: '🏢' },
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

// Get real-time tracking updates for customer
exports.getTrackingUpdates = async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const order = await Order.findOne({
      where: { order_id, customer_id: req.user.customer_id }
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