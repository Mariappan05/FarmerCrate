const { validationResult } = require('express-validator');
const FarmerUser = require('../models/farmer_user.model');
const CustomerUser = require('../models/customer_user.model');
const TransporterUser = require('../models/transporter_user.model');
const { sequelize } = require('../models/transaction.model');

// Get transactions
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        attributes: ['username', 'email']
      }]
    });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

// Get balance
exports.getBalance = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['walletBalance']
    });

    res.json({
      success: true,
      data: {
        balance: user.walletBalance
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: 'Error fetching balance' });
  }
};

// Create withdrawal
exports.createWithdrawal = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, bankDetails } = req.body;

    // Check if user has sufficient balance
    const user = await User.findByPk(req.user.id, {
      attributes: ['walletBalance']
    });

    if (user.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create withdrawal transaction
    const withdrawal = await Transaction.create({
      userId: req.user.id,
      amount: -amount, // Negative amount for withdrawal
      type: 'withdrawal',
      status: 'pending',
      description: `Withdrawal request - ${bankDetails}`
    }, { transaction });

    // Update user's wallet balance
    await User.update(
      { walletBalance: sequelize.literal(`walletBalance - ${amount}`) },
      { 
        where: { id: req.user.id },
        transaction
      }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: withdrawal
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create withdrawal error:', error);
    res.status(500).json({ message: 'Error creating withdrawal request' });
  }
};

// Example: Get farmer vault info
exports.getFarmerVault = async (req, res) => {
  try {
    const farmer = await FarmerUser.findByPk(req.user.id, {
      attributes: ['name', 'email', 'mobile_number', 'account_number', 'ifsc_code']
    });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    res.json({ success: true, data: farmer });
  } catch (error) {
    console.error('Get farmer vault error:', error);
    res.status(500).json({ message: 'Error fetching farmer vault info' });
  }
}; 