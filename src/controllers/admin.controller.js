const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const Transaction = require('../models/transaction.model');
const CustomerReturnRequest = require('../models/customerReturnRequest.model');
const RazorpayService = require('../services/razorpay.service');
const { generateVerificationCode } = require('../utils/sms.util');

const parseAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const createTxn = async (payload) => {
  try {
    return await Transaction.create(payload);
  } catch (error) {
    console.error('[AdminReturnReview] Transaction create failed:', error.message);
    return null;
  }
};

const settleOrderPayoutsIfNeeded = async (order) => {
  const payoutTypes = ['farmer', 'transporter', 'admin'];
  const existing = await Transaction.findAll({
    where: {
      order_id: order.order_id,
      user_type: payoutTypes,
      status: 'completed',
    },
  });

  if (existing.length > 0) {
    return {
      skipped: true,
      reason: 'Payout transactions already exist',
      count: existing.length,
    };
  }

  const payoutResult = {
    skipped: false,
    farmer: null,
    source_transporter: null,
    destination_transporter: null,
    admin_commission: null,
  };

  const farmer = await FarmerUser.findByPk(order.product?.farmer_id || null);
  if (farmer) {
    const farmerAmount = parseAmount(order.farmer_amount);
    if (farmer.account_number && farmer.ifsc_code && farmerAmount > 0) {
      const transfer = await RazorpayService.transferFunds({
        account_number: farmer.account_number,
        ifsc_code: farmer.ifsc_code,
        amount: farmerAmount,
        purpose: 'Order payout - farmer settlement',
        reference: `order_${order.order_id}_farmer_admin_review`,
      });

      await createTxn({
        farmer_id: farmer.farmer_id,
        user_type: 'farmer',
        user_id: farmer.farmer_id,
        order_id: order.order_id,
        amount: farmerAmount,
        type: 'credit',
        status: transfer.success ? 'completed' : 'failed',
        description: `Farmer payout after admin review for order #${order.order_id}`,
      });

      payoutResult.farmer = {
        transferred: !!transfer.success,
        amount: farmerAmount,
      };
    }
  }

  const transportHalf = parseAmount(order.transport_charge) / 2;
  if (transportHalf > 0) {
    const sourceTransporter = await TransporterUser.findByPk(order.source_transporter_id || null);
    if (sourceTransporter?.account_number && sourceTransporter?.ifsc_code) {
      const transfer = await RazorpayService.transferFunds({
        account_number: sourceTransporter.account_number,
        ifsc_code: sourceTransporter.ifsc_code,
        amount: transportHalf,
        purpose: 'Order payout - source transport settlement',
        reference: `order_${order.order_id}_source_transport_admin_review`,
      });

      await createTxn({
        user_type: 'transporter',
        user_id: sourceTransporter.transporter_id,
        order_id: order.order_id,
        amount: transportHalf,
        type: 'credit',
        status: transfer.success ? 'completed' : 'failed',
        description: `Source transporter payout after admin review for order #${order.order_id}`,
      });

      payoutResult.source_transporter = {
        transferred: !!transfer.success,
        amount: transportHalf,
      };
    }

    const destinationTransporter = await TransporterUser.findByPk(order.destination_transporter_id || null);
    if (destinationTransporter?.account_number && destinationTransporter?.ifsc_code) {
      const transfer = await RazorpayService.transferFunds({
        account_number: destinationTransporter.account_number,
        ifsc_code: destinationTransporter.ifsc_code,
        amount: transportHalf,
        purpose: 'Order payout - destination transport settlement',
        reference: `order_${order.order_id}_destination_transport_admin_review`,
      });

      await createTxn({
        user_type: 'transporter',
        user_id: destinationTransporter.transporter_id,
        order_id: order.order_id,
        amount: transportHalf,
        type: 'credit',
        status: transfer.success ? 'completed' : 'failed',
        description: `Destination transporter payout after admin review for order #${order.order_id}`,
      });

      payoutResult.destination_transporter = {
        transferred: !!transfer.success,
        amount: transportHalf,
      };
    }
  }

  const adminCommission = parseAmount(order.admin_commission);
  if (adminCommission > 0) {
    await createTxn({
      user_type: 'admin',
      user_id: 1,
      order_id: order.order_id,
      amount: adminCommission,
      type: 'commission',
      status: 'completed',
      description: `Admin commission retained for order #${order.order_id}`,
    });

    payoutResult.admin_commission = {
      retained: true,
      amount: adminCommission,
    };
  }

  return payoutResult;
};

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await AdminUser.findByPk(req.user.admin_id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Error fetching admin profile' });
  }
};

