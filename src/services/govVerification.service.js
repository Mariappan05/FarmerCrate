const FarmerUser = require('../models/farmer_user.model');
const FarmerVerificationHistory = require('../models/farmerVerificationHistory.model');

class GovVerificationService {
  /**
   * Verify farmer with government API
   * @param {string} globalFarmerId - The farmer's global ID
   * @param {number} farmerId - The farmer's database ID
   * @returns {Promise<Object>} Verification result
   */
  static async verifyFarmerWithGov(globalFarmerId, farmerId) {
    try {
      // TODO: Replace with actual government API call
      const govApiResult = await this.callGovAPI(globalFarmerId);
      
      // Update farmer verification status
      const farmer = await FarmerUser.findByPk(farmerId);
      if (!farmer) {
        throw new Error('Farmer not found');
      }

      await farmer.update({
        is_verified_by_gov: govApiResult.verified,
        verification_completed_at: govApiResult.verified ? new Date() : null,
        verification_notes: govApiResult.notes || null
      });

      // Log verification attempt
      await FarmerVerificationHistory.create({
        farmer_id: farmerId,
        verification_status: govApiResult.verified ? 'verified' : 'failed',
        verification_response: JSON.stringify(govApiResult),
        verified_at: new Date()
      });

      return {
        success: true,
        verified: govApiResult.verified,
        message: govApiResult.message,
        farmer_id: farmerId
      };
    } catch (error) {
      console.error('Gov verification error:', error);
      
      // Log failed verification attempt
      await FarmerVerificationHistory.create({
        farmer_id: farmerId,
        verification_status: 'error',
        verification_response: JSON.stringify({ error: error.message }),
        verified_at: new Date()
      });

      return {
        success: false,
        verified: false,
        message: 'Verification service temporarily unavailable',
        error: error.message
      };
    }
  }

  /**
   * Mock government API call - Replace with actual API
   * @param {string} globalFarmerId 
   * @returns {Promise<Object>}
   */
  static async callGovAPI(globalFarmerId) {
    // TODO: Replace this mock implementation with actual government API
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock verification logic - replace with actual API call
    if (!globalFarmerId || globalFarmerId.length < 5) {
      return {
        verified: false,
        message: 'Invalid farmer ID format',
        notes: 'Farmer ID does not meet minimum requirements'
      };
    }

    // Mock: Consider farmers with IDs starting with 'GOV' as verified
    const isVerified = globalFarmerId.toUpperCase().startsWith('GOV');
    
    return {
      verified: isVerified,
      message: isVerified ? 'Farmer verified successfully' : 'Farmer verification failed',
      notes: isVerified ? 'Government records match' : 'No matching records found in government database',
      apiResponse: {
        // Mock API response structure
        status: isVerified ? 'VERIFIED' : 'NOT_FOUND',
        timestamp: new Date().toISOString(),
        reference_id: `REF_${Date.now()}`
      }
    };
  }

  /**
   * Check if farmer can be verified
   * @param {number} farmerId 
   * @returns {Promise<Object>}
   */
  static async canVerifyFarmer(farmerId) {
    const farmer = await FarmerUser.findByPk(farmerId);
    if (!farmer) {
      return { canVerify: false, reason: 'Farmer not found' };
    }

    if (farmer.is_verified_by_gov) {
      return { canVerify: false, reason: 'Farmer already verified' };
    }

    if (!farmer.global_farmer_id) {
      return { canVerify: false, reason: 'Global farmer ID not set' };
    }

    return { canVerify: true };
  }

  /**
   * Get verification history for a farmer
   * @param {number} farmerId 
   * @returns {Promise<Array>}
   */
  static async getVerificationHistory(farmerId) {
    return await FarmerVerificationHistory.findAll({
      where: { farmer_id: farmerId },
      order: [['verified_at', 'DESC']]
    });
  }
}

module.exports = GovVerificationService;