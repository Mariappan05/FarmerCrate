const FarmerUser = require('../models/farmer_user.model');
const { v4: uuidv4 } = require('uuid');

// Send a unique code for an existing farmer and email it
exports.sendFarmerCode = async (req, res) => {
  try {
    const { email } = req.body;
    const farmer = await FarmerUser.findOne({ where: { email } });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    // Generate a unique code
    const unique_id = uuidv4();
    // Update farmer's record
    farmer.unique_id = unique_id;
    await farmer.save();
    // Send code via email
    const { sendOTPEmail } = require('../utils/email.util');
    const emailSent = await sendOTPEmail(email, unique_id);
    if (!emailSent) {
      return res.status(500).json({ message: 'Error sending code email' });
    }
    res.json({ success: true, message: 'Verification code sent to farmer email.' });
  } catch (error) {
    console.error('Error sending farmer code:', error);
    res.status(500).json({ message: 'Error sending farmer code' });
  }
}; 