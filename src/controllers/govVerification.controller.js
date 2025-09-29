const GovVerificationService = require('../services/govVerification.service');
const FarmerUser = require('../models/farmer_user.model');

// Manual verification trigger for admin
exports.verifyFarmer = async (req, res) => {
  try {
    const { farmer_id } = req.params;
    
    // Check if farmer exists
    const farmer = await FarmerUser.findByPk(farmer_id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Check if verification is possible
    const canVerify = await GovVerificationService.canVerifyFarmer(farmer_id);
    if (!canVerify.canVerify) {
      return res.status(400).json({ message: canVerify.reason });
    }

    // Trigger verification
    const result = await GovVerificationService.verifyFarmerWithGov(
      farmer.global_farmer_id, 
      farmer_id
    );

    res.json({
      message: 'Verification completed',
      result
    });
  } catch (error) {
    console.error('Manual verification error:', error);
    res.status(500).json({ message: 'Error processing verification' });
  }
};

// Get verification status
exports.getVerificationStatus = async (req, res) => {
  try {
    const { farmer_id } = req.params;
    
    const farmer = await FarmerUser.findByPk(farmer_id, {
      attributes: ['farmer_id', 'name', 'global_farmer_id', 'is_verified_by_gov', 
                  'verification_completed_at', 'verification_notes']
    });
    
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const history = await GovVerificationService.getVerificationHistory(farmer_id);

    res.json({
      farmer: {
        id: farmer.farmer_id,
        name: farmer.name,
        global_farmer_id: farmer.global_farmer_id,
        is_verified: farmer.is_verified_by_gov,
        verified_at: farmer.verification_completed_at,
        notes: farmer.verification_notes
      },
      verification_history: history
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ message: 'Error fetching verification status' });
  }
};

// Retry verification
exports.retryVerification = async (req, res) => {
  try {
    const { farmer_id } = req.params;
    
    const farmer = await FarmerUser.findByPk(farmer_id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (!farmer.global_farmer_id) {
      return res.status(400).json({ message: 'Global farmer ID required for verification' });
    }

    // Reset verification status
    await farmer.update({
      is_verified_by_gov: false,
      verification_completed_at: null,
      verification_notes: null
    });

    // Trigger new verification
    const result = await GovVerificationService.verifyFarmerWithGov(
      farmer.global_farmer_id, 
      farmer_id
    );

    res.json({
      message: 'Verification retry completed',
      result
    });
  } catch (error) {
    console.error('Retry verification error:', error);
    res.status(500).json({ message: 'Error retrying verification' });
  }
};