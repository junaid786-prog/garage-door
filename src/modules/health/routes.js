const express = require('express');
const healthController = require('./controller');

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', healthController.getHealth.bind(healthController));

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with dependencies
 * @access  Public (consider protecting in production)
 */
router.get('/detailed', healthController.getDetailedHealth.bind(healthController));

/**
 * @route   GET /health/circuit-breakers
 * @desc    Get circuit breaker status
 * @access  Public (consider protecting in production)
 */
router.get('/circuit-breakers', healthController.getCircuitBreakerStatus.bind(healthController));

module.exports = router;
