const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// POST /admin/generate-farmer-code

// POST /admin/send-farmer-code
router.post('/send-farmer-code', adminController.sendFarmerCode);

module.exports = router; 