exports.getPendingFarmers = async (req, res) => {
  try {
    const pendingFarmers = await FarmerUser.findAll({
      where: { is_verified_by_gov: false },
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: pendingFarmers.length,
      data: pendingFarmers
    });
  } catch (error) {
    console.error('Error fetching pending farmers:', error);
    res.status(500).json({ message: 'Error fetching pending farmers' });
  }
};

exports.getVerifiedFarmers = async (req, res) => {
  try {
    const verifiedFarmers = await FarmerUser.findAll({
      where: { is_verified_by_gov: true },
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: verifiedFarmers.length,
      data: verifiedFarmers
    });
  } catch (error) {
    console.error('Error fetching verified farmers:', error);
    res.status(500).json({ message: 'Error fetching verified farmers' });
  }
};

exports.approveFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_notes } = req.body;

    const farmer = await FarmerUser.findByPk(id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (farmer.is_verified_by_gov) {
      return res.status(400).json({ message: 'Farmer is already verified' });
    }

    const global_farmer_id = generateVerificationCode();
    const unique_id = generateVerificationCode();
    
    await farmer.update({
      is_verified_by_gov: true,
      unique_id: unique_id,
      global_farmer_id: global_farmer_id,
      verification_status: 'approved',
      verification_completed_at: new Date(),
      verification_notes: verification_notes || null
    });

    res.json({
      success: true,
      message: 'Farmer approved successfully. Verification code generated.',
      data: {
        farmer_id: farmer.farmer_id,
        name: farmer.name,
        email: farmer.email,
        mobile_number: farmer.mobile_number,
        global_farmer_id: global_farmer_id,
        unique_id: unique_id
      }
    });
  } catch (error) {
    console.error('Error approving farmer:', error);
    res.status(500).json({ message: 'Error approving farmer' });
  }
};

exports.getPendingTransporters = async (req, res) => {
  try {
    const pendingTransporters = await TransporterUser.findAll({
      where: { verified_status: 'pending' },
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: pendingTransporters.length,
      data: pendingTransporters
    });
  } catch (error) {
    console.error('Error fetching pending transporters:', error);
    res.status(500).json({ message: 'Error fetching pending transporters' });
  }
};

