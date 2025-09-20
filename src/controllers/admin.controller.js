const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Transaction = require('../models/transaction.model');
const Wishlist = require('../models/wishlist.model');
const PermanentVehicle = require('../models/permanentVehicle.model');
const TemporaryVehicle = require('../models/temporaryVehicle.model');
const { generateVerificationCode } = require('../utils/sms.util');
const { validationResult } = require('express-validator');

// Helper to get model by role
const getModelByRole = (role) => {
  if (role === 'farmer') return FarmerUser;
  if (role === 'customer') return CustomerUser;
  if (role === 'transporter') return TransporterUser;
  if (role === 'admin') return AdminUser;
  return null;
};

// ==================== USER MANAGEMENT FUNCTIONS ====================

// Get admin profile
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

// Update admin profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, mobile_number } = req.body;
    
    // Check if email is already taken by another admin
    if (email && email !== req.user.email) {
      const existingAdmin = await AdminUser.findOne({ 
        where: { 
          email,
          admin_id: { [require('sequelize').Op.ne]: req.user.admin_id }
        }
      });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const admin = await AdminUser.findByPk(req.user.admin_id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update admin fields
    await admin.update({
      name: name || admin.name,
      email: email || admin.email,
      mobile_number: mobile_number || admin.mobile_number
    });

    res.json({
      success: true,
      message: 'Admin profile updated successfully',
      data: {
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        mobile_number: admin.mobile_number,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ message: 'Error updating admin profile' });
  }
};

// Get all users by role (admin function)
exports.getAllUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const offset = (page - 1) * limit;
    const whereClause = {};
    
    // Add search functionality
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { name: { [require('sequelize').Op.like]: `%${search}%` } },
        { email: { [require('sequelize').Op.like]: `%${search}%` } },
        { mobile_number: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Model.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get specific user details (admin function)
exports.getUserDetails = async (req, res) => {
  try {
    const { role, user_id } = req.params;
    
    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const idField = role === 'farmer' ? 'id' : 
                   role === 'customer' ? 'id' : 
                   role === 'transporter' ? 'transporter_id' : 
                   'admin_id';

    const user = await Model.findByPk(user_id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Error fetching user details' });
  }
};

// Update user status (admin function)
exports.updateUserStatus = async (req, res) => {
  try {
    const { role, user_id } = req.params;
    const { is_active, notes } = req.body;
    
    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const idField = role === 'farmer' ? 'id' : 
                   role === 'customer' ? 'id' : 
                   role === 'transporter' ? 'transporter_id' : 
                   'admin_id';

    const user = await Model.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user status
    const updateData = {};
    if (role === 'admin') {
      updateData.is_active = is_active;
    } else if (role === 'farmer') {
      updateData.verified_status = is_active;
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: `User status updated successfully`,
      data: {
        user_id: user[idField],
        status_updated: true
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
};

// Create new admin user (super admin only)
exports.createAdminUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if current admin is super_admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can create new admin users' });
    }

    const { name, email, password, mobile_number, role: adminRole } = req.body;
    
    // Validate admin role
    const validAdminRoles = ['super_admin', 'admin', 'moderator'];
    if (adminRole && !validAdminRoles.includes(adminRole)) {
      return res.status(400).json({ message: 'Invalid admin role specified' });
    }

    // Check if email already exists
    const existingAdmin = await AdminUser.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    // Create new admin
    const newAdmin = await AdminUser.create({
      name,
      email,
      password,
      mobile_number,
      role: adminRole || 'admin',
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        admin_id: newAdmin.admin_id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        is_active: newAdmin.is_active
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
};

// ==================== EXISTING FARMER MANAGEMENT FUNCTIONS ====================

// Get all pending farmers for admin review
exports.getPendingFarmers = async (req, res) => {
  try {
    const pendingFarmers = await FarmerUser.findAll({
      where: { verified_status: false },
      attributes: [
        'id', 'name', 'email', 'mobile_number', 'address', 
        'zone', 'state', 'district', 'age', 'account_number', 
        'ifsc_code', 'image_url', 'created_at'
      ],
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

// Get all verified farmers
exports.getVerifiedFarmers = async (req, res) => {
  try {
    const verifiedFarmers = await FarmerUser.findAll({
      where: { verified_status: true },
      attributes: [
        'id', 'name', 'email', 'mobile_number', 'address', 
        'zone', 'state', 'district', 'age', 'account_number', 
        'ifsc_code', 'image_url', 'unique_id', 'created_at'
      ],
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

// Approve a farmer and generate verification code
exports.approveFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;

    // Debug log for id
    console.log('Approving farmer with id:', id, 'type:', typeof id);

    // Check if id is a valid number
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: 'Invalid farmer id' });
    }

    // Use findOne with explicit where clause to avoid type issues
    const farmer = await FarmerUser.findOne({ where: { id: Number(id) } });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (farmer.verified_status) {
      return res.status(400).json({ message: 'Farmer is already verified' });
    }

    // Generate a 6-digit verification code
    const unique_id = generateVerificationCode();
    
    // Update farmer's record
    await farmer.update({
      verified_status: true,
      unique_id: unique_id,
      approved_at: new Date(),
      approval_notes: approval_notes || null
    });

    // Send verification code via SMS
    const { sendVerificationCodeSMS, sendApprovalNotificationSMS } = require('../utils/sms.util');
    const smsSent = await sendVerificationCodeSMS(farmer.mobile_number, unique_id);
    const notificationSent = await sendApprovalNotificationSMS(farmer.mobile_number, farmer.name);
    
    if (!smsSent) {
      // Even if SMS fails, farmer is still approved
      console.warn(`Farmer approved but SMS failed to send: ${farmer.mobile_number}`);
    }

    res.json({
      success: true,
      message: 'Farmer approved successfully. Verification code sent to mobile number.',
      data: {
        id: farmer.id,
        name: farmer.name,
        email: farmer.email,
        mobile_number: farmer.mobile_number,
        unique_id: unique_id,
        sms_sent: smsSent,
        notification_sent: notificationSent
      }
    });
  } catch (error) {
    console.error('Error approving farmer:', error);
    res.status(500).json({ message: 'Error approving farmer' });
  }
};

// Reject a farmer
exports.rejectFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const farmer = await FarmerUser.findByPk(id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (farmer.verified_status) {
      return res.status(400).json({ message: 'Cannot reject an already verified farmer' });
    }

    // Update farmer's record with rejection details
    await farmer.update({
      verified_status: false,
      rejected_at: new Date(),
      rejection_reason: rejection_reason
    });

    // Send rejection notification via SMS
    const { sendRejectionNotificationSMS } = require('../utils/sms.util');
    const smsSent = await sendRejectionNotificationSMS(farmer.mobile_number, farmer.name, rejection_reason);

    res.json({
      success: true,
      message: 'Farmer rejected successfully',
      data: {
        id: farmer.id,
        name: farmer.name,
        email: farmer.email,
        mobile_number: farmer.mobile_number,
        rejection_reason: rejection_reason,
        sms_sent: smsSent
      }
    });
  } catch (error) {
    console.error('Error rejecting farmer:', error);
    res.status(500).json({ message: 'Error rejecting farmer' });
  }
};

// Resend verification code to approved farmer
exports.resendVerificationCode = async (req, res) => {
  try {
    const { id } = req.params;

    const farmer = await FarmerUser.findByPk(id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (!farmer.verified_status) {
      return res.status(400).json({ message: 'Farmer must be approved first' });
    }

    // Generate a new 6-digit verification code
    const new_unique_id = generateVerificationCode();
    
    // Update farmer's record with new code
    await farmer.update({
      unique_id: new_unique_id,
      code_updated_at: new Date()
    });

    // Send new verification code via SMS
    const { sendVerificationCodeSMS } = require('../utils/sms.util');
    const smsSent = await sendVerificationCodeSMS(farmer.mobile_number, new_unique_id);
    
    if (!smsSent) {
      return res.status(500).json({ message: 'Error sending verification code SMS' });
    }

    res.json({
      success: true,
      message: 'New verification code sent to farmer mobile number.',
      data: {
        id: farmer.id,
        name: farmer.name,
        email: farmer.email,
        mobile_number: farmer.mobile_number,
        unique_id: new_unique_id
      }
    });
  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({ message: 'Error resending verification code' });
  }
};

// Get farmer verification status
exports.getFarmerVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const farmer = await FarmerUser.findByPk(id, {
      attributes: [
        'id', 'name', 'email', 'mobile_number', 'verified_status', 'unique_id',
        'approved_at', 'approval_notes', 'rejected_at', 'rejection_reason',
        'code_updated_at', 'created_at'
      ]
    });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.json({
      success: true,
      data: farmer
    });
  } catch (error) {
    console.error('Error fetching farmer verification status:', error);
    res.status(500).json({ message: 'Error fetching farmer verification status' });
  }
};

// Get admin dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalFarmers,
      pendingFarmers,
      verifiedFarmers,
      totalCustomers,
      totalTransporters
    ] = await Promise.all([
      FarmerUser.count(),
      FarmerUser.count({ where: { verified_status: false } }),
      FarmerUser.count({ where: { verified_status: true } }),
      CustomerUser.count(),
      TransporterUser.count()
    ]);

    res.json({
      success: true,
      data: {
        total_farmers: totalFarmers,
        pending_farmers: pendingFarmers,
        verified_farmers: verifiedFarmers,
        total_customers: totalCustomers,
        total_transporters: totalTransporters
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
};

// Legacy function - kept for backward compatibility
exports.sendFarmerCode = async (req, res) => {
  try {
    const { mobile_number } = req.body;
    const farmer = await FarmerUser.findOne({ where: { mobile_number } });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    
    if (!farmer.verified_status) {
      return res.status(400).json({ message: 'Farmer must be approved first' });
    }

    // Generate a 6-digit code
    const unique_id = generateVerificationCode();
    // Update farmer's record
    farmer.unique_id = unique_id;
    await farmer.save();
    // Send code via SMS
    const { sendVerificationCodeSMS } = require('../utils/sms.util');
    const smsSent = await sendVerificationCodeSMS(mobile_number, unique_id);
    if (!smsSent) {
      return res.status(500).json({ message: 'Error sending code SMS' });
    }
    res.json({ success: true, message: 'Verification code sent to farmer mobile number.' });
  } catch (error) {
    console.error('Error sending farmer code:', error);
    res.status(500).json({ message: 'Error sending farmer code' });
  }
};

// ==================== TRANSPORTER MANAGEMENT FUNCTIONS ====================

// Get all pending transporters for admin review
exports.getPendingTransporters = async (req, res) => {
  try {
    const pendingTransporters = await TransporterUser.findAll({
      where: { verified_status: false, rejected_at: null },
      attributes: [
        'transporter_id', 'name', 'email', 'mobile_number', 'address', 
        'zone', 'state', 'district', 'age', 'image_url', 'created_at'
      ],
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

// Get all verified transporters
exports.getVerifiedTransporters = async (req, res) => {
  try {
    const verifiedTransporters = await TransporterUser.findAll({
      where: { verified_status: true },
      attributes: [
        'transporter_id', 'name', 'email', 'mobile_number', 'address', 
        'zone', 'state', 'district', 'age', 'image_url', 'unique_id', 'created_at'
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: verifiedTransporters.length,
      data: verifiedTransporters
    });
  } catch (error) {
    console.error('Error fetching verified transporters:', error);
    res.status(500).json({ message: 'Error fetching verified transporters' });
  }
};

// Approve a transporter and generate verification code
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

    // Generate a 6-digit verification code
    const unique_id = generateVerificationCode();
    
    // Update transporter's record
    await transporter.update({
      verified_status: true,
      unique_id: unique_id,
      approved_at: new Date(),
      approval_notes: approval_notes || null
    });

    // Send verification code via SMS
    const { sendVerificationCodeSMS, sendApprovalNotificationSMS } = require('../utils/sms.util');
    const smsSent = await sendVerificationCodeSMS(transporter.mobile_number, unique_id);
    const notificationSent = await sendApprovalNotificationSMS(transporter.mobile_number, transporter.name);
    
    if (!smsSent) {
      // Even if SMS fails, transporter is still approved
      console.warn(`Transporter approved but SMS failed to send: ${transporter.mobile_number}`);
    }

    res.json({
      success: true,
      message: 'Transporter approved successfully. Verification code sent to mobile number.',
      data: {
        transporter_id: transporter.transporter_id,
        name: transporter.name,
        email: transporter.email,
        mobile_number: transporter.mobile_number,
        unique_id: unique_id,
        sms_sent: smsSent,
        notification_sent: notificationSent
      }
    });
  } catch (error) {
    console.error('Error approving transporter:', error);
    res.status(500).json({ message: 'Error approving transporter' });
  }
};

// Reject a transporter
exports.rejectTransporter = async (req, res) => {
  try {
    const { transporter_id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const transporter = await TransporterUser.findByPk(transporter_id);
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    if (transporter.verified_status) {
      return res.status(400).json({ message: 'Cannot reject an already verified transporter' });
    }

    // Update transporter's record with rejection details
    await transporter.update({
      verified_status: false, // It's already false, but for clarity
      rejected_at: new Date(),
      rejection_reason: rejection_reason
    });

    // Send rejection notification via SMS
    const { sendRejectionNotificationSMS } = require('../utils/sms.util');
    const smsSent = await sendRejectionNotificationSMS(transporter.mobile_number, transporter.name, rejection_reason);

    res.json({
      success: true,
      message: 'Transporter rejected successfully',
      data: {
        transporter_id: transporter.transporter_id,
        name: transporter.name,
        email: transporter.email,
        mobile_number: transporter.mobile_number,
        rejection_reason: rejection_reason,
        sms_sent: smsSent
      }
    });
  } catch (error) {
    console.error('Error rejecting transporter:', error);
    res.status(500).json({ message: 'Error rejecting transporter' });
  }
};

// ==================== USER DELETE FUNCTIONS ====================

// Delete Farmer User (CASCADE Delete - removes all related data)
exports.deleteFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    if (!farmerId || isNaN(farmerId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid farmer ID is required' 
      });
    }

    // Get farmer with related data count for confirmation
    const farmer = await FarmerUser.findByPk(farmerId, {
      include: [
        { model: Product, as: 'products' },
        { model: Order, as: 'orders' },
        { model: Transaction, as: 'transactions' }
      ]
    });
    
    if (!farmer) {
      return res.status(404).json({ 
        success: false,
        message: 'Farmer not found' 
      });
    }

    // Store farmer info before deletion
    const farmerInfo = {
      farmer_id: farmer.id,
      name: farmer.name,
      email: farmer.email,
      products_count: farmer.products ? farmer.products.length : 0,
      orders_count: farmer.orders ? farmer.orders.length : 0,
      transactions_count: farmer.transactions ? farmer.transactions.length : 0
    };

    // CASCADE DELETE: This will automatically delete all related records due to associations:
    // - Products (and their cart items, orders, wishlists)
    // - Orders 
    // - Transactions
    await farmer.destroy({ force: true }); // Force hard delete from database

    res.json({
      success: true,
      message: 'Farmer and all related data deleted successfully (CASCADE)',
      data: {
        ...farmerInfo,
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_info: {
          products_deleted: farmerInfo.products_count,
          orders_deleted: farmerInfo.orders_count,
          transactions_deleted: farmerInfo.transactions_count,
          note: 'All related cart items, wishlists, and product orders were also deleted'
        }
      }
    });

  } catch (error) {
    console.error('Error deleting farmer:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting farmer and related data' 
    });
  }
};

// Delete Customer User (CASCADE Delete - removes all related data)
exports.deleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId || isNaN(customerId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid customer ID is required' 
      });
    }

    // Get customer with related data count for confirmation
    const customer = await CustomerUser.findByPk(customerId, {
      include: [
        { model: Order, as: 'orders' },
        { model: Cart, as: 'cart_items' },
        { model: Wishlist }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false,
        message: 'Customer not found' 
      });
    }

    // Store customer info before deletion
    const customerInfo = {
      customer_id: customer.id,
      name: customer.customer_name,
      email: customer.email,
      orders_count: customer.orders ? customer.orders.length : 0,
      cart_items_count: customer.cart_items ? customer.cart_items.length : 0,
      wishlist_count: customer.Wishlists ? customer.Wishlists.length : 0
    };

    // CASCADE DELETE: This will automatically delete all related records due to associations:
    // - Orders
    // - Cart items
    // - Wishlist items
    await customer.destroy({ force: true }); // Force hard delete from database

    res.json({
      success: true,
      message: 'Customer and all related data deleted successfully (CASCADE)',
      data: {
        ...customerInfo,
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_info: {
          orders_deleted: customerInfo.orders_count,
          cart_items_deleted: customerInfo.cart_items_count,
          wishlist_items_deleted: customerInfo.wishlist_count,
          note: 'All customer orders, cart items, and wishlist items were automatically deleted'
        }
      }
    });

  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting customer and related data' 
    });
  }
};

// Delete Transporter User (CASCADE Delete - removes all related data)
exports.deleteTransporter = async (req, res) => {
  try {
    const { transporterId } = req.params;
    
    if (!transporterId || isNaN(transporterId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid transporter ID is required' 
      });
    }

    // Get transporter with related data count for confirmation
    const transporter = await TransporterUser.findByPk(transporterId, {
      include: [
        { model: DeliveryPerson, as: 'delivery_persons' },
        { model: PermanentVehicle, as: 'permanent_vehicles' },
        { model: TemporaryVehicle, as: 'temporary_vehicles' }
      ]
    });
    
    if (!transporter) {
      return res.status(404).json({ 
        success: false,
        message: 'Transporter not found' 
      });
    }

    // Store transporter info before deletion
    const transporterInfo = {
      transporter_id: transporter.transporter_id,
      name: transporter.name,
      email: transporter.email,
      delivery_persons_count: transporter.delivery_persons ? transporter.delivery_persons.length : 0,
      permanent_vehicles_count: transporter.permanent_vehicles ? transporter.permanent_vehicles.length : 0,
      temporary_vehicles_count: transporter.temporary_vehicles ? transporter.temporary_vehicles.length : 0
    };

    // CASCADE DELETE: This will automatically delete all related records due to associations:
    // - Delivery persons
    // - Permanent vehicles (and their documents)
    // - Temporary vehicles (and their documents)
    await transporter.destroy({ force: true }); // Force hard delete from database

    res.json({
      success: true,
      message: 'Transporter and all related data deleted successfully (CASCADE)',
      data: {
        ...transporterInfo,
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_info: {
          delivery_persons_deleted: transporterInfo.delivery_persons_count,
          permanent_vehicles_deleted: transporterInfo.permanent_vehicles_count,
          temporary_vehicles_deleted: transporterInfo.temporary_vehicles_count,
          note: 'All delivery persons, vehicles, and vehicle documents were automatically deleted'
        }
      }
    });

  } catch (error) {
    console.error('Error deleting transporter:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting transporter and related data' 
    });
  }
};

