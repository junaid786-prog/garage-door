const express = require('express');
const router = express.Router();
const controller = require('./controller');
const {
  validateAvailableSlotsQuery,
  validateSlotReservation,
  validateSlotCancellation,
  validateServiceAvailabilityQuery,
  validateSlotIdParam,
  validateDateNotInPast,
  validateRateLimit,
} = require('./validator');

/**
 * Scheduling routes
 * Handles time slot availability, reservations, and scheduling operations
 */

// Get available time slots for a ZIP code
router.get('/slots', 
  validateRateLimit,
  validateAvailableSlotsQuery,
  validateDateNotInPast,
  controller.getAvailableSlots
);

// Check service availability for a ZIP code
router.get('/availability',
  validateServiceAvailabilityQuery,
  controller.checkServiceAvailability
);

// Reserve a time slot
router.post('/reserve',
  validateSlotReservation,
  controller.reserveSlot
);

// Cancel a slot reservation
router.delete('/reserve/:slotId',
  validateSlotIdParam,
  validateSlotCancellation,
  controller.cancelReservation
);

// Admin endpoints

// Get current reservations (admin)
router.get('/admin/reservations',
  controller.getCurrentReservations
);

// Cleanup expired reservations (admin)
router.post('/admin/cleanup',
  controller.cleanupExpiredReservations
);

// Get scheduling system health
router.get('/health',
  controller.getHealth
);

module.exports = router;