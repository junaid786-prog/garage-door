const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { validateAbandonedSession } = require('./validator');
const { bookingRateLimiter, readRateLimiter } = require('../../middleware/rateLimiter');

/**
 * Abandoned Sessions routes
 * Phase 1: Basic abandoned session capture
 * Phase 2: ServiceTitan integration will be added
 */

// Create abandoned session record
// Note: This endpoint is called by sendBeacon from frontend, so response doesn't matter much
router.post('/', bookingRateLimiter(), validateAbandonedSession, controller.createAbandonedSession);

// Get abandoned session by ID (for debugging/ops)
router.get('/:id', readRateLimiter(), controller.getAbandonedSession);

module.exports = router;
