const service = require('./service');
const APIResponse = require('../../utils/response');
const { ValidationError } = require('../../utils/errors');

/**
 * Geo controller - handles geolocation and service area requests
 */
class GeoController {
  /**
   * Get location data by ZIP code
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getLocationByZip(req, res, next) {
    try {
      const { zipCode } = req.params;

      if (!zipCode) {
        throw new ValidationError('ZIP code is required');
      }

      const locationData = await service.getLocationByZip(zipCode);
      return APIResponse.success(res, locationData, 'Location data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get location data by coordinates
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getLocationByCoordinates(req, res, next) {
    try {
      const { latitude, longitude } = req.query;

      if (!latitude || !longitude) {
        throw new ValidationError('Latitude and longitude are required');
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        throw new ValidationError('Invalid latitude or longitude format');
      }

      const locationData = await service.getLocationByCoordinates(lat, lng);
      return APIResponse.success(res, locationData, 'Location data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate service area by ZIP code
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async validateServiceArea(req, res, next) {
    try {
      const { zipCode } = req.params;

      if (!zipCode) {
        throw new ValidationError('ZIP code is required');
      }

      const validation = await service.validateServiceArea(zipCode);
      return APIResponse.success(res, validation, 'Service area validation completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all serviceable areas
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getServiceableAreas(req, res, next) {
    try {
      const serviceAreas = await service.getServiceableAreas();
      return APIResponse.success(res, serviceAreas, 'Serviceable areas retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate distance between two points
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async calculateDistance(req, res, next) {
    try {
      const { point1, point2 } = req.body;

      if (!point1 || !point2) {
        throw new ValidationError('Two points are required for distance calculation');
      }

      const distanceData = await service.calculateDistance(point1, point2);
      return APIResponse.success(res, distanceData, 'Distance calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Legacy endpoint for backward compatibility
  async getGeoData(req, res, next) {
    try {
      const { zip } = req.query;
      const zipCode = zip || '85251'; // Default to Scottsdale

      const locationData = await service.getLocationByZip(zipCode);

      // Return in legacy format for compatibility
      const legacyFormat = {
        zip: locationData.zip,
        city: locationData.city,
        state: locationData.state,
        serviceArea: locationData.serviceArea,
      };

      return APIResponse.success(res, legacyFormat, 'Geo data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

const controller = new GeoController();
module.exports = {
  getLocationByZip: controller.getLocationByZip.bind(controller),
  getLocationByCoordinates: controller.getLocationByCoordinates.bind(controller),
  validateServiceArea: controller.validateServiceArea.bind(controller),
  getServiceableAreas: controller.getServiceableAreas.bind(controller),
  calculateDistance: controller.calculateDistance.bind(controller),
  getGeoData: controller.getGeoData.bind(controller), // Legacy endpoint
};
