const TransporterUser = require('../models/transporter_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');
const CustomerUser = require('../models/customer_user.model');
const FarmerUser = require('../models/farmer_user.model');
const DeliveryTracking = require('../models/deliveryTracking.model');
const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');
const GoogleMapsService = require('../services/googleMaps.service');

const pickFirst = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== '');

const extractOrderProductAndFarmer = (orderPayload) => {
  const order = orderPayload || {};
  const product = order.Product || order.product || null;
  const farmer = product?.farmer || order.farmer || null;
  const productImages = Array.isArray(product?.images) ? product.images : [];
  const primaryProductImage =
    productImages.find((img) => img?.is_primary)?.image_url ||
    productImages[0]?.image_url ||
    order.product_image ||
    null;

  return {
    product,
    farmer,
    product_name: pickFirst(order.product_name, product?.name, 'Product'),
    product_image: primaryProductImage,
    farmer_name: pickFirst(order.farmer_name, farmer?.name, ''),
    farmer_phone: pickFirst(order.farmer_phone, farmer?.mobile_number, farmer?.phone, ''),
    farmer_address: pickFirst(order.farmer_address, farmer?.address, ''),
    farmer_image_url: pickFirst(
      order.farmer_image_url,
      order.farmer_image,
      order.farmer_profile_image,
      farmer?.image_url,
      farmer?.image,
      farmer?.profile_image,
      null
    )
  };
};

