const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const TransporterUser = require('../models/transporter_user.model');
const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');
const DeliveryTracking = require('../models/deliveryTracking.model');
const GoogleMapsService = require('../services/googleMaps.service');
const { sequelize } = require('../config/database');
const { sendDeliveryCompletionOTPEmail } = require('../utils/email');

const DELIVERY_OTP_EXPIRY_MINUTES = Number(process.env.DELIVERY_OTP_EXPIRY_MINUTES || 5) > 0
  ? Number(process.env.DELIVERY_OTP_EXPIRY_MINUTES || 5)
  : 5;
const DELIVERY_OTP_EXPIRY_MS = DELIVERY_OTP_EXPIRY_MINUTES * 60 * 1000;
const DELIVERY_OTP_EXPOSE_FALLBACK = String(process.env.DELIVERY_OTP_EXPOSE_FALLBACK || 'true').toLowerCase() !== 'false';
const DELIVERY_OTP_AUTO_VERIFY_ON_EMAIL_FAILURE = String(process.env.DELIVERY_OTP_AUTO_VERIFY_ON_EMAIL_FAILURE || 'false').toLowerCase() === 'true';
const deliveryCompletionOtpStore = new Map();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const buildDeliveryOtpKey = (orderId, customerEmail) => `${orderId}:${String(customerEmail || '').trim().toLowerCase()}`;

const validateAndMarkDeliveryOtp = ({ orderId, customerEmail, deliveryOtp, requireInput = true }) => {
  const key = buildDeliveryOtpKey(orderId, customerEmail);
  const storedOtp = deliveryCompletionOtpStore.get(key);

  if (!storedOtp) {
    return { ok: false, message: 'OTP not found or expired. Please resend OTP.' };
  }

  if (storedOtp.expiresAt < Date.now()) {
    deliveryCompletionOtpStore.delete(key);
    return { ok: false, message: 'OTP has expired. Please resend OTP.' };
  }

  if (!deliveryOtp || String(deliveryOtp).trim().length === 0) {
    if (!requireInput && storedOtp.verified) {
      return { ok: true, message: 'OTP already verified' };
    }
    return { ok: false, message: 'Valid 6-digit delivery OTP is required' };
  }

  const normalizedOtp = String(deliveryOtp).trim();
  if (normalizedOtp.length !== 6) {
    return { ok: false, message: 'Valid 6-digit delivery OTP is required' };
  }

  if (storedOtp.otp !== normalizedOtp) {
    const nextAttempts = Number(storedOtp.attempts || 0) + 1;
    storedOtp.attempts = nextAttempts;
    if (nextAttempts >= 5) {
      deliveryCompletionOtpStore.delete(key);
      return { ok: false, message: 'Too many invalid attempts. Please resend OTP.' };
    }
    deliveryCompletionOtpStore.set(key, storedOtp);
    return { ok: false, message: 'Invalid OTP' };
  }

  storedOtp.verified = true;
  storedOtp.verifiedAt = Date.now();
  storedOtp.attempts = 0;
  deliveryCompletionOtpStore.set(key, storedOtp);

  return { ok: true, message: 'OTP verified successfully' };
};

const normalizeProofMediaUrls = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
};

