const Order = require('../models/order.model');
const Product = require('../models/product.model');
const CustomerUser = require('../models/customer_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const TransporterUser = require('../models/transporter_user.model');
const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');

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

module.exports = {
  getAssignedOrders,
  getProfile,
  updateOrderStatus
};