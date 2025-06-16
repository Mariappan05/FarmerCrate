const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const vaultController = require('../controllers/vault.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const withdrawalValidation = [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('bankDetails').trim().notEmpty().withMessage('Bank details are required')
];

// Protected routes
router.get('/transactions', 
  protect, 
  vaultController.getTransactions
);

router.get('/balance', 
  protect, 
  vaultController.getBalance
);

router.post('/withdraw', 
  protect, 
  withdrawalValidation, 
  vaultController.createWithdrawal
);

module.exports = router; 