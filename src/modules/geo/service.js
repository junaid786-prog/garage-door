/**
 * Geo location service
 * Provides geolocation functionality for addresses and ZIP codes
 */
class GeoService {
  /**
   * Get location data by ZIP code
   * @param {string} zipCode - ZIP code to lookup
   * @returns {Promise<Object>} Location data
   */
  async getLocationByZip(zipCode) {
    if (!zipCode) {
      throw new Error('ZIP code is required');
    }

    // Dummy data for now - replace with actual geolocation service
    const dummyData = {
      zip: zipCode,
      city: this._getDummyCity(zipCode),
      state: this._getDummyState(zipCode),
      county: this._getDummyCounty(zipCode),
      coordinates: this._getDummyCoordinates(zipCode),
      timezone: this._getDummyTimezone(zipCode),
      serviceArea: this._getServiceArea(zipCode),
    };

    return dummyData;
  }

  /**
   * Get location data by coordinates (lat/lng)
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<Object>} Location data
   */
  async getLocationByCoordinates(latitude, longitude) {
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    // Dummy data for now - replace with actual reverse geocoding service
    const dummyData = {
      coordinates: { latitude, longitude },
      zip: this._getDummyZipFromCoords(latitude, longitude),
      city: 'Phoenix',
      state: 'AZ',
      county: 'Maricopa',
      timezone: 'America/Phoenix',
      serviceArea: true,
    };

    return dummyData;
  }

  /**
   * Validate if ZIP code is in service area
   * @param {string} zipCode - ZIP code to validate
   * @returns {Promise<Object>} Service area validation
   */
  async validateServiceArea(zipCode) {
    if (!zipCode) {
      throw new Error('ZIP code is required');
    }

    // Dummy validation - replace with actual service area logic
    const serviceableZips = [
      '85001', '85002', '85003', '85004', '85005', '85006', '85007', '85008', '85009', '85010',
      '85251', '85252', '85253', '85254', '85255', '85256', '85257', '85258', '85259', '85260',
      '85301', '85302', '85303', '85304', '85305', '85306', '85307', '85308', '85309', '85310',
    ];

    const isServiceable = serviceableZips.includes(zipCode);

    return {
      zipCode,
      isServiceable,
      message: isServiceable 
        ? 'Service available in this area' 
        : 'Service not available in this area',
      estimatedServiceRadius: isServiceable ? '25 miles' : null,
    };
  }

  /**
   * Get all serviceable areas
   * @returns {Promise<Array>} List of serviceable ZIP codes and areas
   */
  async getServiceableAreas() {
    // Dummy data for now - replace with actual service area data
    return {
      zipCodes: [
        '85001', '85002', '85003', '85004', '85005', '85251', '85252', '85253', '85301', '85302'
      ],
      cities: ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Glendale'],
      states: ['AZ'],
      serviceRadius: '25 miles from Phoenix metro area',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate distance between two points
   * @param {Object} point1 - First point {latitude, longitude}
   * @param {Object} point2 - Second point {latitude, longitude}
   * @returns {Promise<Object>} Distance calculation
   */
  async calculateDistance(point1, point2) {
    if (!point1?.latitude || !point1?.longitude || !point2?.latitude || !point2?.longitude) {
      throw new Error('Valid coordinates required for both points');
    }

    // Simple distance calculation (replace with more accurate formula if needed)
    const R = 3959; // Earth's radius in miles
    const dLat = this._toRadians(point2.latitude - point1.latitude);
    const dLon = this._toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRadians(point1.latitude)) * 
      Math.cos(this._toRadians(point2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return {
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      unit: 'miles',
      point1,
      point2,
    };
  }

  /**
   * Get serviceable ZIP codes for scheduling integration
   * @returns {Array<string>} List of serviceable ZIP codes
   */
  getServiceableZipCodes() {
    return [
      '85001', '85002', '85003', '85004', '85005', '85006', '85007', '85008', '85009', '85010',
      '85251', '85252', '85253', '85254', '85255', '85256', '85257', '85258', '85259', '85260',
      '85301', '85302', '85303', '85304', '85305', '85306', '85307', '85308', '85309', '85310',
    ];
  }

  /**
   * Validate if ZIP code has scheduling service available
   * @param {string} zipCode - ZIP code to validate
   * @returns {Promise<Object>} Scheduling availability validation
   */
  async validateSchedulingAvailability(zipCode) {
    if (!zipCode) {
      throw new Error('ZIP code is required');
    }

    const serviceableZips = this.getServiceableZipCodes();
    const isServiceable = serviceableZips.includes(zipCode);
    const locationData = await this.getLocationByZip(zipCode);

    return {
      zipCode,
      isServiceable,
      hasScheduling: isServiceable,
      city: locationData.city,
      state: locationData.state,
      timezone: locationData.timezone,
      message: isServiceable 
        ? 'Scheduling service available in this area' 
        : 'Scheduling service not available in this area',
      serviceHours: isServiceable ? {
        start: '09:00',
        end: '17:00',
        timezone: 'America/Phoenix',
        weekdays: true,
        weekends: false
      } : null,
    };
  }

  /**
   * Get timezone for a ZIP code (used by scheduling service)
   * @param {string} zipCode - ZIP code
   * @returns {string} Timezone identifier
   */
  getTimezoneForZip(zipCode) {
    // All Arizona ZIP codes use Phoenix timezone (no daylight saving)
    return 'America/Phoenix';
  }

  // Private helper methods for dummy data generation
  _getDummyCity(zipCode) {
    const cityMap = {
      '85001': 'Phoenix',
      '85251': 'Scottsdale',
      '85301': 'Glendale',
    };
    return cityMap[zipCode] || 'Phoenix';
  }

  _getDummyState(zipCode) {
    // All Arizona ZIP codes for this service
    return 'AZ';
  }

  _getDummyCounty(zipCode) {
    return 'Maricopa';
  }

  _getDummyCoordinates(zipCode) {
    const coordsMap = {
      '85001': { latitude: 33.4484, longitude: -112.0740 },
      '85251': { latitude: 33.4942, longitude: -111.9261 },
      '85301': { latitude: 33.5387, longitude: -112.1860 },
    };
    return coordsMap[zipCode] || { latitude: 33.4484, longitude: -112.0740 };
  }

  _getDummyTimezone(zipCode) {
    return 'America/Phoenix';
  }

  _getServiceArea(zipCode) {
    // Dummy service area check
    const serviceableZips = [
      '85001', '85002', '85003', '85004', '85005', '85251', '85252', '85253', '85301', '85302'
    ];
    return serviceableZips.includes(zipCode);
  }

  _getDummyZipFromCoords(latitude, longitude) {
    // Very basic coordinate to ZIP mapping for Phoenix area
    if (latitude >= 33.4 && latitude <= 33.5 && longitude >= -112.1 && longitude <= -112.0) {
      return '85001'; // Phoenix area
    } else if (latitude >= 33.45 && latitude <= 33.55 && longitude >= -111.95 && longitude <= -111.9) {
      return '85251'; // Scottsdale area
    } else {
      return '85001'; // Default to Phoenix
    }
  }

  _toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new GeoService();