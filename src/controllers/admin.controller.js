const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { generateVerificationCode } = require('../utils/sms.util');

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
    
    await farmer.update({
      is_verified_by_gov: true,
      global_farmer_id: global_farmer_id,
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
        global_farmer_id: global_farmer_id
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
      where: { verified_status: false, rejected_at: null },
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

    if (transporter.verified_status) {
      return res.status(400).json({ message: 'Transporter is already verified' });
    }

    const unique_id = generateVerificationCode();
    
    await transporter.update({
      verified_status: true,
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
      include: [{
        model: Product,
        as: 'products',
        include: [{
          model: Order,
          attributes: ['order_id', 'current_status', 'farmer_amount']
        }]
      }],
      order: [['created_at', 'DESC']]
    });
    
    const farmersWithStats = farmers.map(farmer => {
      const allOrders = farmer.products.flatMap(product => product.Orders || []);
      const totalOrders = allOrders.length;
      const completedOrders = allOrders.filter(order => order.current_status === 'COMPLETED').length;
      const activeOrders = allOrders.filter(order => 
        ['PENDING', 'PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY'].includes(order.current_status)
      ).length;
      const totalRevenue = allOrders
        .filter(order => order.current_status === 'COMPLETED')
        .reduce((sum, order) => sum + parseFloat(order.farmer_amount || 0), 0);
      
      return {
        ...farmer.toJSON(),
        order_stats: {
          total_orders: totalOrders,
          completed_orders: completedOrders,
          active_orders: activeOrders,
          total_revenue: totalRevenue
        }
      };
    });
    
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
        ['PENDING', 'PLACED', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'OUT_FOR_DELIVERY'].includes(order.current_status)
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
              attributes: ['image_id', 'image_url', 'is_primary', 'display_order']
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
              attributes: ['image_id', 'image_url', 'is_primary', 'display_order']
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
              attributes: ['image_id', 'image_url', 'is_primary', 'display_order']
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