exports.approveTransporter = async (req, res) => {
  try {
    const { transporter_id } = req.params;
    const { approval_notes } = req.body;

    const transporter = await TransporterUser.findByPk(transporter_id);
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    if (transporter.verified_status === 'verified') {
      return res.status(400).json({ message: 'Transporter is already verified' });
    }

    const unique_id = generateVerificationCode();
    
    await transporter.update({
      verified_status: 'verified',
      unique_id: unique_id,
      approved_at: new Date(),
      approval_notes: approval_notes || null
    });

    res.json({
      success: true,
      message: 'Transporter approved successfully.',
      data: {
        transporter_id: transporter.transporter_id,
        name: transporter.name,
        email: transporter.email,
        mobile_number: transporter.mobile_number,
        unique_id: unique_id
      }
    });
  } catch (error) {
    console.error('Error approving transporter:', error);
    res.status(500).json({ message: 'Error approving transporter' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalFarmers,
      pendingFarmers,
      verifiedFarmers,
      totalCustomers,
      totalTransporters,
      totalOrders
    ] = await Promise.all([
      FarmerUser.count(),
      FarmerUser.count({ where: { is_verified_by_gov: false } }),
      FarmerUser.count({ where: { is_verified_by_gov: true } }),
      CustomerUser.count(),
      TransporterUser.count(),
      Order.count()
    ]);

    res.json({
      success: true,
      data: {
        total_farmers: totalFarmers,
        pending_farmers: pendingFarmers,
        verified_farmers: verifiedFarmers,
        total_customers: totalCustomers,
        total_transporters: totalTransporters,
        total_orders: totalOrders
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
};

exports.getAllFarmers = async (req, res) => {
  try {
    const farmers = await FarmerUser.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    
    const farmersWithStats = await Promise.all(farmers.map(async (farmer) => {
      const productCount = await Product.count({
        where: { farmer_id: farmer.farmer_id }
      });
      
      const orders = await Order.findAll({
        include: [{
          model: Product,
          where: { farmer_id: farmer.farmer_id },
          attributes: []
        }],
        attributes: ['order_id', 'current_status', 'farmer_amount']
      });
      
      const totalOrders = orders.length;
      const totalEarnings = orders
        .filter(order => order.current_status === 'COMPLETED')
        .reduce((sum, order) => sum + parseFloat(order.farmer_amount || 0), 0);
      
      const { products, ...farmerData } = farmer.toJSON();
      return {
        ...farmerData,
        product_count: productCount,
        order_count: totalOrders,
        total_earnings: totalEarnings
      };
    }));
    
    res.json({ success: true, count: farmersWithStats.length, data: farmersWithStats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching farmers' });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await CustomerUser.findAll({
      attributes: { exclude: ['password'] },
      include: [{
        model: Order,
        as: 'orders',
        attributes: ['order_id', 'current_status', 'total_price']
      }],
      order: [['created_at', 'DESC']]
    });
    
    const customersWithStats = customers.map(customer => {
      const orders = customer.orders || [];
      const totalOrders = orders.length;
      const completedOrders = orders.filter(order => order.current_status === 'COMPLETED').length;
      const activeOrders = orders.filter(order => 
        ['PENDING', 'PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'REACHED_DESTINATION', 'OUT_FOR_DELIVERY'].includes(order.current_status)
      ).length;
      const totalSpent = orders
        .filter(order => order.current_status === 'COMPLETED')
        .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
      
      return {
        ...customer.toJSON(),
        order_stats: {
          total_orders: totalOrders,
          completed_orders: completedOrders,
          active_orders: activeOrders,
          total_spent: totalSpent
        }
      };
    });
    
    res.json({ success: true, count: customersWithStats.length, data: customersWithStats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers' });
  }
};

exports.getAllTransporters = async (req, res) => {
  try {
    const Transaction = require('../models/transaction.model');
    const { Op } = require('sequelize');
    
    const transporters = await TransporterUser.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    
    const transportersWithStats = await Promise.all(transporters.map(async (transporter) => {
      const sourceOrders = await Order.count({
        where: { source_transporter_id: transporter.transporter_id }
      });
      
      const destOrders = await Order.count({
        where: { destination_transporter_id: transporter.transporter_id }
      });
      
      const transactions = await Transaction.findAll({
        where: {
          user_type: 'transporter',
          user_id: transporter.transporter_id,
          status: 'completed'
        }
      });
      
      const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      return {
        ...transporter.toJSON(),
        order_stats: {
          total_orders: sourceOrders + destOrders,
          source_orders: sourceOrders,
          destination_orders: destOrders,
          total_amount_received: totalAmount
        }
      };
    }));
    
    res.json({ success: true, count: transportersWithStats.length, data: transportersWithStats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transporters' });
  }
};

exports.getAllDeliveryPersons = async (req, res) => {
  try {
    const Transaction = require('../models/transaction.model');
    
    const deliveryPersons = await DeliveryPerson.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    
    const deliveryPersonsWithStats = await Promise.all(deliveryPersons.map(async (person) => {
      const totalOrders = await Order.count({
        where: { delivery_person_id: person.delivery_person_id }
      });
      
      const transactions = await Transaction.findAll({
        where: {
          user_type: 'delivery_person',
          user_id: person.delivery_person_id,
          status: 'completed'
        }
      });
      
      const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      return {
        ...person.toJSON(),
        is_available: person.is_available !== undefined ? person.is_available : true,
        order_stats: {
          total_orders: totalOrders,
          total_amount_received: totalAmount
        }
      };
    }));
    
    res.json({ success: true, count: deliveryPersonsWithStats.length, data: deliveryPersonsWithStats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching delivery persons' });
  }
};

exports.getFarmerById = async (req, res) => {
  try {
    const { id } = req.params;
    const farmer = await FarmerUser.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.json({
      success: true,
      data: farmer
    });
  } catch (error) {
    console.error('Error fetching farmer:', error);
    res.status(500).json({ message: 'Error fetching farmer' });
  }
};

exports.deleteFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await FarmerUser.destroy({ where: { farmer_id: id } });
    if (!deleted) return res.status(404).json({ message: 'Farmer not found' });
    res.json({ success: true, message: 'Farmer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting farmer' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CustomerUser.destroy({ where: { customer_id: id } });
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting customer' });
  }
};

exports.deleteTransporter = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TransporterUser.destroy({ where: { transporter_id: id } });
    if (!deleted) return res.status(404).json({ message: 'Transporter not found' });
    res.json({ success: true, message: 'Transporter deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting transporter' });
  }
};

exports.deleteDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DeliveryPerson.destroy({ where: { delivery_person_id: id } });
    if (!deleted) return res.status(404).json({ message: 'Delivery person not found' });
    res.json({ success: true, message: 'Delivery person deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting delivery person' });
  }
};


exports.getCustomerOrders = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const ProductImage = require('../models/productImage.model');
    
    const orders = await Order.findAll({
      where: { customer_id },
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price', 'description', 'category', 'quantity', 'status'],
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_id', 'image_url', 'is_primary']
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: { exclude: ['password'] }
            }
          ]
        },
        {
          model: CustomerUser,
          as: 'customer',
          attributes: { exclude: ['password'] }
        },
        {
          model: TransporterUser,
          as: 'source_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'image_url']
        },
        {
          model: TransporterUser,
          as: 'destination_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'image_url']
        },
        {
          model: DeliveryPerson,
          as: 'delivery_person',
          attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_number', 'vehicle_type', 'image_url', 'transporter_id']
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
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ message: 'Error fetching customer orders' });
  }
};

exports.getTransporterOrders = async (req, res) => {
  try {
    const { transporter_id } = req.params;
    const ProductImage = require('../models/productImage.model');
    const { Op } = require('sequelize');
    
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { source_transporter_id: transporter_id },
          { destination_transporter_id: transporter_id }
        ]
      },
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price', 'description', 'category'],
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_id', 'image_url', 'is_primary']
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: { exclude: ['password'] }
            }
          ]
        },
        {
          model: CustomerUser,
          as: 'customer',
          attributes: { exclude: ['password'] }
        },
        {
          model: TransporterUser,
          as: 'source_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'image_url']
        },
        {
          model: TransporterUser,
          as: 'destination_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'image_url']
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
    console.error('Error fetching transporter orders:', error);
    res.status(500).json({ message: 'Error fetching transporter orders' });
  }
};

