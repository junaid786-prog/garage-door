const express = require('express');
const router = express.Router();
const controller = require('./controller');
const {
  validateZipCode,
  validateCoordinates,
  validateDistance,
  validateGeoDataQuery,
} = require('./validator');

/**
 * Geo location routes
 * Handles geolocation and service area endpoints
 */

// Legacy endpoint (backward compatibility)
router.get('/', validateGeoDataQuery, controller.getGeoData);

// Get location data by ZIP code
router.get('/zip/:zipCode', validateZipCode, controller.getLocationByZip);

// Get location data by coordinates (lat/lng in query params)
router.get('/coordinates', validateCoordinates, controller.getLocationByCoordinates);

// Validate service area for a ZIP code
router.get('/validate/:zipCode', validateZipCode, controller.validateServiceArea);

// Get all serviceable areas
router.get('/service-areas', controller.getServiceableAreas);

// Calculate distance between two points (POST for complex payload)
router.post('/distance', validateDistance, controller.calculateDistance);

module.exports = router;
