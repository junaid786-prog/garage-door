const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { middleware } = require('./validator');
const { bookingRateLimiter, readRateLimiter } = require('../../middleware/rateLimiter');

/**
 * Booking management routes
 * Milestone 2: Booking creation and management
 */

// Create a new booking - Stricter rate limit (10 requests / 15min per IP)
router.post('/', bookingRateLimiter(), middleware.validateBookingCreate, controller.createBooking);

// Get all bookings with filters and pagination - Read rate limit (100 requests / 15min per IP)
router.get('/', readRateLimiter(), middleware.validateBookingQuery, controller.getBookings);

// Get booking by ID - Read rate limit
router.get('/:id', readRateLimiter(), controller.getBookingById);

// Update booking - Booking rate limit
router.put(
  '/:id',
  bookingRateLimiter(),
  middleware.validateBookingUpdate,
  controller.updateBooking
);

// Update booking status only - Booking rate limit
router.patch(
  '/:id/status',
  bookingRateLimiter(),
  middleware.validateBookingStatus,
  controller.updateBookingStatus
);

// Delete booking (soft delete - marks as cancelled) - Booking rate limit
router.delete('/:id', bookingRateLimiter(), controller.deleteBooking);

// Get bookings by phone number - Read rate limit
router.get('/phone/:phone', readRateLimiter(), controller.getBookingsByPhone);

// Link booking to ServiceTitan job - Booking rate limit
router.post('/:id/servicetitan', bookingRateLimiter(), controller.linkServiceTitanJob);

module.exports = router;
