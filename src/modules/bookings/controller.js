const service = require('./service');
const APIResponse = require('../../utils/response');

/**
 * Booking controller - handles HTTP requests
 */
class BookingController {
  /**
   * Create new booking
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async create(req, res, next) {
    try {
      const booking = await service.createBooking(req.body);
      return APIResponse.created(res, booking, 'Booking created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get booking by ID
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const booking = await service.getBookingById(id);

      if (!booking) {
        return APIResponse.notFound(res, 'Booking not found');
      }

      return APIResponse.success(res, booking, 'Booking retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

const controller = new BookingController();
module.exports = {
  create: controller.create.bind(controller),
  getById: controller.getById.bind(controller),
};
