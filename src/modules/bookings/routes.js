const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { middleware } = require('./validator');

/**
 * Booking management routes
 * Milestone 2: Booking creation and management
 */

// Create a new booking
router.post('/', 
  middleware.validateBookingCreate, 
  controller.createBooking
);

// Get all bookings with filters and pagination
router.get('/', 
  middleware.validateBookingQuery, 
  controller.getBookings
);

// Get booking by ID
router.get('/:id', controller.getBookingById);

// Update booking
router.put('/:id', 
  middleware.validateBookingUpdate, 
  controller.updateBooking
);

// Update booking status only
router.patch('/:id/status', 
  middleware.validateBookingStatus, 
  controller.updateBookingStatus
);

// Delete booking (soft delete - marks as cancelled)
router.delete('/:id', controller.deleteBooking);

// Get bookings by phone number
router.get('/phone/:phone', controller.getBookingsByPhone);

// Link booking to ServiceTitan job (for future integration)
router.post('/:id/servicetitan', 
  controller.linkServiceTitanJob
);

module.exports = router;