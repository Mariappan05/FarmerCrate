const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');

router.get('/address', locationController.getAddressFromCoordinates);

module.exports = router;
