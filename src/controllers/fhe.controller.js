/**
 * fhe.controller.js
 *
 * Express controller for Fully Homomorphic Encryption endpoints.
 * All operations use REAL database data — no manual input needed.
 *
 * GET /api/fhe/farmer-products       → encrypt farmer's own product prices
 * GET /api/fhe/verify-orders         → FHE bid check on farmer's completed orders
 * GET /api/fhe/market-analytics      → aggregate prices of all farmers' products
 * GET /api/fhe/transaction-ledger    → encrypt farmer's completed order earnings
 */

'use strict';

const { Op } = require('sequelize');
const Product     = require('../models/product.model');
const FarmerUser  = require('../models/farmer_user.model');
const Order       = require('../models/order.model');
const CustomerUser = require('../models/customer_user.model');

const {
  encryptPrice,
  verifyBid,
  marketAnalytics,
  transactionLedger,
} = require('../services/fhe.service');

// ─── GET /api/fhe/farmer-products ─────────────────────────────────────────────
// Encrypts the logged-in farmer's own product prices.
const farmerProductsHandler = async (req, res) => {
  try {
    const farmerId = req.user.farmer_id;

    const products = await Product.findAll({
      where: { farmer_id: farmerId },
      attributes: ['product_id', 'name', 'current_price', 'quantity', 'category', 'status'],
      order: [['created_at', 'DESC']],
    });

    if (!products.length) {
      return res.status(404).json({ success: false, message: 'No products found for this farmer' });
    }

    const encrypted = products.map(p => ({
      product_id   : p.product_id,
      product_name : p.name,
      category     : p.category,
      quantity     : p.quantity,
      status       : p.status,
      ...encryptPrice(Number(p.current_price)),
    }));

    return res.json({
      success      : true,
      farmer_id    : farmerId,
      total_products: products.length,
      data         : encrypted,
    });
  } catch (err) {
    console.error('[FHE] farmerProducts error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/fhe/verify-orders ───────────────────────────────────────────────
// For each of the farmer's completed orders: runs FHE bid verification
// using the product price (min) vs. total_price/quantity (actual paid per unit).
const verifyOrdersHandler = async (req, res) => {
  try {
    const farmerId = req.user.farmer_id;

    const orders = await Order.findAll({
      include: [{
        model: Product,
        where: { farmer_id: farmerId },
        attributes: ['product_id', 'name', 'current_price'],
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name'],
      }],
      where: { current_status: { [Op.in]: ['DELIVERED', 'PLACED', 'SHIPPED', 'IN_TRANSIT', 'ASSIGNED'] } },
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'No orders found for FHE verification' });
    }

    const results = orders.map(o => {
      const minPrice    = Number(o.product?.current_price ?? 0);
      const paidPerUnit = o.quantity > 0 ? Number(o.total_price) / o.quantity : minPrice;
      const qty         = o.quantity;

      return {
        order_id    : o.order_id,
        product_name: o.product?.name || 'Product',
        buyer_name  : o.customer?.name || 'Customer',
        quantity    : qty,
        fhe_result  : verifyBid(minPrice, paidPerUnit, qty),
      };
    });

    return res.json({
      success    : true,
      farmer_id  : farmerId,
      total_orders: results.length,
      data       : results,
    });
  } catch (err) {
    console.error('[FHE] verifyOrders error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/fhe/market-analytics ───────────────────────────────────────────
// Fetches all farmers' products and runs FHE market analytics
// — platform sees aggregate but not individual farmer prices.
const marketAnalyticsHandler = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { status: 'available' },
      attributes: ['product_id', 'name', 'current_price'],
      include: [{
        model: FarmerUser,
        as: 'farmer',
        attributes: ['farmer_id', 'name'],
      }],
      order: [['current_price', 'DESC']],
      limit: 20,
    });

    if (products.length < 2) {
      return res.status(404).json({
        success: false,
        message: 'Need at least 2 available products in the market for analytics',
      });
    }

    const prices = products.map(p => ({
      farmer: `${p.farmer?.name || 'Farmer'} (${p.name})`,
      price : Number(p.current_price),
    }));

    const result = marketAnalytics(prices);

    return res.json({
      success       : true,
      total_products: products.length,
      data          : result,
    });
  } catch (err) {
    console.error('[FHE] marketAnalytics error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/fhe/transaction-ledger ─────────────────────────────────────────
// Builds an FHE-encrypted running ledger from the farmer's completed orders.
const transactionLedgerHandler = async (req, res) => {
  try {
    const farmerId = req.user.farmer_id;

    const orders = await Order.findAll({
      include: [{
        model: Product,
        where: { farmer_id: farmerId },
        attributes: ['product_id', 'name', 'current_price'],
      }, {
        model: CustomerUser,
        as: 'customer',
        attributes: ['name'],
      }],
      where: { payment_status: 'completed' },
      order: [['created_at', 'ASC']],
    });

    if (!orders.length) {
      // Fall back to all orders if no completed payments yet
      const allOrders = await Order.findAll({
        include: [{
          model: Product,
          where: { farmer_id: farmerId },
          attributes: ['product_id', 'name', 'current_price'],
        }, {
          model: CustomerUser,
          as: 'customer',
          attributes: ['name'],
        }],
        order: [['created_at', 'ASC']],
        limit: 10,
      });

      if (!allOrders.length) {
        return res.status(404).json({
          success: false,
          message: 'No orders found to build encrypted ledger',
        });
      }

      const transactions = allOrders.map(o => ({
        buyer   : o.customer?.name || 'Customer',
        crop    : o.product?.name  || 'Product',
        quantity: o.quantity,
        price   : Math.round(Number(o.farmer_amount) / Math.max(o.quantity, 1)),
      }));

      const result = transactionLedger(transactions);
      return res.json({ success: true, farmer_id: farmerId, data: result });
    }

    const transactions = orders.map(o => ({
      buyer   : o.customer?.name || 'Customer',
      crop    : o.product?.name  || 'Product',
      quantity: o.quantity,
      price   : Math.round(Number(o.farmer_amount) / Math.max(o.quantity, 1)),
    }));

    const result = transactionLedger(transactions);
    return res.json({
      success    : true,
      farmer_id  : farmerId,
      data       : result,
    });
  } catch (err) {
    console.error('[FHE] transactionLedger error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  farmerProductsHandler,
  verifyOrdersHandler,
  marketAnalyticsHandler,
  transactionLedgerHandler,
};