const parseQrPayload = (rawValue) => {
  const raw = String(rawValue || '').trim();
  if (!raw) return { orderId: null, qrCode: null };

  // Direct numeric payload.
  if (/^\d+$/.test(raw)) {
    return { orderId: Number(raw), qrCode: null };
  }

  // JSON payload support.
  try {
    const parsed = JSON.parse(raw);
    const orderIdCandidate = pickFirst(parsed?.order_id, parsed?.orderId, parsed?.id);
    const qrCandidate = pickFirst(parsed?.qr_code, parsed?.qrCode, parsed?.code, parsed?.token);
    return {
      orderId: orderIdCandidate && /^\d+$/.test(String(orderIdCandidate)) ? Number(orderIdCandidate) : null,
      qrCode: qrCandidate ? String(qrCandidate).trim() : null,
    };
  } catch (_) {
    // continue parsing
  }

  // URL payload support.
  try {
    const url = new URL(raw);
    const orderIdFromUrl = pickFirst(url.searchParams.get('order_id'), url.searchParams.get('orderId'), url.searchParams.get('id'));
    const qrFromUrl = pickFirst(url.searchParams.get('qr_code'), url.searchParams.get('qrCode'), url.searchParams.get('code'), url.searchParams.get('token'));
    return {
      orderId: orderIdFromUrl && /^\d+$/.test(String(orderIdFromUrl)) ? Number(orderIdFromUrl) : null,
      qrCode: qrFromUrl ? String(qrFromUrl).trim() : null,
    };
  } catch (_) {
    // continue parsing
  }

  const orderIdMatch = raw.match(/(?:order[_-]?id|id)[:=\s"']*(\d+)/i) || raw.match(/#(\d+)/);
  if (orderIdMatch) {
    return { orderId: Number(orderIdMatch[1]), qrCode: null };
  }

  // UUID-like fallback (common qr_code format).
  const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  if (uuidMatch) {
    return { orderId: null, qrCode: uuidMatch[0] };
  }

  return { orderId: null, qrCode: raw };
};

const resolveOrderByQr = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { qr_code } = req.body || {};
    const transporterId = req.user?.transporter_id;

    const { orderId, qrCode } = parseQrPayload(qr_code);
    if (!orderId && !qrCode) {
      return res.status(400).json({ success: false, message: 'Invalid QR payload' });
    }

    const baseWhere = {
      [Op.or]: [
        { source_transporter_id: transporterId },
        { destination_transporter_id: transporterId },
      ],
    };

    const where = orderId
      ? { ...baseWhere, order_id: orderId }
      : { ...baseWhere, qr_code: qrCode };

    const order = await Order.findOne({
      where,
      attributes: ['order_id', 'current_status', 'qr_code', 'source_transporter_id', 'destination_transporter_id'],
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for this QR' });
    }

    return res.json({
      success: true,
      data: {
        order_id: order.order_id,
        status: order.current_status,
        qr_code: order.qr_code,
        source_transporter_id: order.source_transporter_id,
        destination_transporter_id: order.destination_transporter_id,
      },
    });
  } catch (error) {
    console.error('Resolve QR error:', error);
    return res.status(500).json({ success: false, message: 'Error resolving QR', error: error.message });
  }
};

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
    console.log('Assign vehicle:', { order_id, vehicle_id, vehicle_type });
    
    if (!order_id || !vehicle_id || !vehicle_type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    const VehicleModel = vehicle_type === 'permanent' ? PermanentVehicle : TemporaryVehicle;
    const vehicle = await VehicleModel.findByPk(vehicle_id);
    
    if (!vehicle || vehicle.transporter_id !== req.user.transporter_id) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    
    const { Op } = require('sequelize');
    const activeOrdersCount = await Order.count({
      where: {
        [vehicle_type === 'permanent' ? 'permanent_vehicle_id' : 'temp_vehicle_id']: vehicle_id,
        current_status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] }
      }
    });
    
    if (activeOrdersCount >= vehicle.capacity) {
      return res.status(400).json({ 
        success: false,
        message: `Vehicle capacity full. Current: ${activeOrdersCount}/${vehicle.capacity}` 
      });
    }
    
    const updateData = vehicle_type === 'permanent' 
      ? { permanent_vehicle_id: vehicle_id }
      : { temp_vehicle_id: vehicle_id };
    
    await Order.update(updateData, { where: { order_id } });
    
    const newCount = activeOrdersCount + 1;
    await vehicle.update({ is_available: newCount < vehicle.capacity });
    
    res.json({ 
      success: true,
      message: 'Vehicle assigned to order successfully',
      data: { order_id, vehicle_id, vehicle_type, capacity_used: `${newCount}/${vehicle.capacity}` }
    });
  } catch (error) {
    console.error('Assign vehicle error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


//manual order
const assignOrderToDeliveryPerson = async (req, res) => {
  const { order_id, delivery_person_id, permanent_vehicle_id, temp_vehicle_id } = req.body;
  
  try {
    console.log('Assign delivery person:', { order_id, delivery_person_id, permanent_vehicle_id, temp_vehicle_id });
    
    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    const deliveryPerson = await DeliveryPerson.findOne({
      where: { 
        delivery_person_id,
        transporter_id: req.user.transporter_id
      }
    });
    
    if (!deliveryPerson) {
      return res.status(404).json({ success: false, message: 'Delivery person not found or not owned by this transporter' });
    }
    
    const { Op } = require('sequelize');
    const activeOrdersCount = await Order.count({
      where: {
        delivery_person_id,
        current_status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] }
      }
    });
    
    if (activeOrdersCount >= 10) {
      return res.status(400).json({ 
        success: false,
        message: `Delivery person has reached maximum capacity (10 orders). Current: ${activeOrdersCount}/10` 
      });
    }
    
    let newStatus = order.current_status;
    if (order.current_status === 'ASSIGNED' && order.source_transporter_id === req.user.transporter_id) {
      newStatus = 'PICKUP_ASSIGNED';
    } else if (order.current_status === 'REACHED_DESTINATION') { // destination transporter
      newStatus = 'OUT_FOR_DELIVERY';
    }

    const updateData = { 
      delivery_person_id,
      current_status: newStatus
    };
    
    if (permanent_vehicle_id) updateData.permanent_vehicle_id = permanent_vehicle_id;
    if (temp_vehicle_id) updateData.temp_vehicle_id = temp_vehicle_id;
    
    await order.update(updateData);
    console.log('Order updated:', updateData);
    
    const newCount = activeOrdersCount + 1;
    await deliveryPerson.update({ is_available: newCount < 10 });
    
    res.json({ 
      success: true,
      message: 'Order assigned to delivery person successfully',
      data: {
        order_id,
        delivery_person_id,
        status: 'ASSIGNED',
        orders_assigned: `${newCount}/10`
      }
    });
  } catch (error) {
    console.error('Assign delivery person error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
//automatic order
const assignPickupDeliveryPerson = async (req, res) => {
  const { order_id, permanent_vehicle_id, temp_vehicle_id } = req.body;
  
  try {
    const { Op } = require('sequelize');
    const order = await Order.findOne({
      where: {
        order_id,
        source_transporter_id: req.user.transporter_id
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to this transporter' });
    }
    
    // Get all delivery persons and check their capacity
    const allDeliveryPersons = await DeliveryPerson.findAll({
      where: { transporter_id: req.user.transporter_id }
    });
    
    const availableDeliveryPersons = [];
    for (const person of allDeliveryPersons) {
      const activeOrders = await Order.count({
        where: {
          delivery_person_id: person.delivery_person_id,
          current_status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] }
        }
      });
      if (activeOrders < 10) {
        availableDeliveryPersons.push({ ...person.toJSON(), activeOrders });
      }
    }
    
    if (availableDeliveryPersons.length === 0) {
      return res.status(404).json({ message: 'No available delivery persons found (all at 10 order capacity)' });
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
    
    // Update availability
    const newCount = selectedDeliveryPerson.activeOrders + 1;
    await DeliveryPerson.update(
      { is_available: newCount < 10 },
      { where: { delivery_person_id: selectedDeliveryPerson.delivery_person_id } }
    );
    
    res.json({
      success: true,
      message: 'Pickup assigned to nearest available delivery person',
      data: {
        order_id,
        status: 'ASSIGNED',
        delivery_person_id: selectedDeliveryPerson.delivery_person_id,
        delivery_person_name: selectedDeliveryPerson.name,
        vehicle_id: permanent_vehicle_id || temp_vehicle_id,
        distance: shortestDistance !== Infinity ? shortestDistance + 'km' : 'N/A',
        orders_assigned: `${newCount}/10`
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
    const { Op } = require('sequelize');
    
    console.log('[manualReceiveOrder] Request:', { order_id, delivery_person_id, transporter_id: req.user.transporter_id });
    
    // First, just find the order
    const order = await Order.findByPk(order_id);
    
    if (!order) {
      console.log('[manualReceiveOrder] Order not found:', order_id);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    
    console.log('[manualReceiveOrder] Order found:', {
      order_id: order.order_id,
      source_transporter_id: order.source_transporter_id,
      destination_transporter_id: order.destination_transporter_id,
      current_status: order.current_status,
      delivery_person_id: order.delivery_person_id
    });
    
    // Check if order already has a delivery person assigned
    if (order.delivery_person_id) {
      console.log('[manualReceiveOrder] Order already assigned to delivery person:', order.delivery_person_id);
      return res.status(400).json({ 
        success: false,
        message: 'Order is already assigned to a delivery person. Cannot reassign.' 
      });
    }
    
    // Check if order belongs to this transporter OR if it's unassigned
    const belongsToTransporter = 
      order.source_transporter_id === req.user.transporter_id ||
      order.destination_transporter_id === req.user.transporter_id;
    
    const isUnassigned = !order.source_transporter_id && !order.destination_transporter_id;
    
    if (!belongsToTransporter && !isUnassigned) {
      console.log('[manualReceiveOrder] Order not assigned to this transporter');
      return res.status(403).json({ 
        success: false,
        message: 'Order not assigned to this transporter' 
      });
    }
    
    // If unassigned, assign to this transporter
    if (isUnassigned) {
      console.log('[manualReceiveOrder] Assigning order to transporter:', req.user.transporter_id);
      await order.update({ source_transporter_id: req.user.transporter_id });
    }
    
    const deliveryPerson = await DeliveryPerson.findOne({
      where: { 
        delivery_person_id,
        transporter_id: req.user.transporter_id
      }
    });
    
    if (!deliveryPerson) {
      console.log('[manualReceiveOrder] Delivery person not found:', delivery_person_id);
      return res.status(404).json({ 
        success: false,
        message: 'Delivery person not found or does not belong to your company' 
      });
    }
    
    // Check capacity
    const activeOrdersCount = await Order.count({
      where: {
        delivery_person_id,
        current_status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] }
      }
    });
    
    console.log('[manualReceiveOrder] Delivery person capacity:', { activeOrdersCount, max: 10 });
    
    if (activeOrdersCount >= 10) {
      return res.status(400).json({ 
        success: false,
        message: `Delivery person has reached maximum capacity (10 orders). Current: ${activeOrdersCount}/10` 
      });
    }
    
    // Determine the new status based on current status
    let newStatus = 'ASSIGNED';
    if (order.current_status === 'PLACED' || order.current_status === 'PENDING') {
      newStatus = 'ASSIGNED';
    } else if (order.current_status === 'ASSIGNED' || order.current_status === 'SHIPPED') {
      newStatus = 'RECEIVED';
    } else {
      newStatus = order.current_status; // Keep current status if already advanced
    }
    
    const updateData = {
      current_status: newStatus,
      delivery_person_id
    };
    
    if (permanent_vehicle_id) updateData.permanent_vehicle_id = permanent_vehicle_id;
    if (temp_vehicle_id) updateData.temp_vehicle_id = temp_vehicle_id;
    
    console.log('[manualReceiveOrder] Updating order:', updateData);
    await order.update(updateData);
    
    const newCount = activeOrdersCount + 1;
    await deliveryPerson.update({ is_available: newCount < 10 });
    
    console.log('[manualReceiveOrder] Success!');
    
    res.json({
      success: true,
      message: 'Order received and manually assigned to delivery person',
      data: {
        order_id,
        status: newStatus,
        delivery_person_id,
        delivery_person_name: deliveryPerson.name,
        vehicle_id: permanent_vehicle_id || temp_vehicle_id,
        orders_assigned: `${newCount}/10`
      }
    });
  } catch (error) {
    console.error('[manualReceiveOrder] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

//automatic receive order
const receiveOrderAndAssignDelivery = async (req, res) => {
  const { order_id } = req.body;
  
  try {
    const { Op } = require('sequelize');
    const order = await Order.findOne({
      where: {
        order_id,
        destination_transporter_id: req.user.transporter_id
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to this transporter' });
    }
    
    // Get all delivery persons and check their capacity
    const allDeliveryPersons = await DeliveryPerson.findAll({
      where: { transporter_id: req.user.transporter_id }
    });
    
    const availableDeliveryPersons = [];
    for (const person of allDeliveryPersons) {
      const activeOrders = await Order.count({
        where: {
          delivery_person_id: person.delivery_person_id,
          current_status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] }
        }
      });
      if (activeOrders < 10) {
        availableDeliveryPersons.push({ ...person.toJSON(), activeOrders });
      }
    }
    
    if (availableDeliveryPersons.length === 0) {
      return res.status(404).json({ message: 'No available delivery persons found (all at 10 order capacity)' });
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
    
    const newCount = selectedDeliveryPerson.activeOrders + 1;
    await DeliveryPerson.update(
      { is_available: newCount < 10 },
      { where: { delivery_person_id: selectedDeliveryPerson.delivery_person_id } }
    );
    
    res.json({
      success: true,
      message: 'Order received and assigned to nearest available delivery person',
      data: {
        order_id,
        status: 'RECEIVED',
        delivery_person_id: selectedDeliveryPerson.delivery_person_id,
        delivery_person_name: selectedDeliveryPerson.name,
        distance: shortestDistance !== Infinity ? shortestDistance + 'km' : 'N/A',
        orders_assigned: `${newCount}/10`
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
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price'],
          required: false,
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_url', 'is_primary'],
              required: false
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'image_url', 'zone', 'district', 'state'],
              required: false
            }
          ]
        },
        {
          model: CustomerUser,
          as: 'customer',
          attributes: ['customer_id', 'name', 'mobile_number', 'address', 'image_url'],
          required: false
        },
        {
          model: DeliveryPerson,
          as: 'delivery_person',
          attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_type', 'vehicle_number', 'image_url'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    const enrichedOrders = orders.map(order => {
      const o = order.toJSON();
      const normalized = extractOrderProductAndFarmer(o);
      o.product_name = normalized.product_name;
      o.product_image = normalized.product_image;
      o.farmer_name = normalized.farmer_name;
      o.farmer_phone = normalized.farmer_phone;
      o.farmer_address = normalized.farmer_address;
      o.farmer_image_url = normalized.farmer_image_url;
      return o;
    });

    res.json({ success: true, count: enrichedOrders.length, data: enrichedOrders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { order_id, status } = req.body;
  const isQrScanRequest = req.body?.is_qr_scan === true || req.body?.is_qr_scan === 'true';
  
  try {
    const validStatuses = [
      'PENDING', 'PLACED', 'CONFIRMED', 'ASSIGNED', 
      'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP',
      'RECEIVED', 'SHIPPED', 'IN_TRANSIT', 
      'REACHED_DESTINATION', 'OUT_FOR_DELIVERY', 
      'COMPLETED', 'CANCELLED'
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const { Op } = require('sequelize');
    const order = await Order.findOne({
      where: {
        order_id,
        [Op.or]: [
          { source_transporter_id: req.user.transporter_id },
          { destination_transporter_id: req.user.transporter_id }
        ]
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to this transporter' });
    }

    // Pickup delivery person statuses can always be updated manually
    const pickupStatuses = ['PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP'];
    
    // Allow manual packing (RECEIVED) by the source transporter
    const isManualReceiveAllowed = status === 'RECEIVED' && order.source_transporter_id === req.user.transporter_id;

    const isPickupStatusUpdate = pickupStatuses.includes(status) || pickupStatuses.includes(order.current_status) || isManualReceiveAllowed;

    // Only enforce QR-only rule for non-pickup statuses when both transporters assigned.
    // Scanner updates should pass `is_qr_scan=true`.
    if (order.source_transporter_id && order.destination_transporter_id && !isPickupStatusUpdate && !isQrScanRequest) {
      return res.status(403).json({
        message: 'After transporter assignment, status updates must be done via QR scan only'
      });
    }

    const previousStatus = order.current_status;
    await order.update({ current_status: status });
    
    res.json({ 
      success: true,
      message: 'Order status updated successfully',
      data: { order_id, status, previous_status: previousStatus }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateOrderStatusByOrderIdParam = async (req, res) => {
  req.body = {
    ...(req.body || {}),
    order_id: Number(req.params?.order_id),
  };
  return updateOrderStatus(req, res);
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

// Get active orders for transporter
const getActiveOrders = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { source_transporter_id: req.user.transporter_id },
          { destination_transporter_id: req.user.transporter_id }
        ],
        current_status: {
          [Op.in]: ['PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY']
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
        {
          model: CustomerUser,
          as: 'customer',
          attributes: ['name', 'mobile_number', 'address']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get active orders error:', error);
    res.status(500).json({ message: 'Error retrieving active orders' });
  }
};

// Track specific order for transporter
const trackOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { Op } = require('sequelize');
    
    const orderIncludes = [
      {
        model: Product,
        attributes: ['product_id', 'name', 'current_price'],
        required: false,
        include: [
          {
            model: ProductImage,
            as: 'images',
            attributes: ['image_url', 'is_primary'],
            required: false
          },
          {
            model: FarmerUser,
            as: 'farmer',
            attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'image_url', 'zone', 'district', 'state'],
            required: false
          }
        ]
      },
      {
        model: CustomerUser,
        as: 'customer',
        attributes: ['customer_id', 'name', 'mobile_number', 'address', 'image_url'],
        required: false
      },
      {
        model: DeliveryPerson,
        as: 'delivery_person',
        attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_type', 'vehicle_number', 'image_url'],
        required: false
      },
      {
        model: TransporterUser,
        as: 'source_transporter',
        attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state', 'image_url'],
        required: false
      },
      {
        model: TransporterUser,
        as: 'destination_transporter',
        attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state', 'image_url'],
        required: false
      }
    ];

    // First try with transporter filter
    let order = await Order.findOne({
      where: {
        order_id,
        [Op.or]: [
          { source_transporter_id: req.user.transporter_id },
          { destination_transporter_id: req.user.transporter_id }
        ]
      },
      include: orderIncludes
    });

    // Fallback: order may not have transporters assigned yet — find by ID only
    if (!order) {
      order = await Order.findOne({
        where: { order_id },
        include: orderIncludes
      });
    }

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    const trackingHistory = await DeliveryTracking.findAll({
      where: { order_id },
      order: [['scanned_at', 'ASC']]
    });

    const trackingSteps = [
      { status: 'PLACED', label: 'Order Placed', icon: '✅' },
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
        timestamp: trackingEvent?.scanned_at || null,
        location: trackingEvent?.location_address || null,
        notes: trackingEvent?.notes || null
      };
    });

    // Get farmer from product association
    const normalized = extractOrderProductAndFarmer(order);
    const farmer = normalized.farmer;
    const deliveryPerson = order.delivery_person || null;
    const customer = order.customer || null;
    const srcTrans = order.source_transporter || null;
    const dstTrans = order.destination_transporter || null;

    res.json({
      success: true,
      data: {
        order: {
          order_id: order.order_id,
          current_status: order.current_status,
          total_price: order.total_price,
          quantity: order.quantity,
          delivery_address: order.delivery_address,
          pickup_address: order.pickup_address,
          transport_charge: order.transport_charge,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          product_name: normalized.product_name,
          product_image: normalized.product_image,
          farmer_name: normalized.farmer_name,
          farmer_phone: normalized.farmer_phone,
          farmer_address: normalized.farmer_address,
          farmer_image_url: normalized.farmer_image_url,
          product: normalized.product ? {
            product_id: normalized.product.product_id,
            name: normalized.product.name,
            current_price: normalized.product.current_price,
            images: normalized.product.images || []
          } : null,
          // Farmer mapped with exact field names frontend expects
          farmer: farmer ? {
            farmer_id: farmer.farmer_id,
            name: farmer.name || '',
            full_name: farmer.name || '',
            phone: farmer.mobile_number || '',
            mobile_number: farmer.mobile_number || '',
            address: farmer.address || '',
            image: farmer.image_url || farmer.image || farmer.profile_image || null,
            image_url: farmer.image_url || farmer.image || farmer.profile_image || null,
            zone: farmer.zone || '',
            district: farmer.district || '',
            state: farmer.state || ''
          } : null,
          // Customer mapped with exact field names frontend expects
          customer: customer ? {
            customer_id: customer.customer_id,
            name: customer.name || '',
            phone: customer.mobile_number || '',
            address: customer.address || '',
            image: customer.image_url || null
          } : null,
          // Delivery person mapped with exact field names frontend expects
          delivery_person: deliveryPerson ? {
            delivery_person_id: deliveryPerson.delivery_person_id,
            name: deliveryPerson.name || '',
            phone: deliveryPerson.mobile_number || '',
            vehicle: deliveryPerson.vehicle_number || '',
            vehicleType: deliveryPerson.vehicle_type || '',
            image: deliveryPerson.image_url || null
          } : null,
          source_transporter: srcTrans ? {
            transporter_id: srcTrans.transporter_id,
            name: srcTrans.name || '',
            full_name: srcTrans.name || '',
            phone: srcTrans.mobile_number || '',
            mobile_number: srcTrans.mobile_number || '',
            email: srcTrans.email || '',
            address: srcTrans.address || '',
            zone: srcTrans.zone || '',
            district: srcTrans.district || '',
            state: srcTrans.state || '',
            image_url: srcTrans.image_url || null
          } : null,
          destination_transporter: dstTrans ? {
            transporter_id: dstTrans.transporter_id,
            name: dstTrans.name || '',
            full_name: dstTrans.name || '',
            phone: dstTrans.mobile_number || '',
            mobile_number: dstTrans.mobile_number || '',
            email: dstTrans.email || '',
            address: dstTrans.address || '',
            zone: dstTrans.zone || '',
            district: dstTrans.district || '',
            state: dstTrans.state || '',
            image_url: dstTrans.image_url || null
          } : null
        },
        tracking_steps: enrichedSteps,
        tracking_history: trackingHistory
      }
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error tracking order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get real-time tracking updates for transporter
const getTrackingUpdates = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { Op } = require('sequelize');
    
    const order = await Order.findOne({
      where: {
        order_id,
        [Op.or]: [
          { source_transporter_id: req.user.transporter_id },
          { destination_transporter_id: req.user.transporter_id }
        ]
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

// Update packing proof images on an order
const updatePackingProof = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { packing_image_url, bill_paste_image_url } = req.body;
    const { Op } = require('sequelize');

    const order = await Order.findOne({
      where: {
        order_id,
        [Op.or]: [
          { source_transporter_id: req.user.transporter_id },
          { destination_transporter_id: req.user.transporter_id }
        ]
      }
    });

    if (!order) {
      // Fallback: try finding by order_id only
      const fallbackOrder = await Order.findByPk(order_id);
      if (!fallbackOrder) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      // Update fallback
      const updateData = {};
      if (packing_image_url) updateData.packing_image_url = packing_image_url;
      if (bill_paste_image_url) updateData.bill_paste_image_url = bill_paste_image_url;
      await fallbackOrder.update(updateData);
      return res.json({ success: true, message: 'Packing proof updated', data: fallbackOrder });
    }

    const updateData = {};
    if (packing_image_url) updateData.packing_image_url = packing_image_url;
    if (bill_paste_image_url) updateData.bill_paste_image_url = bill_paste_image_url;
    await order.update(updateData);

    res.json({ 
      success: true, 
      message: 'Packing proof updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update packing proof error:', error);
    res.status(500).json({ success: false, message: 'Error updating packing proof', error: error.message });
  }
};

// Get single order detail with all includes
const getOrderDetail = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { Op } = require('sequelize');

    let order = await Order.findOne({
      where: {
        order_id,
        [Op.or]: [
          { source_transporter_id: req.user.transporter_id },
          { destination_transporter_id: req.user.transporter_id }
        ]
      },
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price'],
          required: false,
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_url', 'is_primary'],
              required: false
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'image_url', 'zone', 'district', 'state'],
              required: false
            }
          ]
        },
        {
          model: CustomerUser,
          as: 'customer',
          attributes: ['customer_id', 'name', 'mobile_number', 'address', 'image_url'],
          required: false
        },
        {
          model: DeliveryPerson,
          as: 'delivery_person',
          attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_type', 'vehicle_number', 'image_url'],
          required: false
        },
        {
          model: TransporterUser,
          as: 'source_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state', 'image_url'],
          required: false
        },
        {
          model: TransporterUser,
          as: 'destination_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state', 'image_url'],
          required: false
        }
      ]
    });

    // Fallback: try finding by order_id only
    if (!order) {
      order = await Order.findOne({
        where: { order_id },
        include: [
          {
            model: Product,
            attributes: ['product_id', 'name', 'current_price'],
            required: false,
            include: [
              { model: ProductImage, as: 'images', attributes: ['image_url', 'is_primary'], required: false },
              { model: FarmerUser, as: 'farmer', attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'image_url', 'zone', 'district', 'state'], required: false }
            ]
          },
          { model: CustomerUser, as: 'customer', attributes: ['customer_id', 'name', 'mobile_number', 'address', 'image_url'], required: false },
          { model: DeliveryPerson, as: 'delivery_person', attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_type', 'vehicle_number', 'image_url'], required: false },
          { model: TransporterUser, as: 'source_transporter', attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state', 'image_url'], required: false },
          { model: TransporterUser, as: 'destination_transporter', attributes: ['transporter_id', 'name', 'mobile_number', 'email', 'address', 'zone', 'district', 'state', 'image_url'], required: false }
        ]
      });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const normalized = extractOrderProductAndFarmer(order);
    const farmer = normalized.farmer;
    const deliveryPerson = order.delivery_person || null;
    const customer = order.customer || null;
    const srcTrans = order.source_transporter || null;
    const dstTrans = order.destination_transporter || null;

    res.json({
      success: true,
      data: {
        order_id: order.order_id,
        current_status: order.current_status,
        total_price: order.total_price,
        quantity: order.quantity,
        delivery_address: order.delivery_address,
        pickup_address: order.pickup_address,
        transport_charge: order.transport_charge,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        qr_code: order.qr_code,
        qr_image_url: order.qr_image_url,
        packing_image_url: order.packing_image_url,
        bill_paste_image_url: order.bill_paste_image_url,
        source_transporter_id: order.source_transporter_id,
        destination_transporter_id: order.destination_transporter_id,
        delivery_person_id: order.delivery_person_id,
        permanent_vehicle_id: order.permanent_vehicle_id,
        temp_vehicle_id: order.temp_vehicle_id,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product_name: normalized.product_name,
        product_image: normalized.product_image,
        farmer_name: normalized.farmer_name,
        farmer_phone: normalized.farmer_phone,
        farmer_address: normalized.farmer_address,
        farmer_image_url: normalized.farmer_image_url,
        product: normalized.product ? {
          product_id: normalized.product.product_id,
          name: normalized.product.name,
          current_price: normalized.product.current_price,
          images: normalized.product.images || []
        } : null,
        farmer: farmer ? {
          farmer_id: farmer.farmer_id,
          name: farmer.name || '',
          full_name: farmer.name || '',
          phone: farmer.mobile_number || '',
          mobile_number: farmer.mobile_number || '',
          address: farmer.address || '',
          image: farmer.image_url || farmer.image || farmer.profile_image || null,
          image_url: farmer.image_url || farmer.image || farmer.profile_image || null,
          zone: farmer.zone || '',
          district: farmer.district || '',
          state: farmer.state || ''
        } : null,
        customer: customer ? {
          customer_id: customer.customer_id,
          name: customer.name || '',
          full_name: customer.name || '',
          phone: customer.mobile_number || '',
          mobile_number: customer.mobile_number || '',
          address: customer.address || '',
          image_url: customer.image_url || null
        } : null,
        delivery_person: deliveryPerson ? {
          delivery_person_id: deliveryPerson.delivery_person_id,
          name: deliveryPerson.name || '',
          full_name: deliveryPerson.name || '',
          phone: deliveryPerson.mobile_number || '',
          mobile_number: deliveryPerson.mobile_number || '',
          vehicle_number: deliveryPerson.vehicle_number || '',
          vehicle_type: deliveryPerson.vehicle_type || '',
          image_url: deliveryPerson.image_url || null
        } : null,
        source_transporter: srcTrans ? {
          transporter_id: srcTrans.transporter_id,
          name: srcTrans.name || '',
          full_name: srcTrans.name || '',
          phone: srcTrans.mobile_number || '',
          mobile_number: srcTrans.mobile_number || '',
          email: srcTrans.email || '',
          address: srcTrans.address || '',
          zone: srcTrans.zone || '',
          district: srcTrans.district || '',
          state: srcTrans.state || '',
          image_url: srcTrans.image_url || null
        } : null,
        destination_transporter: dstTrans ? {
          transporter_id: dstTrans.transporter_id,
          name: dstTrans.name || '',
          full_name: dstTrans.name || '',
          phone: dstTrans.mobile_number || '',
          mobile_number: dstTrans.mobile_number || '',
          email: dstTrans.email || '',
          address: dstTrans.address || '',
          zone: dstTrans.zone || '',
          district: dstTrans.district || '',
          state: dstTrans.state || '',
          image_url: dstTrans.image_url || null
        } : null
      }
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order details', error: error.message });
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
  updateOrderStatusByOrderIdParam,
  getDeliveryPersons,
  getVehicles,
  getActiveOrders,
  trackOrder,
  getTrackingUpdates,
  resolveOrderByQr,
  updatePackingProof,
  getOrderDetail
};