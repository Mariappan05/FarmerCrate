/**
 * fhe.controller.js
 *
 * Express controller for Fully Homomorphic Encryption endpoints.
 * Delegates computation to fhe.service.js.
 */

'use strict';

const {
  encryptPrice,
  verifyBid,
  marketAnalytics,
  transactionLedger,
} = require('../services/fhe.service');

// ─── POST /api/fhe/encrypt-price ─────────────────────────────────────────────
const encryptPriceHandler = async (req, res) => {
  try {
    const { amount } = req.body;

    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }

    const result = encryptPrice(Number(amount));
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[FHE] encryptPrice error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/fhe/verify-bid ────────────────────────────────────────────────
const verifyBidHandler = async (req, res) => {
  try {
    const { farmer_min_price, buyer_bid_price, quantity } = req.body;

    if (!farmer_min_price || !buyer_bid_price || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'farmer_min_price, buyer_bid_price, and quantity are all required',
      });
    }

    if ([farmer_min_price, buyer_bid_price, quantity].some(v => isNaN(Number(v)) || Number(v) <= 0)) {
      return res.status(400).json({ success: false, message: 'All values must be positive numbers' });
    }

    const result = verifyBid(
      Number(farmer_min_price),
      Number(buyer_bid_price),
      Number(quantity),
    );
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[FHE] verifyBid error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/fhe/market-analytics ─────────────────────────────────────────
const marketAnalyticsHandler = async (req, res) => {
  try {
    const { prices } = req.body;

    if (!Array.isArray(prices) || prices.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'prices must be an array of at least 2 objects: [{ farmer, price }, ...]',
      });
    }

    for (const p of prices) {
      if (!p.farmer || p.price === undefined || isNaN(Number(p.price)) || Number(p.price) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each entry must have a valid farmer name and positive price',
        });
      }
    }

    const result = marketAnalytics(prices);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[FHE] marketAnalytics error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/fhe/transaction-ledger ────────────────────────────────────────
const transactionLedgerHandler = async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'transactions must be a non-empty array: [{ buyer, crop, quantity, price }, ...]',
      });
    }

    for (const t of transactions) {
      if (!t.buyer || !t.crop || !t.quantity || !t.price) {
        return res.status(400).json({
          success: false,
          message: 'Each transaction requires: buyer, crop, quantity, price',
        });
      }
    }

    const result = transactionLedger(transactions);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[FHE] transactionLedger error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  encryptPriceHandler,
  verifyBidHandler,
  marketAnalyticsHandler,
  transactionLedgerHandler,
};
