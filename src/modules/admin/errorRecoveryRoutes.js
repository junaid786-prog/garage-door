const express = require('express');
const errorRecoveryController = require('./errorRecoveryController');

const router = express.Router();

/**
 * @route   GET /admin/errors/unresolved
 * @desc    Get all unresolved errors
 * @query   operation, serviceName, retryable, limit
 * @access  Admin only (should add auth middleware)
 */
router.get(
  '/unresolved',
  errorRecoveryController.getUnresolvedErrors.bind(errorRecoveryController)
);

/**
 * @route   GET /admin/errors/stats
 * @desc    Get error statistics
 * @query   startDate, endDate
 * @access  Admin only (should add auth middleware)
 */
router.get('/stats', errorRecoveryController.getErrorStats.bind(errorRecoveryController));

/**
 * @route   GET /admin/errors/:id
 * @desc    Get error by ID
 * @access  Admin only (should add auth middleware)
 */
router.get('/:id', errorRecoveryController.getErrorById.bind(errorRecoveryController));

/**
 * @route   POST /admin/errors/:id/resolve
 * @desc    Mark error as resolved
 * @body    resolvedBy (optional)
 * @access  Admin only (should add auth middleware)
 */
router.post('/:id/resolve', errorRecoveryController.resolveError.bind(errorRecoveryController));

/**
 * @route   POST /admin/errors/:id/retry
 * @desc    Retry a failed operation
 * @access  Admin only (should add auth middleware)
 */
router.post('/:id/retry', errorRecoveryController.retryError.bind(errorRecoveryController));

module.exports = router;
