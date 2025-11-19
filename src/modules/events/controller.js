const service = require('./service');
const APIResponse = require('../../utils/response');

/**
 * Event controller - handles event tracking requests
 */
class EventController {
  /**
   * Track a new event
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async track(req, res, next) {
    try {
      const { ...data } = req.body;

      const event = await service.track(data?.event, {
        ...data,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });

      return APIResponse.created(res, event, 'Event tracked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all events with optional filters
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getEvents(req, res, next) {
    try {
      const filters = {
        name: req.query.name,
        sessionId: req.query.sessionId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        properties: req.query.properties ? JSON.parse(req.query.properties) : undefined,
      };

      const pagination = {
        limit: req.query.limit,
        offset: req.query.offset,
        orderBy: req.query.orderBy,
        orderDir: req.query.orderDir,
      };

      const result = await service.getEvents(filters, pagination);
      return APIResponse.success(res, result, 'Events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event statistics
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getStats(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const stats = await service.getStats(filters);
      return APIResponse.success(res, stats, 'Event statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get events for a specific session
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getSessionEvents(req, res, next) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return APIResponse.badRequest(res, 'Session ID is required');
      }

      const events = await service.getSessionEvents(sessionId);
      return APIResponse.success(res, events, 'Session events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get funnel analysis
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getFunnelAnalysis(req, res, next) {
    try {
      const { eventNames } = req.body;

      if (!eventNames || !Array.isArray(eventNames)) {
        return APIResponse.badRequest(res, 'Event names array is required in request body');
      }

      const filters = {
        startDate: req.body.startDate || req.query.startDate,
        endDate: req.body.endDate || req.query.endDate,
      };

      const funnelData = await service.getFunnelAnalysis(eventNames, filters);
      return APIResponse.success(res, funnelData, 'Funnel analysis retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

const controller = new EventController();
module.exports = {
  track: controller.track.bind(controller),
  getEvents: controller.getEvents.bind(controller),
  getStats: controller.getStats.bind(controller),
  getSessionEvents: controller.getSessionEvents.bind(controller),
  getFunnelAnalysis: controller.getFunnelAnalysis.bind(controller),
};