// Delete Delivery Person User (CASCADE Delete - removes all related data)
exports.deleteDeliveryPerson = async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    
    if (!deliveryPersonId || isNaN(deliveryPersonId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid delivery person ID is required' 
      });
    }

    // Get delivery person with related data count for confirmation
    const deliveryPerson = await DeliveryPerson.findByPk(deliveryPersonId, {
      include: [
        { model: Order, as: 'orders' }
      ]
    });
    
    if (!deliveryPerson) {
      return res.status(404).json({ 
        success: false,
        message: 'Delivery person not found' 
      });
    }

    // Store delivery person info before deletion
    const deliveryPersonInfo = {
      delivery_person_id: deliveryPerson.id,
      name: deliveryPerson.name,
      mobile_number: deliveryPerson.mobile_number,
      license_number: deliveryPerson.license_number,
      vehicle_type: deliveryPerson.vehicle_type,
      orders_count: deliveryPerson.orders ? deliveryPerson.orders.length : 0,
      rating: deliveryPerson.rating,
      total_deliveries: deliveryPerson.total_deliveries
    };

    // Note: Orders are SET NULL (not deleted) because delivery person deletion shouldn't delete orders
    // CASCADE DELETE will automatically handle this via associations
    await deliveryPerson.destroy({ force: true }); // Force hard delete from database

    res.json({
      success: true,
      message: 'Delivery person deleted successfully (CASCADE)',
      data: {
        ...deliveryPersonInfo,
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_info: {
          orders_affected: deliveryPersonInfo.orders_count,
          note: 'Orders delivery_person_id field was set to NULL (orders preserved)'
        }
      }
    });

  } catch (error) {
    console.error('Error deleting delivery person:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting delivery person' 
    });
  }
};

