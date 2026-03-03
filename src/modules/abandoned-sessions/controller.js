const service = require('./service');
const APIResponse = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * Abandoned Session Controller
 * Phase 1: Handle HTTP requests for abandoned session creation
 * Phase 2: ServiceTitan integration will be added
 */
class AbandonedSessionController {
  /**
   * Create abandoned session record
   * POST /api/abandoned-sessions
   * @param {Request} req
   * @param {Response} res
   * @param {Next Function} next
   */
  async createAbandonedSession(req, res, next) {
    try {
      // Check if this session was already sent to avoid duplicates
      const alreadySent = await service.isSessionAlreadySent(req.body.sessionId);

      if (alreadySent) {
        logger.info('Abandoned session already recorded and sent to ServiceTitan', {
          sessionId: req.body.sessionId,
        });

        return APIResponse.success(res, null, 'Session already recorded');
      }

      // Create abandoned session record
      const session = await service.createAbandonedSession(req.body);

      // Queue for ServiceTitan processing (async, don't block response)
      setImmediate(() => {
        service.sendToServiceTitan(session.id).catch(err => {
          logger.error('Failed to send abandoned session to ServiceTitan', {
            sessionId: session.id,
            error: err.message,
          });
        });
      });

      return APIResponse.created(res, {
        id: session.id,
        sessionId: session.sessionId,
      }, 'Abandoned session recorded');
    } catch (error) {
      logger.error('Failed to create abandoned session', {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  }

  /**
   * Get abandoned session by ID
   * GET /api/abandoned-sessions/:id
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getAbandonedSession(req, res, next) {
    try {
      const session = await service.getAbandonedSessionById(req.params.id);

      if (!session) {
        return APIResponse.notFound(res, 'Abandoned session not found');
      }

      return APIResponse.success(res, session);
    } catch (error) {
      logger.error('Failed to get abandoned session', {
        error: error.message,
        sessionId: req.params.id,
      });
      next(error);
    }
  }
}

module.exports = new AbandonedSessionController();
