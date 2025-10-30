const express = require('express');
const router = express.Router();
const controller = require('./controller');
const validator = require('./validator');

/**
 * Booking routes
 */

// Create new booking (Task #1 - Booking POST)
router.post('/', validator.create, controller.create);

// Get booking by ID
router.get('/:id', controller.getById);

module.exports = router;
