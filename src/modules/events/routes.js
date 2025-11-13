const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * Event tracking routes
 * Handles event tracking and analytics endpoints
 */

// Track new event
router.post('/', controller.track);

// Get events with filters and pagination
router.get('/', controller.getEvents);

// Get event statistics
router.get('/stats', controller.getStats);

// Get events for specific session
router.get('/session/:sessionId', controller.getSessionEvents);

// Get funnel analysis (POST for complex payload)
router.post('/funnel', controller.getFunnelAnalysis);

module.exports = router;
