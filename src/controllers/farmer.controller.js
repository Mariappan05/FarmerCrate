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

exports.getAllUsers = async (req, res) => {
  try {
    const farmers = await FarmerUser.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({ 
      success: true, 
      data: farmers
    });
  } catch (error) {
    console.error('Get all farmers error:', error);
    res.status(500).json({ message: 'Error retrieving farmers' });
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

// Accept order by farmer
exports.acceptOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const Order = require('../models/order.model');
    const Product = require('../models/product.model');
    const TransporterUser = require('../models/transporter_user.model');
    const RazorpayService = require('../services/razorpay.service');
    const Transaction = require('../models/transaction.model');
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
      return res.status(400).json({ message: 'Order is not in pending status' });
    }
    
    // Get farmer details
    const farmer = await FarmerUser.findByPk(req.user.farmer_id);
    const allTransporters = await TransporterUser.findAll();
    const GoogleMapsService = require('../services/googleMaps.service');
    
    const farmerAddress = `${farmer.address}, ${farmer.zone}, ${farmer.district}, ${farmer.state}`;
    
    let sourceTransporter = null;
    let destTransporter = null;
    let shortestSourceDistance = Infinity;
    let shortestDestDistance = Infinity;
    
    console.log('\n=== TRANSPORTER ALLOCATION WITH SHORTEST DISTANCE ===');
    console.log('Farmer Address:', farmerAddress);
    console.log('Customer Address:', order.delivery_address);
    
    try {
      // Find closest transporter to farmer
      for (const transporter of allTransporters) {
        const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
        const distance = await GoogleMapsService.calculateDistanceAndDuration([farmerAddress], [transporterAddress]);
        
        console.log(`Farmer to ${transporter.name}: ${distance.distance}km`);
        
        if (distance.distance < shortestSourceDistance) {
          shortestSourceDistance = distance.distance;
          sourceTransporter = transporter;
        }
      }
      
      // Find closest transporter to customer
      for (const transporter of allTransporters) {
        const transporterAddress = `${transporter.address}, ${transporter.zone}, ${transporter.district}, ${transporter.state}`;
        const distance = await GoogleMapsService.calculateDistanceAndDuration([order.delivery_address], [transporterAddress]);
        
        console.log(`Customer to ${transporter.name}: ${distance.distance}km`);
        
        if (distance.distance < shortestDestDistance) {
          shortestDestDistance = distance.distance;
          destTransporter = transporter;
        }
      }
      
      console.log('\nSelected Source Transporter:', sourceTransporter?.name, '- Distance:', shortestSourceDistance + 'km');
      console.log('Selected Destination Transporter:', destTransporter?.name, '- Distance:', shortestDestDistance + 'km');
    } catch (error) {
      console.warn('Google Maps failed, using fallback:', error.message);
      sourceTransporter = allTransporters[0];
      destTransporter = allTransporters[1] || allTransporters[0];
    }
    
    console.log('\n=== ORDER ACCEPTANCE & FUND TRANSFER STARTED ===');
    console.log('Order ID:', order_id);
    console.log('Farmer:', farmer.name, '(ID:', farmer.farmer_id, ')');
    console.log('Order Amount Breakdown:');
    console.log('  Total Price: ₹', order.total_price);
    console.log('  Farmer Amount: ₹', order.farmer_amount);
    console.log('  Admin Commission: ₹', order.admin_commission);
    console.log('  Transport Charge: ₹', order.transport_charge);
    
    // Process fund transfers
    const transferResults = { allSuccess: true, transfers: [] };
    
    // Transfer to farmer
    console.log('\n--- FARMER FUND TRANSFER ---');
    if (farmer.account_number && farmer.ifsc_code) {
      console.log('Farmer Account:', farmer.account_number);
      console.log('Farmer IFSC:', farmer.ifsc_code);
      console.log('Transfer Amount: ₹', order.farmer_amount);
      
      const farmerTransfer = await RazorpayService.transferFunds({
        account_number: farmer.account_number,
        ifsc_code: farmer.ifsc_code,
        amount: order.farmer_amount,
        purpose: 'Product sale payment',
        reference: `order_${order_id}_farmer`
      });
      
      console.log('Transfer Status:', farmerTransfer.success ? '✅ SUCCESS' : '❌ FAILED');
      if (!farmerTransfer.success) {
        console.log('Error:', farmerTransfer.error);
      }
      
      transferResults.transfers.push({
        type: 'farmer',
        name: farmer.name,
        account: farmer.account_number,
        ifsc: farmer.ifsc_code,
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
      
      await Notification.create({
        user_type: 'farmer',
        user_id: farmer.farmer_id,
        title: 'Payment Received',
        message: `₹${order.farmer_amount} credited to your account for order #${order.order_id}`,
        type: 'payment',
        order_id: order.order_id
      });
    } else {
      console.log('❌ Farmer bank details not available');
      transferResults.allSuccess = false;
      transferResults.transfers.push({
        type: 'farmer',
        name: farmer.name,
        status: 'failed',
        error: 'Bank details not available'
      });
    }
    
    // Transfer to transporters
    const transportAmount = order.transport_charge / 2;
    
    console.log('\n--- SOURCE TRANSPORTER FUND TRANSFER ---');
    if (sourceTransporter?.account_number && sourceTransporter?.ifsc_code) {
      console.log('Transporter:', sourceTransporter.name);
      console.log('Account:', sourceTransporter.account_number);
      console.log('IFSC:', sourceTransporter.ifsc_code);
      console.log('Transfer Amount: ₹', transportAmount);
      
      const sourceTransfer = await RazorpayService.transferFunds({
        account_number: sourceTransporter.account_number,
        ifsc_code: sourceTransporter.ifsc_code,
        amount: transportAmount,
        purpose: 'Transport service payment',
        reference: `order_${order_id}_source_transport`
      });
      
      console.log('Transfer Status:', sourceTransfer.success ? '✅ SUCCESS' : '❌ FAILED');
      if (!sourceTransfer.success) {
        console.log('Error:', sourceTransfer.error);
      }
      
      transferResults.transfers.push({
        type: 'source_transporter',
        name: sourceTransporter.name,
        account: sourceTransporter.account_number,
        ifsc: sourceTransporter.ifsc_code,
        amount: transportAmount,
        status: sourceTransfer.success ? 'success' : 'failed'
      });
      
      if (sourceTransfer.success) {
        await Transaction.create({
          user_type: 'transporter',
          user_id: sourceTransporter.transporter_id,
          order_id: order.order_id,
          amount: transportAmount,
          type: 'credit',
          status: 'completed',
          description: `Transport payment for order #${order.order_id}`
        });
        
        await Notification.create({
          user_type: 'transporter',
          user_id: sourceTransporter.transporter_id,
          title: 'Payment Received',
          message: `₹${transportAmount} credited for transport service - Order #${order.order_id}`,
          type: 'payment',
          order_id: order.order_id
        });
      } else {
        transferResults.allSuccess = false;
      }
    } else {
      console.log('❌ Source transporter bank details not available');
      transferResults.allSuccess = false;
      transferResults.transfers.push({
        type: 'source_transporter',
        status: 'failed',
        error: 'Bank details not available'
      });
    }
    
    console.log('\n--- DESTINATION TRANSPORTER FUND TRANSFER ---');
    if (destTransporter?.account_number && destTransporter?.ifsc_code) {
      console.log('Transporter:', destTransporter.name);
      console.log('Account:', destTransporter.account_number);
      console.log('IFSC:', destTransporter.ifsc_code);
      console.log('Transfer Amount: ₹', transportAmount);
      
      const destTransfer = await RazorpayService.transferFunds({
        account_number: destTransporter.account_number,
        ifsc_code: destTransporter.ifsc_code,
        amount: transportAmount,
        purpose: 'Transport service payment',
        reference: `order_${order_id}_dest_transport`
      });
      
      console.log('Transfer Status:', destTransfer.success ? '✅ SUCCESS' : '❌ FAILED');
      if (!destTransfer.success) {
        console.log('Error:', destTransfer.error);
      }
      
      transferResults.transfers.push({
        type: 'dest_transporter',
        name: destTransporter.name,
        account: destTransporter.account_number,
        ifsc: destTransporter.ifsc_code,
        amount: transportAmount,
        status: destTransfer.success ? 'success' : 'failed'
      });
      
      if (destTransfer.success) {
        await Transaction.create({
          user_type: 'transporter',
          user_id: destTransporter.transporter_id,
          order_id: order.order_id,
          amount: transportAmount,
          type: 'credit',
          status: 'completed',
          description: `Transport payment for order #${order.order_id}`
        });
        
        await Notification.create({
          user_type: 'transporter',
          user_id: destTransporter.transporter_id,
          title: 'Payment Received',
          message: `₹${transportAmount} credited for transport service - Order #${order.order_id}`,
          type: 'payment',
          order_id: order.order_id
        });
      } else {
        transferResults.allSuccess = false;
      }
    } else {
      console.log('❌ Destination transporter bank details not available');
      transferResults.allSuccess = false;
      transferResults.transfers.push({
        type: 'dest_transporter',
        status: 'failed',
        error: 'Bank details not available'
      });
    }
    
    // Admin commission
    console.log('\n--- ADMIN COMMISSION ---');
    console.log('Amount: ₹', order.admin_commission);
    console.log('Status: ✅ RETAINED in Razorpay account');
    
    transferResults.transfers.push({
      type: 'admin_commission',
      amount: order.admin_commission,
      status: 'retained',
      details: 'Commission retained in Razorpay account'
    });
    
    // Check if all transfers succeeded
    transferResults.allSuccess = transferResults.transfers.every(t => 
      t.status === 'success' || t.status === 'retained'
    );
    
    // Update order status only if transfers succeeded
    if (transferResults.allSuccess) {
      await order.update({
        current_status: 'PLACED',
        source_transporter_id: sourceTransporter?.transporter_id,
        destination_transporter_id: destTransporter?.transporter_id
      });
      
      // Create notification for customer
      const CustomerUser = require('../models/customer_user.model');
      await Notification.create({
        user_type: 'customer',
        user_id: order.customer_id,
        title: 'Order Accepted',
        message: `Your order #${order.order_id} has been accepted by the farmer and is now being processed`,
        type: 'order',
        order_id: order.order_id
      });
      
      console.log('\n--- ORDER STATUS UPDATE ---');
      console.log('Status: PENDING → PLACED');
      console.log('✅ All fund transfers completed successfully');
      console.log('✅ Transaction records created');
      console.log('✅ Notifications sent to all parties');
      console.log('Assigned Source Transporter:', sourceTransporter?.name, '(ID:', sourceTransporter?.transporter_id, ') - Distance:', shortestSourceDistance + 'km');
      console.log('Assigned Destination Transporter:', destTransporter?.name, '(ID:', destTransporter?.transporter_id, ') - Distance:', shortestDestDistance + 'km');
      console.log('=== ORDER ACCEPTANCE & FUND TRANSFER COMPLETED ===\n');
    } else {
      console.log('\n--- ORDER STATUS UPDATE ---');
      console.log('❌ Some fund transfers failed - Order remains PENDING');
      console.log('=== ORDER ACCEPTANCE FAILED ===\n');
      
      return res.status(400).json({
        success: false,
        message: 'Fund transfers failed. Order not placed.',
        data: {
          order_id,
          status: 'PENDING',
          fund_transfers: transferResults
        }
      });
    }
    
    // Send real-time update
    const WebSocketService = require('../services/websocket.service');
    WebSocketService.sendOrderUpdate(order_id, {
      status: 'PLACED',
      message: 'Order accepted by farmer',
      source_transporter: sourceTransporter?.name,
      destination_transporter: destTransporter?.name
    });

    res.json({
      success: true,
      message: 'Order accepted, transporters assigned, and funds transferred',
      data: {
        order_id,
        status: 'PLACED',
        source_transporter: sourceTransporter?.name,
        destination_transporter: destTransporter?.name,
        fund_transfers: transferResults
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
        attributes: ['name', 'mobile_number', 'address']
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
