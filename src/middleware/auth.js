const jwt = require('jsonwebtoken');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');

// Helper to get model by role
const getModelByRole = (role) => {
  if (role === 'farmer') return FarmerUser;
  if (role === 'customer') return CustomerUser;
  if (role === 'transporter') return TransporterUser;
  if (role === 'admin') return AdminUser;
  return null;
};

// Example middleware: authenticate and attach user to req
module.exports = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, role } = decoded;
    const Model = getModelByRole(role);
    if (!Model) return res.status(401).json({ message: 'Invalid role' });
    
    const idField = role === 'farmer' ? 'farmer_id' : 
                   role === 'customer' ? 'customer_id' : 
                   role === 'transporter' ? 'transporter_id' : 
                   'admin_id';
    
    const user = await Model.findOne({ where: { [idField]: id } });
    if (!user) return res.status(401).json({ message: 'User not found' });
    
    // Check if admin is active
    if (role === 'admin' && !user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    req.user = user;
    req.role = role;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
}; 