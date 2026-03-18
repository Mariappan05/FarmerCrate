const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const CustomerUser = require('../models/customer_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const TransporterUser = require('../models/transporter_user.model');
const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');
const DeliveryTracking = require('../models/deliveryTracking.model');
const GoogleMapsService = require('../services/googleMaps.service');

const getAssignedOrders = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    const orders = await Order.findAll({
      where: { 
        delivery_person_id: req.user.delivery_person_id,
        current_status: ['ASSIGNED', 'PLACED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RECEIVED']
      },
      include: [
        { model: Product, attributes: ['name', 'current_price'] },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      const isSourceTransporter = order.source_transporter_id === deliveryPerson.transporter_id;
      const isDestinationTransporter = order.destination_transporter_id === deliveryPerson.transporter_id;
      
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
        delivery_type: isSourceTransporter ? 'PICKUP' : 'DELIVERY',
        task_description: isSourceTransporter ? 'Pickup from farmer and transport to destination' : 'Receive from source and deliver to customer',
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
    res.status(500).json({ message: 'Error fetching assigned orders' });
  }
};

const getPickupOrders = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    const orders = await Order.findAll({
      where: { 
        delivery_person_id: req.user.delivery_person_id,
        current_status: ['ASSIGNED', 'PLACED', 'SHIPPED']
      },
      include: [
        { model: Product, attributes: ['name', 'current_price', 'image_url'] },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get pickup orders error:', error);
    res.status(500).json({ message: 'Error fetching pickup orders' });
  }
};

const getDeliveryOrders = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    const orders = await Order.findAll({
      where: { 
        delivery_person_id: req.user.delivery_person_id,
        current_status: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RECEIVED']
      },
      include: [
        { model: Product, attributes: ['name', 'current_price', 'image_url'] },
        { model: CustomerUser, as: 'customer', attributes: ['name', 'mobile_number', 'address'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get delivery orders error:', error);
    res.status(500).json({ message: 'Error fetching delivery orders' });
  }
};

const getOrderHistory = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    const orders = await Order.findAll({
      where: { 
        delivery_person_id: req.user.delivery_person_id,
        current_status: ['COMPLETED', 'CANCELLED']
      },
      include: [
        { model: Product, attributes: ['name', 'current_price'] },
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
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    let whereClause = {
      delivery_person_id: req.user.delivery_person_id,
      current_status: ['COMPLETED']
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
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }
    
    // Calculate statistics from orders
    const completedOrders = await Order.findAll({
      where: {
        delivery_person_id: req.user.delivery_person_id,
        current_status: ['COMPLETED']
      }
    });
    
    const totalDeliveries = completedOrders.length;
    
    // Calculate average rating from completed orders
    const ordersWithRating = completedOrders.filter(o => o.rating && o.rating > 0);
    const averageRating = ordersWithRating.length > 0
      ? ordersWithRating.reduce((sum, o) => sum + parseFloat(o.rating || 0), 0) / ordersWithRating.length
      : parseFloat(deliveryPerson.rating || 0);
    
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
        ...deliveryPerson.toJSON(),
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
    const { order_id, status } = req.body;
    
    const validStatuses = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'COMPLETED'];
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
    
    const previousStatus = order.current_status;
    await order.update({ current_status: status });
    
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
        new_status: status
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
          scanned_by_id: req.user.delivery_person_id,
          scanned_by_role: 'delivery',
          location_lat: latitude,
          location_lng: longitude,
          location_address: address,
          notes: 'Location updated by delivery person'
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
  updateOrderStatus,
  updateLocation,
  trackOrder,
  getTrackingHistory,
  updateAvailability
};