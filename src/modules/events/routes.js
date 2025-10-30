const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * Event tracking routes
 * Task #3: Track Event
 */

// Track new event
router.post('/', controller.track);

// Get events with filters
router.get('/', controller.getEvents);

// Get event statistics
router.get('/stats', controller.getStats);

module.exports = router;
