const errorLogService = require('../../services/errorLogService');
const logger = require('../../utils/logger');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const APIResponse = require('../../utils/response');

/**
 * Error Recovery Controller
 * Admin endpoints for viewing and managing error logs
 */
class ErrorRecoveryController {
  /**
   * Get all unresolved errors
   * @route GET /admin/errors/unresolved
   */
  async getUnresolvedErrors(req, res, next) {
    try {
      const { operation, serviceName, retryable, limit } = req.query;

      const filters = {};
      if (operation) filters.operation = operation;
      if (serviceName) filters.serviceName = serviceName;
      if (retryable !== undefined) filters.retryable = retryable === 'true';
      if (limit) filters.limit = parseInt(limit, 10);

      const errors = await errorLogService.getUnresolvedErrors(filters);

      return APIResponse.success(
        res,
        {
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
        'Unresolved errors retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get unresolved errors', { error: error.message });
      next(error);
    }
  }

  /**
   * Get error by ID
   * @route GET /admin/errors/:id
   */
  async getErrorById(req, res, next) {
    try {
      const { id } = req.params;

      const error = await errorLogService.getErrorById(id);

      return APIResponse.success(
        res,
        {
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
        'Error log retrieved successfully'
      );
    } catch (error) {
      if (error.code === 'ERROR_LOG_NOT_FOUND') {
        return next(new NotFoundError(error.message));
      }

      logger.error('Failed to get error log', { error: error.message });
      next(error);
    }
  }

  /**
   * Mark error as resolved
   * @route POST /admin/errors/:id/resolve
   */
  async resolveError(req, res, next) {
    try {
      const { id } = req.params;
      const { resolvedBy = 'manual' } = req.body;

      const error = await errorLogService.markResolved(id, resolvedBy);

      logger.info('Error marked as resolved via admin', {
        errorId: id,
        resolvedBy,
      });

      return APIResponse.success(
        res,
        {
          id: error.id,
          resolved: error.resolved,
          resolvedAt: error.resolvedAt,
          resolvedBy: error.resolvedBy,
        },
        'Error marked as resolved'
      );
    } catch (error) {
      if (error.code === 'ERROR_LOG_NOT_FOUND') {
        return next(new NotFoundError(error.message));
      }

      logger.error('Failed to resolve error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get error statistics
   * @route GET /admin/errors/stats
   */
  async getErrorStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const filters = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const stats = await errorLogService.getErrorStats(filters);

      return APIResponse.success(res, stats, 'Error statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get error statistics', { error: error.message });
      next(error);
    }
  }

  /**
   * Retry a failed operation
   * @route POST /admin/errors/:id/retry
   * NOTE: This is a placeholder - actual retry logic depends on operation type
   */
  async retryError(req, res, next) {
    try {
      const { id } = req.params;

      const error = await errorLogService.getErrorById(id);

      // Check if retryable
      if (!error.retryable) {
        throw new ValidationError('This error is not retryable');
      }

      // Check if already resolved
      if (error.resolved) {
        throw new ValidationError('This error is already resolved');
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

      return APIResponse.success(
        res,
        {
          id: error.id,
          operation: error.operation,
          retryCount: error.retryCount + 1,
          context: error.context,
        },
        'Retry count incremented. Manual retry required for this operation type.'
      );
    } catch (error) {
      if (error.code === 'ERROR_LOG_NOT_FOUND') {
        return next(new NotFoundError(error.message));
      }

      logger.error('Failed to retry error', { error: error.message });
      next(error);
    }
  }
}

module.exports = new ErrorRecoveryController();