// Delete User by Role (Generic function)
exports.deleteUserByRole = async (req, res) => {
  try {
    const { role, userId } = req.params;
    
    // Validate inputs
    if (!role || !userId || isNaN(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid role and user ID are required' 
      });
    }

    // Route to specific delete function based on role
    switch (role) {
      case 'farmer':
        req.params.farmerId = userId;
        return exports.deleteFarmer(req, res);
      
      case 'customer':
        req.params.customerId = userId;
        return exports.deleteCustomer(req, res);
      
      case 'transporter':
        req.params.transporterId = userId;
        return exports.deleteTransporter(req, res);
      
      case 'delivery_person':
        req.params.deliveryPersonId = userId;
        return exports.deleteDeliveryPerson(req, res);
      
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid role. Supported roles: farmer, customer, transporter, delivery_person' 
        });
    }

  } catch (error) {
    console.error('Error in deleteUserByRole:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting user' 
    });
  }
};

// ==================== TABLE-WISE DELETE FUNCTIONS ====================

// Delete from farmer_users table with CASCADE
exports.deleteFromFarmerTable = async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    if (!farmerId || isNaN(farmerId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid farmer ID is required' 
      });
    }

    // Get farmer with all related data for impact analysis
    const farmer = await FarmerUser.findByPk(farmerId, {
      include: [
        { model: Product, as: 'products' },
        { model: Order, as: 'orders' },
        { model: Transaction, as: 'transactions' }
      ]
    });
    
    if (!farmer) {
      return res.status(404).json({ 
        success: false,
        message: 'Farmer not found in farmer_users table' 
      });
    }

    // Collect cascade impact data
    const cascadeImpact = {
      table: 'farmer_users',
      farmer_id: farmer.id,
      farmer_name: farmer.name,
      farmer_email: farmer.email,
      related_data_deleted: {
        products: farmer.products ? farmer.products.length : 0,
        orders: farmer.orders ? farmer.orders.length : 0,
        transactions: farmer.transactions ? farmer.transactions.length : 0
      }
    };

    // CASCADE DELETE from farmer_users table (force hard delete)
    await farmer.destroy({ force: true });

    res.json({
      success: true,
      message: 'Record deleted from farmer_users table with CASCADE',
      data: {
        deleted_from_table: 'farmer_users',
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_impact: cascadeImpact,
        note: 'All related products, orders, transactions, cart items, and wishlists were CASCADE deleted'
      }
    });

  } catch (error) {
    console.error('Error deleting from farmer_users table:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting from farmer_users table' 
    });
  }
};

