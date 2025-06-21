const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Farmer registration
router.post('/register', authController.register);

module.exports = router; 