const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Transporter registration
router.post('/register', authController.register);

module.exports = router; 