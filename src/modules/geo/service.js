const { ValidationError } = require('../../utils/errors');

/**
 * All serviceable PHX zip codes for V1 (sourced from Rapid Response V1 Zones.csv)
 * 16 zones across the Phoenix metro area
 */
const PHX_SERVICE_ZIPS = new Set([
  // NE - Cave Creek / Carefree
  '85237','85331','85377',
  // NE - Fountain Hills / Fort McDowell / Rio Verde
  '85263','85264','85268','85269',
  // NE - Paradise Valley / Scottsdale
  '85250','85251','85252','85253','85254','85255','85257','85258','85259',
  '85260','85261','85262','85266','85267','85271',
  // NW - Glendale / Peoria
  '85301','85302','85303','85304','85305','85306','85307','85308','85309',
  '85310','85311','85312','85318','85345','85380','85381','85382','85383','85385',
  // NW - Goodyear / Litchfield Park / Buckeye / Waddell / Morristown / Wickenburg
  '85392','85395','85340','85396','85355','85342','85361','85390',
  // NW - Phoenix
  '85017','85019','85031','85033','85035','85037','85039','85051','85063','85079','85083',
  // NW - Sun City / Youngstown / El Mirage / Surprise
  '85351','85372','85373','85374','85375','85376','85379','85387','85335','85363','85378','85388',
  // SE - Gilbert / Chandler / Sun Lakes
  '85233','85234','85236','85295','85296','85297','85298','85299','85127',
  '85224','85225','85226','85244','85246','85248','85249','85286',
  // SE - Maricopa / Casa Grande / Stanfield
  '85121','85122','85130','85138','85139','85172','85193','85194',
  // SE - Mesa / AJ / Gold Canyon
  '85201','85202','85203','85204','85205','85206','85207','85208','85209','85210',
  '85211','85212','85213','85214','85215','85216','85274','85275','85277',
  '85256','85117','85118','85119','85120','85178',
  // SE - Queen Creek / San Tan Valley / Florence / Coolidge / Eloy / AZ City
  '85132','85140','85142','85143','85191','85123','85128','85131','85147','85242','85240','85144',
  // SE - Tempe / Ahwatukee / Phoenix
  '85280','85281','85282','85283','85284','85285','85287','85288',
  '85044','85045','85048','85070','85076',
  // SW - Laveen / Tolleson / Avondale / Cashion / Goodyear / Buckeye
  '85323','85329','85339','85353','85338','85322','85326','85343',
  // SW - Phoenix
  '85001','85002','85003','85004','85005','85006','85007','85008','85009','85010',
  '85026','85030','85034','85038','85040','85041','85042','85043','85060',
  '85062','85065','85066','85072','85073','85074','85075','85082',
  // Central NC - Phoenix / Anthem / New River / Black Canyon
  '85022','85023','85024','85025','85027','85032','85050','85053','85054',
  '85080','85085','85086','85087','85324',
  // Central SC - Phoenix
  '85011','85012','85013','85014','85015','85016','85018','85020','85021',
  '85028','85029','85036','85046','85061','85064','85067','85068','85069','85071','85078',
]);

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
      throw new ValidationError('ZIP code is required');
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
      throw new ValidationError('Latitude and longitude are required');
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
      throw new ValidationError('ZIP code is required');
    }

    const isServiceable = PHX_SERVICE_ZIPS.has(zipCode);

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
    return {
      zipCodes: [...PHX_SERVICE_ZIPS],
      cities: ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Glendale',
               'Peoria', 'Surprise', 'Gilbert', 'Chandler', 'Queen Creek', 'Maricopa'],
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
      throw new ValidationError('Valid coordinates required for both points');
    }

    // Simple distance calculation (replace with more accurate formula if needed)
    const R = 3959; // Earth's radius in miles
    const dLat = this._toRadians(point2.latitude - point1.latitude);
    const dLon = this._toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRadians(point1.latitude)) *
        Math.cos(this._toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

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
    return [...PHX_SERVICE_ZIPS];
  }

  /**
   * Validate if ZIP code has scheduling service available
   * @param {string} zipCode - ZIP code to validate
   * @returns {Promise<Object>} Scheduling availability validation
   */
  async validateSchedulingAvailability(zipCode) {
    if (!zipCode) {
      throw new ValidationError('ZIP code is required');
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
      serviceHours: isServiceable
        ? {
            start: '09:00',
            end: '17:00',
            timezone: 'America/Phoenix',
            weekdays: true,
            weekends: false,
          }
        : null,
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
      85001: 'Phoenix',
      85251: 'Scottsdale',
      85301: 'Glendale',
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
      85001: { latitude: 33.4484, longitude: -112.074 },
      85251: { latitude: 33.4942, longitude: -111.9261 },
      85301: { latitude: 33.5387, longitude: -112.186 },
    };
    return coordsMap[zipCode] || { latitude: 33.4484, longitude: -112.074 };
  }

  _getDummyTimezone(zipCode) {
    return 'America/Phoenix';
  }

  _getServiceArea(zipCode) {
    return PHX_SERVICE_ZIPS.has(zipCode);
  }

  _getDummyZipFromCoords(latitude, longitude) {
    // Very basic coordinate to ZIP mapping for Phoenix area
    if (latitude >= 33.4 && latitude <= 33.5 && longitude >= -112.1 && longitude <= -112.0) {
      return '85001'; // Phoenix area
    } else if (
      latitude >= 33.45 &&
      latitude <= 33.55 &&
      longitude >= -111.95 &&
      longitude <= -111.9
    ) {
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
