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
      where: { delivery_person_id: req.user.delivery_person_id },
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

const getProfile = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findByPk(req.user.delivery_person_id);
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }
    
    res.json({
      success: true,
      data: deliveryPerson
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

module.exports = {
  getAssignedOrders,
  getProfile,
  updateOrderStatus,
  updateLocation,
  trackOrder,
  getTrackingHistory
};