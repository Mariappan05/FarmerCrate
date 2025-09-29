const jwt = require('jsonwebtoken');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const AdminUser = require('../models/admin_user.model');
const DeliveryPerson = require('../models/deliveryPerson.model');

// Helper to get model by role
const getModelByRole = (role) => {
  if (role === 'farmer') return FarmerUser;
  if (role === 'customer') return CustomerUser;
  if (role === 'transporter') return TransporterUser;
  if (role === 'admin') return AdminUser;
  if (role === 'delivery') return DeliveryPerson;
  return null;
};

// Example middleware: authenticate and attach user to req
module.exports = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle different JWT token structures
    let userId, role;
    if (decoded.farmer_id) {
      userId = decoded.farmer_id;
      role = 'farmer';
    } else if (decoded.customer_id) {
      userId = decoded.customer_id;
      role = 'customer';
    } else if (decoded.transporter_id) {
      userId = decoded.transporter_id;
      role = 'transporter';
    } else if (decoded.admin_id) {
      userId = decoded.admin_id;
      role = 'admin';
    } else if (decoded.delivery_person_id) {
      userId = decoded.delivery_person_id;
      role = 'delivery';
    } else {
      // Fallback to old structure
      userId = decoded.id;
      role = decoded.role;
    }
    
    const Model = getModelByRole(role);
    if (!Model) return res.status(401).json({ message: 'Invalid role' });
    
    const idField = role === 'farmer' ? 'farmer_id' : 
                   role === 'customer' ? 'customer_id' : 
                   role === 'transporter' ? 'transporter_id' : 
                   role === 'delivery' ? 'delivery_person_id' :
                   'admin_id';
    
    const user = await Model.findOne({ where: { [idField]: userId } });
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