const errorLogService = require('../../services/errorLogService');
const logger = require('../../utils/logger');

/**
 * Error Recovery Controller
 * Admin endpoints for viewing and managing error logs
 */
class ErrorRecoveryController {
  /**
   * Get all unresolved errors
   * @route GET /admin/errors/unresolved
   */
  async getUnresolvedErrors(req, res) {
    try {
      const { operation, serviceName, retryable, limit } = req.query;

      const filters = {};
      if (operation) filters.operation = operation;
      if (serviceName) filters.serviceName = serviceName;
      if (retryable !== undefined) filters.retryable = retryable === 'true';
      if (limit) filters.limit = parseInt(limit, 10);

      const errors = await errorLogService.getUnresolvedErrors(filters);

      res.json({
        success: true,
        data: {
          count: errors.length,
          errors: errors.map((error) => ({
            id: error.id,
            errorType: error.errorType,
            operation: error.operation,
            serviceName: error.serviceName,
            errorMessage: error.errorMessage,
            errorCode: error.errorCode,
            retryable: error.retryable,
            retryCount: error.retryCount,
            createdAt: error.createdAt,
            context: error.context, // Sanitized, no PII
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get unresolved errors', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve error logs',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get error by ID
   * @route GET /admin/errors/:id
   */
  async getErrorById(req, res) {
    try {
      const { id } = req.params;

      const error = await errorLogService.getErrorById(id);

      res.json({
        success: true,
        data: {
          id: error.id,
          errorType: error.errorType,
          operation: error.operation,
          serviceName: error.serviceName,
          context: error.context,
          errorMessage: error.errorMessage,
          errorCode: error.errorCode,
          stackTrace: error.stackTrace,
          retryable: error.retryable,
          retryCount: error.retryCount,
          resolved: error.resolved,
          resolvedAt: error.resolvedAt,
          resolvedBy: error.resolvedBy,
          createdAt: error.createdAt,
          updatedAt: error.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error.code === 'ERROR_LOG_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      logger.error('Failed to get error log', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve error log',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Mark error as resolved
   * @route POST /admin/errors/:id/resolve
   */
  async resolveError(req, res) {
    try {
      const { id } = req.params;
      const { resolvedBy = 'manual' } = req.body;

      const error = await errorLogService.markResolved(id, resolvedBy);

      logger.info('Error marked as resolved via admin', {
        errorId: id,
        resolvedBy,
      });

      res.json({
        success: true,
        message: 'Error marked as resolved',
        data: {
          id: error.id,
          resolved: error.resolved,
          resolvedAt: error.resolvedAt,
          resolvedBy: error.resolvedBy,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error.code === 'ERROR_LOG_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      logger.error('Failed to resolve error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to mark error as resolved',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get error statistics
   * @route GET /admin/errors/stats
   */
  async getErrorStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const filters = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const stats = await errorLogService.getErrorStats(filters);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get error statistics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve error statistics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Retry a failed operation
   * @route POST /admin/errors/:id/retry
   * NOTE: This is a placeholder - actual retry logic depends on operation type
   */
  async retryError(req, res) {
    try {
      const { id } = req.params;

      const error = await errorLogService.getErrorById(id);

      // Check if retryable
      if (!error.retryable) {
        return res.status(400).json({
          success: false,
          error: 'This error is not retryable',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if already resolved
      if (error.resolved) {
        return res.status(400).json({
          success: false,
          error: 'This error is already resolved',
          timestamp: new Date().toISOString(),
        });
      }

      // Increment retry count
      await errorLogService.incrementRetryCount(id);

      // TODO: Implement actual retry logic based on operation type
      // For now, just return a message indicating retry needs to be implemented
      logger.info('Retry requested for error (manual implementation required)', {
        errorId: id,
        operation: error.operation,
        errorType: error.errorType,
      });

      res.json({
        success: true,
        message: 'Retry count incremented. Manual retry required for this operation type.',
        data: {
          id: error.id,
          operation: error.operation,
          retryCount: error.retryCount + 1,
          context: error.context,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error.code === 'ERROR_LOG_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      logger.error('Failed to retry error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retry operation',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new ErrorRecoveryController();