const sendDeliveryCompletionOtp = async (req, res) => {
  try {
    const orderId = Number(req.body.order_id || req.body.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Valid order_id is required' });
    }

    const order = await Order.findOne({
      where: {
        order_id: orderId,
        delivery_person_id: req.user.delivery_person_id,
      },
      attributes: ['order_id', 'customer_id', 'current_status']
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    const customer = await CustomerUser.findByPk(order.customer_id, {
      attributes: ['customer_id', 'name', 'email']
    });

    if (!customer?.email) {
      return res.status(400).json({ message: 'Customer email is not available for OTP delivery' });
    }

    const otp = generateOtp();
    const now = Date.now();
    const key = buildDeliveryOtpKey(orderId, customer.email);
    deliveryCompletionOtpStore.set(key, {
      otp,
      expiresAt: now + DELIVERY_OTP_EXPIRY_MS,
      attempts: 0,
      orderId,
      customerEmail: customer.email,
      deliveryPersonId: req.user.delivery_person_id,
    });

    let sent = false;
    let emailFailureReason = null;
    let emailFailureMessage = null;
    try {
      const mailResult = await sendDeliveryCompletionOTPEmail(
        customer.email,
        otp,
        DELIVERY_OTP_EXPIRY_MINUTES,
        true
      );

      if (typeof mailResult === 'object' && mailResult !== null) {
        sent = mailResult.success === true;
        emailFailureReason = mailResult.success ? null : mailResult.reason || 'UNKNOWN_MAIL_ERROR';
        emailFailureMessage = mailResult.success ? null : mailResult.message || null;
      } else {
        sent = Boolean(mailResult);
      }
    } catch (mailError) {
      console.error('Delivery OTP mail send error:', mailError.message || mailError);
      sent = false;
      emailFailureReason = 'SENDGRID_SEND_EXCEPTION';
      emailFailureMessage = mailError.message || 'Email send exception';
    }
    if (!sent) {
      console.log(`\n=== DELIVERY OTP (DEV FALLBACK) for order ${orderId} / ${customer.email}: ${otp} ===\n`);
    }

    const exposeFallbackOtp = !sent && DELIVERY_OTP_EXPOSE_FALLBACK;
    const autoVerified = !sent && DELIVERY_OTP_AUTO_VERIFY_ON_EMAIL_FAILURE;
    if (autoVerified) {
      const entry = deliveryCompletionOtpStore.get(key);
      if (entry) {
        entry.verified = true;
        entry.verifiedAt = Date.now();
        entry.attempts = 0;
        deliveryCompletionOtpStore.set(key, entry);
      }
    }

    return res.json({
      success: true,
      message: sent
        ? `OTP sent to customer email and valid for ${DELIVERY_OTP_EXPIRY_MINUTES} minutes`
        : autoVerified
          ? 'OTP generated. Email delivery failed, but fallback auto-verification is enabled for this environment.'
          : 'OTP generated, but email delivery failed. Using fallback OTP mode.',
      data: {
        order_id: orderId,
        customer_email: customer.email,
        expires_in_seconds: DELIVERY_OTP_EXPIRY_MINUTES * 60,
        email_sent: sent,
        fallback_logged: !sent,
        fallback_otp_included: exposeFallbackOtp,
        auto_verified: autoVerified,
        email_failure_reason: emailFailureReason,
        email_failure_message: emailFailureMessage,
        fallback_otp: exposeFallbackOtp ? otp : undefined,
      }
    });
  } catch (error) {
    console.error('Send delivery completion OTP error:', error);
    return res.status(500).json({ message: 'Error sending delivery completion OTP' });
  }
};

const verifyDeliveryCompletionOtp = async (req, res) => {
  try {
    const orderId = Number(req.body.order_id || req.body.orderId);
    const deliveryOtp = String(req.body.delivery_otp || req.body.deliveryOtp || '').trim();

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Valid order_id is required' });
    }

    const order = await Order.findOne({
      where: {
        order_id: orderId,
        delivery_person_id: req.user.delivery_person_id,
      },
      attributes: ['order_id', 'customer_id']
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    const customer = await CustomerUser.findByPk(order.customer_id, {
      attributes: ['customer_id', 'email']
    });

    if (!customer?.email) {
      return res.status(400).json({ message: 'Customer email not found for OTP verification' });
    }

    const result = validateAndMarkDeliveryOtp({
      orderId,
      customerEmail: customer.email,
      deliveryOtp,
      requireInput: true,
    });

    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        order_id: orderId,
        verified: true,
      }
    });
  } catch (error) {
    console.error('Verify delivery completion OTP error:', error);
    return res.status(500).json({ message: 'Error verifying delivery OTP' });
  }
};