exports.getDeliveryPersonOrders = async (req, res) => {
  try {
    const { delivery_person_id } = req.params;
    const ProductImage = require('../models/productImage.model');
    
    const orders = await Order.findAll({
      where: { delivery_person_id },
      include: [
        {
          model: Product,
          attributes: ['product_id', 'name', 'current_price', 'description', 'category'],
          include: [
            {
              model: ProductImage,
              as: 'images',
              attributes: ['image_id', 'image_url', 'is_primary']
            },
            {
              model: FarmerUser,
              as: 'farmer',
              attributes: { exclude: ['password'] }
            }
          ]
        },
        {
          model: CustomerUser,
          as: 'customer',
          attributes: { exclude: ['password'] }
        },
        {
          model: DeliveryPerson,
          as: 'delivery_person',
          attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_number', 'vehicle_type', 'image_url']
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
    console.error('Error fetching delivery person orders:', error);
    res.status(500).json({ message: 'Error fetching delivery person orders' });
  }
};

exports.getFarmerProducts = async (req, res) => {
  try {
    const { farmer_id } = req.params;
    const ProductImage = require('../models/productImage.model');
    
    const products = await Product.findAll({
      where: { farmer_id },
      include: [{
        model: ProductImage,
        as: 'images',
        attributes: ['image_id', 'image_url', 'is_primary']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching farmer products:', error);
    res.status(500).json({ message: 'Error fetching farmer products' });
  }
};

exports.getFarmerOrders = async (req, res) => {
  try {
    const { farmer_id } = req.params;
    const ProductImage = require('../models/productImage.model');
    
    const orders = await Order.findAll({
      include: [
        {
          model: Product,
          where: { farmer_id },
          attributes: ['product_id', 'name', 'current_price', 'description', 'category'],
          include: [{
            model: ProductImage,
            as: 'images',
            attributes: ['image_id', 'image_url', 'is_primary']
          }]
        },
        {
          model: CustomerUser,
          as: 'customer',
          attributes: { exclude: ['password'] }
        },
        {
          model: TransporterUser,
          as: 'source_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'image_url']
        },
        {
          model: TransporterUser,
          as: 'destination_transporter',
          attributes: ['transporter_id', 'name', 'mobile_number', 'address', 'zone', 'image_url']
        },
        {
          model: DeliveryPerson,
          as: 'delivery_person',
          attributes: ['delivery_person_id', 'name', 'mobile_number', 'vehicle_number', 'vehicle_type', 'image_url']
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
    console.error('Error fetching farmer orders:', error);
    res.status(500).json({ message: 'Error fetching farmer orders' });
  }
};


exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await CustomerUser.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ message: 'Error fetching customer' });
  }
};

exports.getTransporterById = async (req, res) => {
  try {
    const { id } = req.params;
    const transporter = await TransporterUser.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    if (!transporter) return res.status(404).json({ message: 'Transporter not found' });
    res.json({ success: true, data: transporter });
  } catch (error) {
    console.error('Error fetching transporter:', error);
    res.status(500).json({ message: 'Error fetching transporter' });
  }
};

exports.getDeliveryPersonById = async (req, res) => {
  try {
    const { id } = req.params;
    const person = await DeliveryPerson.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    if (!person) return res.status(404).json({ message: 'Delivery person not found' });
    res.json({ success: true, data: person });
  } catch (error) {
    console.error('Error fetching delivery person:', error);
    res.status(500).json({ message: 'Error fetching delivery person' });
  }
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [farmersActiveToday, lowStockFarmers, newCustomersWeek, delayedDelivery] = await Promise.all([
      Order.count({
        distinct: true,
        col: 'product.farmer_id',
        include: [{
          model: Product,
          attributes: [],
          where: { farmer_id: { [Op.ne]: null } }
        }],
        where: {
          created_at: { [Op.gte]: today }
        }
      }),
      Product.count({
        where: {
          quantity: { [Op.lte]: 10 },
          status: 'available'
        }
      }),
      CustomerUser.count({
        where: {
          created_at: { [Op.gte]: weekAgo }
        }
      }),
      Order.count({
        where: {
          current_status: { [Op.in]: ['PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT'] },
          estimated_delivery_time: { [Op.lt]: new Date() }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        farmersActiveToday,
        lowStockFarmers,
        newCustomersWeek,
        delayedDelivery
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ message: 'Error fetching dashboard metrics' });
  }
};

exports.getReturnRequests = async (req, res) => {
  try {
    const rows = await CustomerReturnRequest.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Product,
              attributes: ['product_id', 'name', 'current_price', 'farmer_id'],
            },
            {
              model: CustomerUser,
              as: 'customer',
              attributes: ['customer_id', 'name', 'email', 'mobile_number'],
            },
          ],
        },
      ],
      order: [['submitted_at', 'DESC']],
    });

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('[AdminReturnReview] getReturnRequests error:', error);
    res.status(500).json({ message: 'Error fetching return requests' });
  }
};

exports.getReturnRequestByOrder = async (req, res) => {
  try {
    const orderId = Number(req.params.order_id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Valid order_id is required' });
    }

    const row = await CustomerReturnRequest.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Product,
              attributes: ['product_id', 'name', 'current_price', 'farmer_id'],
            },
            {
              model: CustomerUser,
              as: 'customer',
              attributes: ['customer_id', 'name', 'email', 'mobile_number'],
            },
          ],
        },
      ],
    });

    if (!row) {
      return res.status(404).json({ message: 'No return request found for this order' });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    console.error('[AdminReturnReview] getReturnRequestByOrder error:', error);
    res.status(500).json({ message: 'Error fetching return request' });
  }
};