// Delete from customer_users table with CASCADE
exports.deleteFromCustomerTable = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId || isNaN(customerId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid customer ID is required' 
      });
    }

    // Get customer with all related data for impact analysis
    const customer = await CustomerUser.findByPk(customerId, {
      include: [
        { model: Order, as: 'orders' },
        { model: Cart, as: 'cart_items' },
        { model: Wishlist }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false,
        message: 'Customer not found in customer_users table' 
      });
    }

    // Collect cascade impact data
    const cascadeImpact = {
      table: 'customer_users',
      customer_id: customer.id,
      customer_name: customer.customer_name,
      customer_email: customer.email,
      related_data_deleted: {
        orders: customer.orders ? customer.orders.length : 0,
        cart_items: customer.cart_items ? customer.cart_items.length : 0,
        wishlist_items: customer.Wishlists ? customer.Wishlists.length : 0
      }
    };

    // CASCADE DELETE from customer_users table (force hard delete)
    await customer.destroy({ force: true });

    res.json({
      success: true,
      message: 'Record deleted from customer_users table with CASCADE',
      data: {
        deleted_from_table: 'customer_users',
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_impact: cascadeImpact,
        note: 'All related orders, cart items, and wishlist items were CASCADE deleted'
      }
    });

  } catch (error) {
    console.error('Error deleting from customer_users table:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting from customer_users table' 
    });
  }
};