const fetchOrdersRaw = async (deliveryPersonId, statuses) => {
  const placeholders = statuses.map((_, idx) => `:s${idx}`).join(', ');
  const replacements = { deliveryPersonId };
  statuses.forEach((status, idx) => {
    replacements[`s${idx}`] = status;
  });

  const sql = `
    SELECT
      o.order_id,
      o.customer_id,
      o.product_id,
      o.source_transporter_id,
      o.destination_transporter_id,
      o.delivery_person_id,
      o.permanent_vehicle_id,
      o.temp_vehicle_id,
      o.quantity,
      o.total_price,
      o.farmer_amount,
      o.admin_commission,
      o.transport_charge,
      o.payment_status,
      o.current_status,
      o.payment_method,
      COALESCE(
        o.items_json,
        (
          SELECT json_agg(
            json_build_object(
              'product_id', oi.product_id,
              'quantity', oi.quantity,
              'price', oi.unit_price
            )
          )::text
          FROM order_items oi
          WHERE oi.order_id = o.order_id
        ),
        '[]'
      ) AS items_json,
      o.razorpay_order_id,
      o.razorpay_payment_id,
      o.qr_code,
      o.qr_image_url,
      o.bill_url,
      p.name AS product_name,
      pi.image_url AS product_image,
      f.name AS farmer_name,
      f.mobile_number AS farmer_phone,
      f.address AS farmer_address,
      f.image_url AS farmer_image_url,
      o.pickup_address,
      o.delivery_address,
      o.estimated_distance,
      o.estimated_delivery_time,
      o.created_at,
      o.updated_at
    FROM orders o
    LEFT JOIN products p ON p.product_id = o.product_id
    LEFT JOIN farmers f ON f.farmer_id = p.farmer_id
    LEFT JOIN LATERAL (
      SELECT image_url
      FROM product_images
      WHERE product_id = p.product_id
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1
    ) pi ON true
    WHERE o.delivery_person_id = :deliveryPersonId
      AND o.current_status IN (${placeholders})
    ORDER BY o.created_at DESC
  `;

  const rows = await sequelize.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT
  });

  return rows;
};

const getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { 
        delivery_person_id: req.user.delivery_person_id,
        current_status: { [Op.in]: ['ASSIGNED', 'PLACED', 'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RECEIVED'] }
      },
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price'],
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_url', 'is_primary'],
              required: false,
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'image_url'],
              required: false,
            },
          ],
        },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      const isPickup = ['ASSIGNED', 'PLACED', 'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP'].includes(order.current_status);
      
      let vehicleInfo = null;
      if (order.permanent_vehicle_id) {
        const vehicle = await PermanentVehicle.findByPk(order.permanent_vehicle_id);
        vehicleInfo = vehicle ? {
          type: 'permanent',
          vehicle_number: vehicle.vehicle_number,
          vehicle_type: vehicle.vehicle_type
        } : null;
      } else if (order.temp_vehicle_id) {
        const vehicle = await TemporaryVehicle.findByPk(order.temp_vehicle_id);
        vehicleInfo = vehicle ? {
          type: 'temporary',
          vehicle_number: vehicle.vehicle_number,
          vehicle_type: vehicle.vehicle_type
        } : null;
      }
      
      return {
        ...order.toJSON(),
        farmer_name: order.Product?.farmer?.name || null,
        farmer_phone: order.Product?.farmer?.mobile_number || null,
        farmer_address: order.Product?.farmer?.address || null,
        farmer_image_url: order.Product?.farmer?.image_url || null,
        product_image:
          order.Product?.images?.find((img) => img?.is_primary)?.image_url ||
          order.Product?.images?.[0]?.image_url ||
          null,
        delivery_type: isPickup ? 'PICKUP' : 'DELIVERY',
        task_description: isPickup ? 'Pickup from farmer and transport to destination' : 'Receive from source and deliver to customer',
        vehicle_info: vehicleInfo
      };
    }));

    res.json({
      success: true,
      count: ordersWithDetails.length,
      data: ordersWithDetails
    });
  } catch (error) {
    console.error('Get assigned orders error:', error);

    // Fallback path for schema/association mismatches in some environments.
    try {
      const statuses = ['ASSIGNED', 'PLACED', 'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RECEIVED'];
      const rawOrders = await fetchOrdersRaw(req.user.delivery_person_id, statuses);

      res.json({
        success: true,
        count: rawOrders.length,
        data: rawOrders
      });
    } catch (fallbackError) {
      console.error('Get assigned orders fallback error:', fallbackError);
      res.status(500).json({
        message: 'Error fetching assigned orders',
        error: fallbackError.message
      });
    }
  }
};

