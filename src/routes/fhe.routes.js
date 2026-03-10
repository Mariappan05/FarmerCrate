/**
 * fhe.routes.js
 *
 * Routes for the Fully Homomorphic Encryption (FHE) endpoints.
 * All routes require authentication.
 *
 * GET /api/fhe/farmer-products      → encrypt logged-in farmer's product prices (DB)
 * GET /api/fhe/verify-orders        → FHE bid verification on farmer's orders (DB)
 * GET /api/fhe/market-analytics     → aggregate analytics across all farmers (DB)
 * GET /api/fhe/transaction-ledger   → encrypted ledger of farmer's completed sales (DB)
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/auth');

const {
  farmerProductsHandler,
  verifyOrdersHandler,
  marketAnalyticsHandler,
  transactionLedgerHandler,
} = require('../controllers/fhe.controller');

// All endpoints are GET — no request body needed, all data comes from the DB
router.get('/farmer-products',    authenticate, farmerProductsHandler);
router.get('/verify-orders',      authenticate, verifyOrdersHandler);
router.get('/market-analytics',   authenticate, marketAnalyticsHandler);
router.get('/transaction-ledger', authenticate, transactionLedgerHandler);

module.exports = router;