// Delete from transporter_users table with CASCADE
exports.deleteFromTransporterTable = async (req, res) => {
  try {
    const { transporterId } = req.params;
    
    if (!transporterId || isNaN(transporterId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid transporter ID is required' 
      });
    }

    // Get transporter with all related data for impact analysis
    const transporter = await TransporterUser.findByPk(transporterId, {
      include: [
        { model: DeliveryPerson, as: 'delivery_persons' },
        { model: PermanentVehicle, as: 'permanent_vehicles' },
        { model: TemporaryVehicle, as: 'temporary_vehicles' }
      ]
    });
    
    if (!transporter) {
      return res.status(404).json({ 
        success: false,
        message: 'Transporter not found in transporter_users table' 
      });
    }

    // Collect cascade impact data
    const cascadeImpact = {
      table: 'transporter_users',
      transporter_id: transporter.transporter_id,
      transporter_name: transporter.name,
      transporter_email: transporter.email,
      related_data_deleted: {
        delivery_persons: transporter.delivery_persons ? transporter.delivery_persons.length : 0,
        permanent_vehicles: transporter.permanent_vehicles ? transporter.permanent_vehicles.length : 0,
        temporary_vehicles: transporter.temporary_vehicles ? transporter.temporary_vehicles.length : 0
      }
    };

    // CASCADE DELETE from transporter_users table (force hard delete)
    await transporter.destroy({ force: true });

    res.json({
      success: true,
      message: 'Record deleted from transporter_users table with CASCADE',
      data: {
        deleted_from_table: 'transporter_users',
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_impact: cascadeImpact,
        note: 'All delivery persons, vehicles, and vehicle documents were CASCADE deleted'
      }
    });

  } catch (error) {
    console.error('Error deleting from transporter_users table:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting from transporter_users table' 
    });
  }
};

