const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');
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

    const idField = role === 'farmer' ? 'farmer_id' : 
                   role === 'customer' ? 'customer_id' : 
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

    const idField = role === 'farmer' ? 'farmer_id' : 
                   role === 'customer' ? 'customer_id' : 
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
        'farmer_id', 'name', 'email', 'mobile_number', 'address', 
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
        'farmer_id', 'name', 'email', 'mobile_number', 'address', 
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
    const { farmer_id } = req.params;
    const { approval_notes } = req.body;

    const farmer = await FarmerUser.findByPk(farmer_id);
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
        farmer_id: farmer.farmer_id,
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
    const { farmer_id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const farmer = await FarmerUser.findByPk(farmer_id);
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
        farmer_id: farmer.farmer_id,
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
    const { farmer_id } = req.params;

    const farmer = await FarmerUser.findByPk(farmer_id);
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
        farmer_id: farmer.farmer_id,
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
    const { farmer_id } = req.params;

    const farmer = await FarmerUser.findByPk(farmer_id, {
      attributes: [
        'farmer_id', 'name', 'email', 'mobile_number', 'verified_status', 'unique_id',
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