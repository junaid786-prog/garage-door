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
      const { eventName, eventData } = req.body;

      const event = await service.track(eventName, {
        ...eventData,
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
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      };

      const events = await service.getEvents(filters);
      return APIResponse.success(res, events, 'Events retrieved successfully');
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
      const stats = await service.getStats();
      return APIResponse.success(res, stats, 'Event statistics retrieved successfully');
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
};
