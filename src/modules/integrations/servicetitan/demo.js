/**
 * ServiceTitan Integration Demo
 * Demonstrates how the booking service integrates with ServiceTitan
 */

const bookingService = require('../../bookings/service');
const serviceTitanIntegration = require('./integration');

async function demonstrateIntegration() {
  console.log('🚀 ServiceTitan Integration Demo\n');

  try {
    // Test 1: Test ServiceTitan connection
    console.log('1️⃣ Testing ServiceTitan Connection...');
    const connectionTest = await serviceTitanIntegration.testConnection();

    if (connectionTest.success) {
      console.log('✅ ServiceTitan connection successful');
      console.log(`   - Authenticated: ${connectionTest.authenticated}`);
      console.log(`   - Health: ${connectionTest.health}`);
      console.log(`   - Jobs created: ${connectionTest.jobsCreated}\n`);
    } else {
      console.log('❌ ServiceTitan connection failed:', connectionTest.error);
      return;
    }

    // Test 2: Create a booking (this will automatically create ServiceTitan job)
    console.log('2️⃣ Creating a booking with ServiceTitan integration...');

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
    console.log('✅ Booking created successfully');
    console.log(`   - Booking ID: ${booking.id}`);
    console.log(`   - Status: ${booking.status}`);

    if (booking.serviceTitanJobId) {
      console.log(`   - ServiceTitan Job ID: ${booking.serviceTitanJobId}`);
      console.log(`   - ServiceTitan Job Number: ${booking.serviceTitanJobNumber}`);
      console.log(`   - ServiceTitan Status: ${booking.serviceTitanStatus}\n`);
    } else {
      console.log(`   - ServiceTitan Status: ${booking.serviceTitanStatus}`);
      console.log(`   - ServiceTitan Error: ${booking.serviceTitanError}\n`);
    }

    // Test 3: Get ServiceTitan job details
    if (booking.serviceTitanJobId) {
      console.log('3️⃣ Retrieving ServiceTitan job details...');

      const jobDetails = await bookingService.getServiceTitanJobDetails(booking.id);
      console.log('✅ ServiceTitan job details retrieved');
      console.log(`   - Job Number: ${jobDetails.serviceTitan.jobNumber}`);
      console.log(`   - Priority: ${jobDetails.serviceTitan.priority}`);
      console.log(`   - Customer: ${jobDetails.serviceTitan.customer.name}`);
      console.log(`   - Description: ${jobDetails.serviceTitan.description}`);
      console.log(
        `   - Estimated Duration: ${jobDetails.serviceTitan.estimatedDuration} minutes\n`
      );

      // Test 4: Update job status
      console.log('4️⃣ Updating ServiceTitan job status...');

      const updatedBooking = await bookingService.updateServiceTitanStatus(
        booking.id,
        'dispatched'
      );
      console.log('✅ ServiceTitan status updated');
      console.log(`   - New Status: ${updatedBooking.serviceTitanStatus}\n`);
    }

    // Test 5: Test error scenario
    console.log('5️⃣ Testing error scenario...');

    const errorBookingData = {
      ...sampleBookingData,
      email: 'error@test.com', // This will trigger an error in simulation
      contact: {
        phoneE164: '+14805550000',
        name: 'Error Test',
      },
    };

    const errorBooking = await bookingService.createBooking(errorBookingData);
    console.log('✅ Error booking created (demonstrates error handling)');
    console.log(`   - Booking ID: ${errorBooking.id}`);
    console.log(`   - ServiceTitan Status: ${errorBooking.serviceTitanStatus}`);
    console.log(`   - ServiceTitan Error: ${errorBooking.serviceTitanError}\n`);

    console.log('🎉 ServiceTitan Integration Demo Complete!\n');

    console.log('📋 Summary:');
    console.log('- ServiceTitan is integrated directly into booking creation');
    console.log('- Jobs are automatically created when bookings are made');
    console.log('- Error handling preserves booking even if ServiceTitan fails');
    console.log('- Status updates can be made through booking service');
    console.log('- Ready for real ServiceTitan API (just replace service implementation)\n');
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack:', error.stack);
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