// Delete from delivery_persons table with CASCADE
exports.deleteFromDeliveryPersonTable = async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    
    if (!deliveryPersonId || isNaN(deliveryPersonId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid delivery person ID is required' 
      });
    }

    // Get delivery person with all related data for impact analysis
    const deliveryPerson = await DeliveryPerson.findByPk(deliveryPersonId, {
      include: [
        { model: Order, as: 'orders' }
      ]
    });
    
    if (!deliveryPerson) {
      return res.status(404).json({ 
        success: false,
        message: 'Delivery person not found in delivery_persons table' 
      });
    }

    // Collect cascade impact data
    const cascadeImpact = {
      table: 'delivery_persons',
      delivery_person_id: deliveryPerson.id,
      delivery_person_name: deliveryPerson.name,
      mobile_number: deliveryPerson.mobile_number,
      related_data_affected: {
        orders_set_null: deliveryPerson.orders ? deliveryPerson.orders.length : 0
      }
    };

    // CASCADE DELETE from delivery_persons table (force hard delete)
    // Note: Orders are SET NULL, not deleted
    await deliveryPerson.destroy({ force: true });

    res.json({
      success: true,
      message: 'Record deleted from delivery_persons table with CASCADE',
      data: {
        deleted_from_table: 'delivery_persons',
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_impact: cascadeImpact,
        note: 'Delivery person deleted. Related orders had delivery_person_id set to NULL'
      }
    });

  } catch (error) {
    console.error('Error deleting from delivery_persons table:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting from delivery_persons table' 
    });
  }
};

