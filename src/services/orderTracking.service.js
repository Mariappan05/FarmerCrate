const Order = require('../models/order.model');
const DeliveryTracking = require('../models/deliveryTracking.model');
const Product = require('../models/product.model');
const FarmerUser = require('../models/farmer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const GoogleMapsService = require('./googleMaps.service');
const { v4: uuidv4 } = require('uuid');

class OrderTrackingService {
  static getStatusFlow() {
    return {
      ASSIGNED: 'SHIPPED',
      SHIPPED: 'IN_TRANSIT',
      IN_TRANSIT: 'RECEIVED',
      RECEIVED: 'OUT_FOR_DELIVERY',
      OUT_FOR_DELIVERY: 'COMPLETED'
    };
  }

  static getNextStatus(currentStatus) {
    return this.getStatusFlow()[currentStatus];
  }

  static getRequiredTransporterForTransition(order, currentStatus) {
    if (currentStatus === 'ASSIGNED' || currentStatus === 'SHIPPED') {
      return order.source_transporter_id;
    }

    if (currentStatus === 'IN_TRANSIT' || currentStatus === 'RECEIVED') {
      return order.destination_transporter_id;
    }

    return null;
  }

  static async validateScannerPermission(order, scannerData, currentStatus, nextStatus) {
    const role = scannerData.scanned_by_role;
    const scannerId = scannerData.scanned_by_id;

    if (!order.source_transporter_id || !order.destination_transporter_id) {
      throw new Error('Transporters must be assigned before QR status updates');
    }

    if (role === 'transporter') {
      if (!scannerId) throw new Error('Transporter scanner identity missing');

      if (scannerId !== order.source_transporter_id && scannerId !== order.destination_transporter_id) {
        throw new Error('Only assigned source or destination transporter can scan this QR');
      }

      const requiredTransporterId = this.getRequiredTransporterForTransition(order, currentStatus);
      if (!requiredTransporterId || scannerId !== requiredTransporterId) {
        throw new Error(`Only the assigned ${requiredTransporterId === order.source_transporter_id ? 'source' : 'destination'} transporter can perform this scan`);
      }

      if (currentStatus === 'SHIPPED' && !order.permanent_vehicle_id && !order.temp_vehicle_id) {
        throw new Error('Assign a vehicle before scanning to IN_TRANSIT');
      }

      if (currentStatus === 'RECEIVED') {
        if (!order.delivery_person_id) {
          throw new Error('Assign destination delivery person before scanning to OUT_FOR_DELIVERY');
        }

        const deliveryPerson = await DeliveryPerson.findByPk(order.delivery_person_id);
        if (!deliveryPerson || deliveryPerson.transporter_id !== order.destination_transporter_id) {
          throw new Error('Order must be assigned to a destination transporter delivery person before OUT_FOR_DELIVERY');
        }
      }

      return;
    }

    if (role === 'delivery') {
      if (currentStatus !== 'OUT_FOR_DELIVERY' || nextStatus !== 'COMPLETED') {
        throw new Error('Delivery person can scan only at final customer delivery step');
      }

      if (!order.delivery_person_id || scannerId !== order.delivery_person_id) {
        throw new Error('Only assigned destination delivery person can complete this order');
      }

      const deliveryPerson = await DeliveryPerson.findByPk(order.delivery_person_id);
      if (!deliveryPerson || deliveryPerson.transporter_id !== order.destination_transporter_id) {
        throw new Error('Pickup delivery person is not allowed to scan this QR');
      }

      return;
    }

    throw new Error('Only assigned transporter or destination delivery person can scan QR');
  }
  
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

      const nextStatus = this.getNextStatus(order.current_status);
      if (!nextStatus) throw new Error('QR scan not allowed for current order status');

      await this.validateScannerPermission(order, scannerData, order.current_status, nextStatus);

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

  static async scanOrderById(orderId, requestedStatus, scannerData) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error('Order not found');

    if (!order.qr_code) {
      throw new Error('QR code is not available for this order');
    }

    const nextStatus = this.getNextStatus(order.current_status);
    if (!nextStatus) throw new Error('QR scan not allowed for current order status');

    if (requestedStatus && requestedStatus !== nextStatus) {
      throw new Error(`Invalid QR transition. Expected next status: ${nextStatus}`);
    }

    await this.validateScannerPermission(order, scannerData, order.current_status, nextStatus);

    await this.updateOrderStatus(order.order_id, nextStatus, {
      qr_code: order.qr_code,
      ...scannerData
    });

    return {
      success: true,
      order_id: order.order_id,
      previous_status: order.current_status,
      new_status: nextStatus
    };
  }
}

module.exports = OrderTrackingService;