const getPickupOrders = async (req, res) => {
  try {
    console.log('[getPickupOrders] Starting...');
    console.log('[getPickupOrders] User:', req.user.toJSON());
    console.log('[getPickupOrders] Delivery person ID:', req.user.delivery_person_id);
    
    if (!req.user.delivery_person_id) {
      console.log('[getPickupOrders] No delivery_person_id found');
      return res.status(400).json({ message: 'Delivery person ID not found in token' });
    }

    console.log('[getPickupOrders] Delivery person found:', req.user.name);

    // First try with includes to provide farmer contact and image in payload.
    const orders = await Order.findAll({
      where: { 
        delivery_person_id: req.user.delivery_person_id,
        current_status: { [Op.in]: ['ASSIGNED', 'PLACED', 'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'SHIPPED'] }
      },
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price'],
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_url', 'is_primary'],
              required: false,
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'image_url'],
              required: false,
            },
          ],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']]
    });

    console.log('[getPickupOrders] Found orders:', orders.length);
    console.log('[getPickupOrders] Orders data:', orders.map(o => ({ id: o.order_id, status: o.current_status, product_id: o.product_id })));

    const enrichedOrders = orders.map((order) => {
      const data = order.toJSON();
      return {
        ...data,
        farmer_name: data?.Product?.farmer?.name || null,
        farmer_phone: data?.Product?.farmer?.mobile_number || null,
        farmer_address: data?.Product?.farmer?.address || null,
        farmer_image_url: data?.Product?.farmer?.image_url || null,
        product_image:
          data?.Product?.images?.find((img) => img?.is_primary)?.image_url ||
          data?.Product?.images?.[0]?.image_url ||
          null,
      };
    });

    res.json({
      success: true,
      count: enrichedOrders.length,
      data: enrichedOrders
    });
  } catch (error) {
    console.error('[getPickupOrders] Error:', error);

    try {
      const statuses = ['ASSIGNED', 'PLACED', 'PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'SHIPPED'];
      const rawOrders = await fetchOrdersRaw(req.user.delivery_person_id, statuses);
      res.json({
        success: true,
        count: rawOrders.length,
        data: rawOrders
      });
    } catch (fallbackError) {
      console.error('[getPickupOrders] Fallback error:', fallbackError);
      res.status(500).json({ message: 'Error fetching pickup orders', error: fallbackError.message });
    }
  }
};

const getDeliveryOrders = async (req, res) => {
  try {
    console.log('[getDeliveryOrders] Starting...');
    console.log('[getDeliveryOrders] User:', req.user.toJSON());
    console.log('[getDeliveryOrders] Delivery person ID:', req.user.delivery_person_id);
    
    if (!req.user.delivery_person_id) {
      console.log('[getDeliveryOrders] No delivery_person_id found');
      return res.status(400).json({ message: 'Delivery person ID not found in token' });
    }

    console.log('[getDeliveryOrders] Delivery person found:', req.user.name);

    // First try with includes to provide farmer contact and image in payload.
    const orders = await Order.findAll({
      where: { 
        delivery_person_id: req.user.delivery_person_id,
        current_status: { [Op.in]: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RECEIVED'] }
      },
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price'],
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_url', 'is_primary'],
              required: false,
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'image_url'],
              required: false,
            },
          ],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']]
    });

    console.log('[getDeliveryOrders] Found orders:', orders.length);
    console.log('[getDeliveryOrders] Orders data:', orders.map(o => ({ id: o.order_id, status: o.current_status, product_id: o.product_id })));

    const enrichedOrders = orders.map((order) => {
      const data = order.toJSON();
      return {
        ...data,
        farmer_name: data?.Product?.farmer?.name || null,
        farmer_phone: data?.Product?.farmer?.mobile_number || null,
        farmer_address: data?.Product?.farmer?.address || null,
        farmer_image_url: data?.Product?.farmer?.image_url || null,
        product_image:
          data?.Product?.images?.find((img) => img?.is_primary)?.image_url ||
          data?.Product?.images?.[0]?.image_url ||
          null,
      };
    });

    res.json({
      success: true,
      count: enrichedOrders.length,
      data: enrichedOrders
    });
  } catch (error) {
    console.error('[getDeliveryOrders] Error:', error);

    try {
      const statuses = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RECEIVED'];
      const rawOrders = await fetchOrdersRaw(req.user.delivery_person_id, statuses);
      res.json({
        success: true,
        count: rawOrders.length,
        data: rawOrders
      });
    } catch (fallbackError) {
      console.error('[getDeliveryOrders] Fallback error:', fallbackError);
      res.status(500).json({ message: 'Error fetching delivery orders', error: fallbackError.message });
    }
  }
};