// Delete from admin_users table with CASCADE
exports.deleteFromAdminTable = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    if (!adminId || isNaN(adminId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid admin ID is required' 
      });
    }

    // Prevent self-deletion
    if (parseInt(adminId) === req.user.admin_id) {
      return res.status(403).json({ 
        success: false,
        message: 'Cannot delete your own admin account' 
      });
    }

    // Get admin for impact analysis
    const admin = await AdminUser.findByPk(adminId);
    
    if (!admin) {
      return res.status(404).json({ 
        success: false,
        message: 'Admin not found in admin_users table' 
      });
    }

    // Collect cascade impact data
    const cascadeImpact = {
      table: 'admin_users',
      admin_id: admin.admin_id,
      admin_username: admin.username,
      admin_email: admin.email,
      admin_role: admin.role
    };

    // CASCADE DELETE from admin_users table (force hard delete)
    await admin.destroy({ force: true });

    res.json({
      success: true,
      message: 'Record deleted from admin_users table with CASCADE',
      data: {
        deleted_from_table: 'admin_users',
        deleted_at: new Date(),
        deleted_by: req.user.admin_id,
        cascade_impact: cascadeImpact,
        note: 'Admin user permanently deleted from admin_users table'
      }
    });

  } catch (error) {
    console.error('Error deleting from admin_users table:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting from admin_users table' 
    });
  }
};

// Generic table-wise delete function
exports.deleteFromTable = async (req, res) => {
  try {
    const { tableName, userId } = req.params;
    
    if (!tableName || !userId || isNaN(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid table name and user ID are required' 
      });
    }

    // Route to specific table delete function
    switch (tableName) {
      case 'farmer_users':
        req.params.farmerId = userId;
        return exports.deleteFromFarmerTable(req, res);
      
      case 'customer_users':
        req.params.customerId = userId;
        return exports.deleteFromCustomerTable(req, res);
      
      case 'transporter_users':
        req.params.transporterId = userId;
        return exports.deleteFromTransporterTable(req, res);
      
      case 'delivery_persons':
        req.params.deliveryPersonId = userId;
        return exports.deleteFromDeliveryPersonTable(req, res);
      
      case 'admin_users':
        req.params.adminId = userId;
        return exports.deleteFromAdminTable(req, res);
      
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid table name. Supported tables: farmer_users, customer_users, transporter_users, delivery_persons, admin_users' 
        });
    }

  } catch (error) {
    console.error('Error in deleteFromTable:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting from table' 
    });
  }
}; 