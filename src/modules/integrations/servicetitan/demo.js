/**
 * ServiceTitan Integration Demo
 * Demonstrates how the booking service integrates with ServiceTitan
 */

const bookingService = require('../../bookings/service');
const serviceTitanIntegration = require('./integration');

async function demonstrateIntegration() {
  logger.info('🚀 ServiceTitan Integration Demo\n');

  try {
    // Test 1: Test ServiceTitan connection
    logger.info('1️⃣ Testing ServiceTitan Connection...');
    const connectionTest = await serviceTitanIntegration.testConnection();

    if (connectionTest.success) {
      logger.info('✅ ServiceTitan connection successful');
      logger.info(`   - Authenticated: ${connectionTest.authenticated}`);
      logger.info(`   - Health: ${connectionTest.health}`);
      logger.info(`   - Jobs created: ${connectionTest.jobsCreated}\n`);
    } else {
      logger.info('❌ ServiceTitan connection failed:', connectionTest.error);
      return;
    }

    // Test 2: Create a booking (this will automatically create ServiceTitan job)
    logger.info('2️⃣ Creating a booking with ServiceTitan integration...');

    const sampleBookingData = {
      // Service details
      service: {
        type: 'repair',
        symptom: 'spring_bang',
        can_open_close: 'no',
      },

      // Door details
      door: {
        age_bucket: 'gte_8',
        count: 2,
      },

      // Address
      address: {
        street: '123 Main Street',
        unit: '',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001',
      },

      // Contact
      contact: {
        phoneE164: '+14805551234',
        name: 'John Doe',
      },

      // Occupancy
      occupancy: {
        type: 'homeowner',
        renterPermission: null,
      },

      // Scheduling
      scheduling: {
        slot_id: 'slot_12345',
        asap_selected: false,
        priority_score: 85,
      },

      // Additional info for ServiceTitan
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      phone: '4805551234',
      problemType: 'broken_spring',
      scheduledDate: new Date().toISOString(),
      timeSlot: '9:00 AM - 11:00 AM',
    };

    const booking = await bookingService.createBooking(sampleBookingData);
    logger.info('✅ Booking created successfully');
    logger.info(`   - Booking ID: ${booking.id}`);
    logger.info(`   - Status: ${booking.status}`);

    if (booking.serviceTitanJobId) {
      logger.info(`   - ServiceTitan Job ID: ${booking.serviceTitanJobId}`);
      logger.info(`   - ServiceTitan Job Number: ${booking.serviceTitanJobNumber}`);
      logger.info(`   - ServiceTitan Status: ${booking.serviceTitanStatus}\n`);
    } else {
      logger.info(`   - ServiceTitan Status: ${booking.serviceTitanStatus}`);
      logger.info(`   - ServiceTitan Error: ${booking.serviceTitanError}\n`);
    }

    // Test 3: Get ServiceTitan job details
    if (booking.serviceTitanJobId) {
      logger.info('3️⃣ Retrieving ServiceTitan job details...');

      const jobDetails = await bookingService.getServiceTitanJobDetails(booking.id);
      logger.info('✅ ServiceTitan job details retrieved');
      logger.info(`   - Job Number: ${jobDetails.serviceTitan.jobNumber}`);
      logger.info(`   - Priority: ${jobDetails.serviceTitan.priority}`);
      logger.info(`   - Customer: ${jobDetails.serviceTitan.customer.name}`);
      logger.info(`   - Description: ${jobDetails.serviceTitan.description}`);
      logger.info(
        `   - Estimated Duration: ${jobDetails.serviceTitan.estimatedDuration} minutes\n`
      );

      // Test 4: Update job status
      logger.info('4️⃣ Updating ServiceTitan job status...');

      const updatedBooking = await bookingService.updateServiceTitanStatus(
        booking.id,
        'dispatched'
      );
      logger.info('✅ ServiceTitan status updated');
      logger.info(`   - New Status: ${updatedBooking.serviceTitanStatus}\n`);
    }

    // Test 5: Test error scenario
    logger.info('5️⃣ Testing error scenario...');

    const errorBookingData = {
      ...sampleBookingData,
      email: 'error@test.com', // This will trigger an error in simulation
      contact: {
        phoneE164: '+14805550000',
        name: 'Error Test',
      },
    };

    const errorBooking = await bookingService.createBooking(errorBookingData);
    logger.info('✅ Error booking created (demonstrates error handling)');
    logger.info(`   - Booking ID: ${errorBooking.id}`);
    logger.info(`   - ServiceTitan Status: ${errorBooking.serviceTitanStatus}`);
    logger.info(`   - ServiceTitan Error: ${errorBooking.serviceTitanError}\n`);

    logger.info('🎉 ServiceTitan Integration Demo Complete!\n');

    logger.info('📋 Summary:');
    logger.info('- ServiceTitan is integrated directly into booking creation');
    logger.info('- Jobs are automatically created when bookings are made');
    logger.info('- Error handling preserves booking even if ServiceTitan fails');
    logger.info('- Status updates can be made through booking service');
    logger.info('- Ready for real ServiceTitan API (just replace service implementation)\n');
  } catch (error) {
    logger.error('❌ Demo failed:', error.message);
    logger.error('Stack:', error.stack);
  }
}

// Export for use in other contexts
module.exports = {
  demonstrateIntegration,
};

// Run demo if executed directly
if (require.main === module) {
  demonstrateIntegration();
}
