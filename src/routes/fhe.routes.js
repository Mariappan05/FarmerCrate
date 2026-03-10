/**
 * fhe.routes.js
 *
 * Routes for the Fully Homomorphic Encryption (FHE) endpoints.
 * All routes require authentication.
 */

'use strict';

const express    = require('express');
const router     = express.Router();
const authenticate = require('../middleware/auth');

const {
  encryptPriceHandler,
  verifyBidHandler,
  marketAnalyticsHandler,
  transactionLedgerHandler,
} = require('../controllers/fhe.controller');

// POST /api/fhe/encrypt-price
// Body: { amount: number }
router.post('/encrypt-price', authenticate, encryptPriceHandler);

// POST /api/fhe/verify-bid
// Body: { farmer_min_price, buyer_bid_price, quantity }
router.post('/verify-bid', authenticate, verifyBidHandler);

// POST /api/fhe/market-analytics
// Body: { prices: [{ farmer: string, price: number }, ...] }
router.post('/market-analytics', authenticate, marketAnalyticsHandler);

// POST /api/fhe/transaction-ledger
// Body: { transactions: [{ buyer, crop, quantity, price }, ...] }
router.post('/transaction-ledger', authenticate, transactionLedgerHandler);

module.exports = router;