exports.reviewReturnRequest = async (req, res) => {
  try {
    const returnRequestId = Number(req.params.return_request_id);
    const decision = String(req.body.decision || '').trim().toUpperCase();
    const adminNotes = String(req.body.notes || '').trim();

    if (!Number.isInteger(returnRequestId) || returnRequestId <= 0) {
      return res.status(400).json({ message: 'Valid return_request_id is required' });
    }

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be APPROVE or REJECT' });
    }

    const returnRequest = await CustomerReturnRequest.findByPk(returnRequestId, {
      include: [
        {
          model: Order,
          as: 'order',
          include: [{ model: Product, attributes: ['product_id', 'farmer_id', 'name'] }],
        },
      ],
    });

    if (!returnRequest) {
      return res.status(404).json({ message: 'Return request not found' });
    }

    const order = returnRequest.order;
    if (!order) {
      return res.status(400).json({ message: 'Order not found for this return request' });
    }

    if (decision === 'REJECT') {
      const payoutResult = await settleOrderPayoutsIfNeeded(order);

      await returnRequest.update({
        status: 'REJECTED',
        admin_review_status: 'REJECTED',
        admin_review_notes: adminNotes || null,
        reviewed_by_admin_id: req.user?.admin_id || null,
        reviewed_at: new Date(),
        payment_release_status: 'PAYOUT_RELEASED',
      });

      await order.update({
        current_status: order.current_status === 'COMPLETED' ? order.current_status : 'COMPLETED',
        payment_status: 'completed',
      });

      return res.json({
        success: true,
        message: 'Return proof rejected. Order payout flow released to stakeholders.',
        data: {
          return_request_id: returnRequest.return_request_id,
          order_id: order.order_id,
          review_status: 'REJECTED',
          payout_result: payoutResult,
        },
      });
    }

    await returnRequest.update({
      status: 'APPROVED',
      admin_review_status: 'APPROVED',
      admin_review_notes: adminNotes || null,
      reviewed_by_admin_id: req.user?.admin_id || null,
      reviewed_at: new Date(),
      payment_release_status: 'AWAITING_PACKAGE_RECEIPT',
    });

    await order.update({ payment_status: 'pending' });

    return res.json({
      success: true,
      message: 'Return proof approved. Customer refund will be processed after package receipt confirmation.',
      data: {
        return_request_id: returnRequest.return_request_id,
        order_id: order.order_id,
        review_status: 'APPROVED',
        next_step: 'MARK_PACKAGE_RECEIVED',
      },
    });
  } catch (error) {
    console.error('[AdminReturnReview] reviewReturnRequest error:', error);
    res.status(500).json({ message: 'Error reviewing return request' });
  }
};