const getOrderHistory = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { 
        delivery_person_id: req.user.delivery_person_id,
        current_status: {
          [Op.in]: [
            'PICKED_UP',
            'RECEIVED',
            'SHIPPED',
            'OUT_FOR_DELIVERY',
            'REACHED_DESTINATION',
            'DELIVERED',
            'COMPLETED',
            'CANCELLED',
            'FAILED',
            'TRANSFERRED'
          ]
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
              attributes: ['image_url', 'is_primary'],
              required: false,
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: ['farmer_id', 'name', 'mobile_number', 'address', 'image_url'],
              required: false,
            },
          ],
        },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number', 'address'] }
      ],
      order: [['updated_at', 'DESC']]
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({ message: 'Error fetching order history' });
  }
};

const getEarnings = async (req, res) => {
  try {
    const { period = 'all' } = req.query;

    let whereClause = {
      delivery_person_id: req.user.delivery_person_id,
      current_status: 'COMPLETED'
    };

    // Filter by period
    const now = new Date();
    if (period === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      whereClause.updated_at = { [Op.gte]: startOfDay };
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      whereClause.updated_at = { [Op.gte]: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      whereClause.updated_at = { [Op.gte]: monthAgo };
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: Product, attributes: ['name'] },
        { model: CustomerUser, as: 'customer', attributes: ['name'] }
      ],
      order: [['updated_at', 'DESC']]
    });

    const deliveries = orders.map(order => ({
      order_id: order.order_id,
      delivery_charge: order.transport_charge || 0,
      earnings: order.transport_charge || 0,
      delivery_date: order.updated_at,
      customer_name: order.customer?.name || 'Customer',
      product_name: order.Product?.name || 'Product'
    }));

    res.json({
      success: true,
      period,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Error fetching earnings' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    const { name, mobile_number, vehicle_number, vehicle_type, current_location, image_url } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (mobile_number) updateData.mobile_number = mobile_number;
    if (vehicle_number) updateData.vehicle_number = vehicle_number;
    if (vehicle_type) updateData.vehicle_type = vehicle_type;
    if (current_location) updateData.current_location = current_location;
    if (image_url) updateData.image_url = image_url;

    await deliveryPerson.update(updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: deliveryPerson
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

const getProfile = async (req, res) => {
  try {
    // Calculate statistics from orders
    const completedOrders = await Order.findAll({
      where: {
        delivery_person_id: req.user.delivery_person_id,
        current_status: 'COMPLETED'
      }
    });
    
    const totalDeliveries = completedOrders.length;
    
    // Calculate average rating from completed orders
    const ordersWithRating = completedOrders.filter(o => o.rating && o.rating > 0);
    const averageRating = ordersWithRating.length > 0
      ? ordersWithRating.reduce((sum, o) => sum + parseFloat(o.rating || 0), 0) / ordersWithRating.length
      : parseFloat(req.user.rating || 0);
    
    // Calculate on-time percentage (orders delivered on or before expected date)
    const onTimeOrders = completedOrders.filter(o => {
      if (!o.estimated_delivery_time || !o.updated_at) return false;
      return new Date(o.updated_at) <= new Date(o.estimated_delivery_time);
    });
    const onTimePercentage = totalDeliveries > 0 
      ? Math.round((onTimeOrders.length / totalDeliveries) * 100)
      : 0;
    
    res.json({
      success: true,
      data: {
        ...req.user.toJSON(),
        total_deliveries: totalDeliveries,
        rating: averageRating,
        average_rating: averageRating,
        on_time_percentage: onTimePercentage,
        on_time_rate: onTimePercentage
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const {
      order_id,
      status,
      proof_image_url,
      proof_video_url,
      delivery_proof_media_urls,
      signature_url,
      remarks,
      delivery_otp,
    } = req.body;
    
    const pickupStatuses = ['PICKUP_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP'];
    const validStatuses = [...pickupStatuses, 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const order = await Order.findOne({
      where: { 
        order_id,
        delivery_person_id: req.user.delivery_person_id
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    const isPickupStatusUpdate = pickupStatuses.includes(status) || pickupStatuses.includes(order.current_status);

    const isOutForDeliveryVerificationAttempt =
      status === 'OUT_FOR_DELIVERY' && String(order.current_status || '').toUpperCase() === 'OUT_FOR_DELIVERY';

    if (
      order.source_transporter_id &&
      order.destination_transporter_id &&
      !isPickupStatusUpdate &&
      !isOutForDeliveryVerificationAttempt
    ) {
      return res.status(403).json({
        message: 'After transporter assignment, delivery status updates must be done via QR scan only'
      });
    }
    
    const previousStatus = order.current_status;
    const mediaUrls = normalizeProofMediaUrls(delivery_proof_media_urls || req.body?.proof_media_urls);
    const mergedProofUrls = [
      ...mediaUrls,
      proof_image_url,
      proof_video_url,
    ].map((v) => String(v || '').trim()).filter(Boolean);

    const requiresDeliveryConfirmationVerification =
      status === 'COMPLETED' ||
      (status === 'OUT_FOR_DELIVERY' && (Boolean(delivery_otp) || mergedProofUrls.length > 0));

    if (requiresDeliveryConfirmationVerification) {
      if (!mergedProofUrls.length) {
        return res.status(400).json({
          message: 'Delivery proof is required (photo or video) before marking order as completed'
        });
      }

      const customer = await CustomerUser.findByPk(order.customer_id, {
        attributes: ['customer_id', 'email']
      });

      if (!customer?.email) {
        return res.status(400).json({ message: 'Customer email not found for OTP verification' });
      }

      const otpResult = validateAndMarkDeliveryOtp({
        orderId: order.order_id,
        customerEmail: customer.email,
        deliveryOtp: delivery_otp,
        requireInput: false,
      });

      if (!otpResult.ok) {
        return res.status(400).json({ message: otpResult.message });
      }

      if (status === 'COMPLETED') {
        const key = buildDeliveryOtpKey(order.order_id, customer.email);
        deliveryCompletionOtpStore.delete(key);
      }
    }

    const updateData = { current_status: status };
    if (proof_image_url) {
      updateData.delivery_proof_image_url = proof_image_url;
    } else if (mergedProofUrls.length) {
      updateData.delivery_proof_image_url = mergedProofUrls[0];
    }
    if (signature_url) updateData.delivery_signature_url = signature_url;
    if (remarks || mergedProofUrls.length || requiresDeliveryConfirmationVerification) {
      const proofMeta = mergedProofUrls.length
        ? `\n[proof_media_urls] ${JSON.stringify(mergedProofUrls)}`
        : '';
      const completionMeta = requiresDeliveryConfirmationVerification
        ? `\n[delivery_otp_verified] true\n[delivery_otp_verified_at] ${new Date().toISOString()}`
        : '';
      updateData.delivery_remarks = `${remarks || ''}${proofMeta}${completionMeta}`.trim();
    }

    await order.update(updateData);
    
    if (status === 'COMPLETED') {
      const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
      await deliveryPerson.update({ is_available: true });
    }
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order_id,
        previous_status: previousStatus,
        new_status: status,
        proof_media_count: mergedProofUrls.length,
      }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, order_id } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }
    
    const location = `${latitude},${longitude}`;
    await deliveryPerson.update({ current_location: location });
    
    let address = null;
    try {
      address = await GoogleMapsService.getAddressFromCoordinates(latitude, longitude);
      console.log('\n=== LOCATION UPDATE ===');
      console.log('Coordinates:', latitude, longitude);
      console.log('Address:', address);
      console.log('=== END LOCATION UPDATE ===\n');
    } catch (error) {
      console.warn('Failed to get address from coordinates:', error.message);
      address = `Location: ${latitude}, ${longitude}`;
    }
    
    if (order_id) {
      const order = await Order.findOne({
        where: { 
          order_id,
          delivery_person_id: req.user.delivery_person_id
        }
      });
      
      if (order) {
        await DeliveryTracking.create({
          order_id,
          status: order.current_status,
          location_lat: latitude,
          location_lng: longitude,
          location_address: address,
          notes: `Location updated by delivery person [scan:role=delivery, id=${req.user.delivery_person_id}]`
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: { 
        latitude, 
        longitude, 
        location,
        address
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Error updating location' });
  }
};

const trackOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const order = await Order.findOne({
      where: { order_id },
      include: [
        { model: Product, attributes: ['name', 'image_url'] },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number', 'address'] }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    let deliveryPersonInfo = null;
    let currentLocation = null;
    
    if (order.delivery_person_id) {
      const deliveryPerson = await DeliveryPerson.findByPk(order.delivery_person_id, {
        attributes: ['delivery_person_id', 'name', 'mobile_number', 'current_location', 'vehicle_number']
      });
      
      if (deliveryPerson) {
        deliveryPersonInfo = {
          name: deliveryPerson.name,
          mobile_number: deliveryPerson.mobile_number,
          vehicle_number: deliveryPerson.vehicle_number
        };
        
        if (deliveryPerson.current_location) {
          const [lat, lng] = deliveryPerson.current_location.split(',');
          currentLocation = {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
          };
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        order_id: order.order_id,
        status: order.current_status,
        product_name: order.Product?.name,
        quantity: order.quantity,
        total_price: order.total_price,
        pickup_address: order.pickup_address,
        delivery_address: order.delivery_address,
        delivery_person: deliveryPersonInfo,
        current_location: currentLocation,
        created_at: order.created_at,
        updated_at: order.updated_at
      }
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ message: 'Error tracking order' });
  }
};

const getTrackingHistory = async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const trackingHistory = await DeliveryTracking.findAll({
      where: { order_id },
      order: [['scanned_at', 'DESC']]
    });
    
    res.json({
      success: true,
      count: trackingHistory.length,
      data: trackingHistory
    });
  } catch (error) {
    console.error('Get tracking history error:', error);
    res.status(500).json({ message: 'Error fetching tracking history' });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { is_available } = req.body;
    
    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ message: 'is_available must be a boolean value' });
    }
    
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }
    
    await deliveryPerson.update({ is_available });
    
    res.json({
      success: true,
      message: `Availability updated to ${is_available ? 'available' : 'unavailable'}`,
      data: {
        delivery_person_id: deliveryPerson.delivery_person_id,
        name: deliveryPerson.name,
        is_available: deliveryPerson.is_available
      }
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ message: 'Error updating availability' });
  }
};

module.exports = {
  getAssignedOrders,
  getPickupOrders,
  getDeliveryOrders,
  getOrderHistory,
  getEarnings,
  getProfile,
  updateProfile,
  sendDeliveryCompletionOtp,
  verifyDeliveryCompletionOtp,
  updateOrderStatus,
  updateLocation,
  trackOrder,
  getTrackingHistory,
  updateAvailability
};