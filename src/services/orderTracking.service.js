const Order = require('../models/order.model');
const DeliveryTracking = require('../models/deliveryTracking.model');
const Product = require('../models/product.model');
const FarmerUser = require('../models/farmer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const GoogleMapsService = require('./googleMaps.service');
const { v4: uuidv4 } = require('uuid');

class OrderTrackingService {
  
  // Calculate distance using Google Maps API
  static async calculateDistance(pickupAddress, deliveryAddress) {
    try {
      const result = await GoogleMapsService.calculateDistanceAndDuration(
        [pickupAddress],
        [deliveryAddress]
      );
      return result;
    } catch (error) {
      console.error('Distance calculation error:', error);
      throw error;
    }
  }

  // Find transporters based on zones
  static async assignTransporters(farmerZone, customerZone) {
    const sourceTransporter = await TransporterUser.findOne({
      where: { zone: farmerZone, verified_status: true }
    });
    
    const destinationTransporter = farmerZone === customerZone 
      ? sourceTransporter 
      : await TransporterUser.findOne({
          where: { zone: customerZone, verified_status: true }
        });

    return { sourceTransporter, destinationTransporter };
  }

  // Create order with automatic transporter assignment
  static async createOrderWithTracking(orderData) {
    try {
      // Get product and farmer details
      const product = await Product.findByPk(orderData.product_id, {
        include: [{ model: FarmerUser, as: 'farmer' }]
      });

      if (!product) throw new Error('Product not found');

      // Assign transporters based on zones
      const { sourceTransporter, destinationTransporter } = await this.assignTransporters(
        product.farmer.zone,
        orderData.customer_zone
      );

      // Calculate distance and estimated delivery time using Google Maps
      const pickupAddress = `${product.farmer.address}, ${product.farmer.zone}, ${product.farmer.district}, ${product.farmer.state}`;
      const deliveryAddress = orderData.delivery_address;
      
      let distanceData = null;
      try {
        distanceData = await this.calculateDistance(pickupAddress, deliveryAddress);
      } catch (error) {
        console.warn('Distance calculation failed, proceeding without distance data');
      }

      // Generate QR code
      const qrCode = uuidv4();

      // Calculate estimated delivery time (assuming 40 km/h average speed)
      const estimatedDeliveryTime = distanceData 
        ? new Date(Date.now() + (distanceData.duration * 60 * 1000))
        : null;

      // Create order
      const order = await Order.create({
        ...orderData,
        source_transporter_id: sourceTransporter?.transporter_id,
        destination_transporter_id: destinationTransporter?.transporter_id,
        qr_code: qrCode,
        current_status: 'PLACED',
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        estimated_distance: distanceData?.distance,
        estimated_delivery_time: estimatedDeliveryTime
      });

      // Create initial tracking entry
      await this.logTrackingEvent(order.order_id, 'PLACED', {
        scanned_by_role: 'customer',
        scanned_by_id: orderData.customer_id,
        notes: `Order placed successfully. ${distanceData ? `Distance: ${distanceData.distance_text}, Estimated time: ${distanceData.duration_text}` : 'Distance calculation unavailable'}`
      });

      return order;
    } catch (error) {
      throw error;
    }
  }

  // Log tracking events
  static async logTrackingEvent(orderId, status, trackingData) {
    return await DeliveryTracking.create({
      order_id: orderId,
      status,
      qr_code_scanned: trackingData.qr_code,
      scanned_by_id: trackingData.scanned_by_id,
      scanned_by_role: trackingData.scanned_by_role,
      location_lat: trackingData.location_lat,
      location_lng: trackingData.location_lng,
      location_address: trackingData.location_address,
      notes: trackingData.notes
    });
  }

  // Update order status with tracking
  static async updateOrderStatus(orderId, newStatus, trackingData) {
    try {
      // Update order status
      await Order.update(
        { current_status: newStatus },
        { where: { order_id: orderId } }
      );

      // Log tracking event
      await this.logTrackingEvent(orderId, newStatus, trackingData);

      return { success: true, message: 'Order status updated successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get order tracking history
  static async getOrderTracking(orderId) {
    return await DeliveryTracking.findAll({
      where: { order_id: orderId },
      order: [['scanned_at', 'ASC']]
    });
  }

  // QR Code scan handler
  static async scanQRCode(qrCode, scannerData) {
    try {
      const order = await Order.findOne({ where: { qr_code: qrCode } });
      if (!order) throw new Error('Invalid QR code');

      const statusFlow = {
        'PLACED': 'ASSIGNED',
        'ASSIGNED': 'SHIPPED',
        'SHIPPED': 'IN_TRANSIT',
        'IN_TRANSIT': 'RECEIVED',
        'RECEIVED': 'OUT_FOR_DELIVERY',
        'OUT_FOR_DELIVERY': 'COMPLETED'
      };

      const nextStatus = statusFlow[order.current_status];
      if (!nextStatus) throw new Error('Invalid status transition');

      await this.updateOrderStatus(order.order_id, nextStatus, {
        qr_code: qrCode,
        ...scannerData
      });

      return { 
        success: true, 
        order_id: order.order_id,
        previous_status: order.current_status,
        new_status: nextStatus
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OrderTrackingService;