exports.confirmReturnedPackageReceived = async (req, res) => {
  try {
    const returnRequestId = Number(req.params.return_request_id);
    const refundReference = String(req.body.refund_reference || '').trim();

    if (!Number.isInteger(returnRequestId) || returnRequestId <= 0) {
      return res.status(400).json({ message: 'Valid return_request_id is required' });
    }

    const returnRequest = await CustomerReturnRequest.findByPk(returnRequestId, {
      include: [{ model: Order, as: 'order' }],
    });

    if (!returnRequest) {
      return res.status(404).json({ message: 'Return request not found' });
    }

    if (returnRequest.admin_review_status !== 'APPROVED') {
      return res.status(400).json({ message: 'Package receipt can be marked only after admin approval' });
    }

    const order = returnRequest.order;
    if (!order) {
      return res.status(400).json({ message: 'Order not found for this return request' });
    }

    const refundAmount = parseAmount(order.total_price);
    const existingRefund = await Transaction.findOne({
      where: {
        order_id: order.order_id,
        user_type: 'customer',
        type: 'refund',
        status: 'completed',
      },
    });

    if (!existingRefund && refundAmount > 0) {
      await createTxn({
        user_type: 'customer',
        user_id: order.customer_id,
        order_id: order.order_id,
        amount: refundAmount,
        type: 'refund',
        status: 'completed',
        description: `Customer refund processed after return package receipt for order #${order.order_id}`,
      });
    }

    await returnRequest.update({
      status: 'COMPLETED',
      payment_release_status: 'REFUND_COMPLETED',
      package_received_from_customer_at: new Date(),
      refund_processed_at: new Date(),
      refund_reference: refundReference || null,
    });

    await order.update({ payment_status: 'failed' });

    res.json({
      success: true,
      message: 'Package receipt confirmed and customer refund marked as completed.',
      data: {
        return_request_id: returnRequest.return_request_id,
        order_id: order.order_id,
        refund_amount: refundAmount,
        refund_reference: refundReference || null,
      },
    });
  } catch (error) {
    console.error('[AdminReturnReview] confirmReturnedPackageReceived error:', error);
    res.status(500).json({ message: 'Error confirming package receipt for return request' });
  }
};
