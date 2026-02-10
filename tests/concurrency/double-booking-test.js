/**
 * Concurrency Test: Double-Booking Prevention
 *
 * V1: This test verifies the two-layer protection system:
 * 1. Database transactions (atomic operations)
 * 2. Unique constraint on slot_id (database-level protection)
 *
 * V2: Will add Redis slot reservations as third layer for early rejection
 *
 * Expected Result: Only 1 booking succeeds, all others get 409 Conflict
 */

const { performance } = require('perf_hooks');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'garage-door-api-key-2026';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS || '10');
const TEST_ITERATIONS = parseInt(process.env.TEST_ITERATIONS || '1');

// Test data - all requests will use the SAME slot_id to force conflict
const TEST_SLOT_ID = `test-slot-${Date.now()}`;
const TEST_ZIP = '90210';
const TEST_PHONE = '+12125551234';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Generate a booking request payload matching the actual API schema
 */
function generateBookingPayload(index) {
  return {
    service: {
      type: 'repair',
      symptom: 'wont_open',
      can_open_close: 'no',
    },
    door: {
      age_bucket: 'lt_8',
      count: 1,
    },
    address: {
      street: `${index} Test Street`,
      unit: '',
      city: 'Beverly Hills',
      state: 'CA',
      zip: TEST_ZIP,
    },
    occupancy: {
      type: 'homeowner',
    },
    contact: {
      phoneE164: TEST_PHONE,
      name: `Test User ${index}`,
    },
    scheduling: {
      slot_id: TEST_SLOT_ID, // Same slot for all requests to force conflict!
      asap_selected: false,
      priority_score: 50,
    },
    notes: `Concurrency test ${index}`,
    suspected_issue: 'Testing double-booking prevention',
  };
}

/**
 * Make a single booking request
 */
async function makeBookingRequest(index) {
  const startTime = performance.now();

  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(generateBookingPayload(index)),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const duration = performance.now() - startTime;
    const data = await response.json();

    return {
      index,
      success: response.status === 201,
      status: response.status,
      duration,
      bookingId: data?.data?.id || null,
      error: data?.error || data?.message || null,
      data,
    };
  } catch (error) {
    const duration = performance.now() - startTime;

    return {
      index,
      success: false,
      status: 'ERROR',
      duration,
      bookingId: null,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Run concurrent booking requests
 */
async function runConcurrencyTest(iteration = 1) {
  console.log(
    `\n${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(
    `${colors.cyan}  Iteration ${iteration}: Sending ${CONCURRENT_REQUESTS} concurrent requests for slot: ${TEST_SLOT_ID}${colors.reset}`
  );
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`
  );

  const startTime = performance.now();

  // Launch all requests concurrently
  const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => makeBookingRequest(i + 1));

  const results = await Promise.all(promises);
  const totalDuration = performance.now() - startTime;

  return {
    results,
    totalDuration,
    iteration,
  };
}

/**
 * Analyze test results
 */
function analyzeResults(testData) {
  const { results, totalDuration, iteration } = testData;

  // Count successes and failures
  const successes = results.filter((r) => r.success);
  const conflicts = results.filter((r) => r.status === 409);
  const errors = results.filter((r) => !r.success && r.status !== 409);

  // Calculate response time statistics
  const durations = results.map((r) => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  // Print results
  console.log(
    `\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(`${colors.blue}  Test Results - Iteration ${iteration}${colors.reset}`);
  console.log(
    `${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );

  console.log(`Total Requests:        ${CONCURRENT_REQUESTS}`);
  console.log(`${colors.green}✓ Successful (201):    ${successes.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Conflicts (409):     ${conflicts.length}${colors.reset}`);
  console.log(`${colors.red}✗ Errors (other):      ${errors.length}${colors.reset}\n`);

  console.log(`Total Test Duration:   ${totalDuration.toFixed(2)}ms`);
  console.log(`Avg Response Time:     ${avgDuration.toFixed(2)}ms`);
  console.log(`Min Response Time:     ${minDuration.toFixed(2)}ms`);
  console.log(`Max Response Time:     ${maxDuration.toFixed(2)}ms\n`);

  // Show successful booking details
  if (successes.length > 0) {
    console.log(`${colors.green}Successful Bookings:${colors.reset}`);
    successes.forEach((s) => {
      console.log(`  - Request #${s.index}: ${s.bookingId} (${s.duration.toFixed(2)}ms)`);
    });
    console.log('');
  }

  // Show conflict details
  if (conflicts.length > 0) {
    console.log(`${colors.yellow}Conflict Errors (409):${colors.reset}`);
    conflicts.forEach((c) => {
      console.log(`  - Request #${c.index}: ${c.error} (${c.duration.toFixed(2)}ms)`);
    });
    console.log('');
  }

  // Show other errors
  if (errors.length > 0) {
    console.log(`${colors.red}Other Errors:${colors.reset}`);
    errors.forEach((e) => {
      console.log(`  - Request #${e.index}: [${e.status}] ${e.error} (${e.duration.toFixed(2)}ms)`);
    });
    console.log('');
  }

  return {
    passed:
      successes.length === 1 && conflicts.length === CONCURRENT_REQUESTS - 1 && errors.length === 0,
    successes: successes.length,
    conflicts: conflicts.length,
    errors: errors.length,
    avgDuration,
    minDuration,
    maxDuration,
    totalDuration,
  };
}

/**
 * Print final test summary
 */
function printFinalSummary(allResults) {
  console.log(
    `\n${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.cyan}  FINAL TEST SUMMARY${colors.reset}`);
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`
  );

  const totalTests = allResults.length;
  const passedTests = allResults.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Iterations:      ${totalTests}`);
  console.log(`${colors.green}✓ Passed:              ${passedTests}${colors.reset}`);
  console.log(`${colors.red}✗ Failed:              ${failedTests}${colors.reset}\n`);

  // Aggregate statistics
  const totalRequests = totalTests * CONCURRENT_REQUESTS;
  const totalSuccesses = allResults.reduce((sum, r) => sum + r.successes, 0);
  const totalConflicts = allResults.reduce((sum, r) => sum + r.conflicts, 0);
  const totalErrors = allResults.reduce((sum, r) => sum + r.errors, 0);

  console.log(`Total Requests Sent:   ${totalRequests}`);
  console.log(
    `${colors.green}Total Successful:      ${totalSuccesses} (${((totalSuccesses / totalRequests) * 100).toFixed(1)}%)${colors.reset}`
  );
  console.log(
    `${colors.yellow}Total Conflicts:       ${totalConflicts} (${((totalConflicts / totalRequests) * 100).toFixed(1)}%)${colors.reset}`
  );
  console.log(
    `${colors.red}Total Errors:          ${totalErrors} (${((totalErrors / totalRequests) * 100).toFixed(1)}%)${colors.reset}\n`
  );

  // Determine overall result
  const allPassed = failedTests === 0;

  if (allPassed) {
    console.log(
      `${colors.green}╔═══════════════════════════════════════════════════════════╗${colors.reset}`
    );
    console.log(
      `${colors.green}║                    ✓ ALL TESTS PASSED                     ║${colors.reset}`
    );
    console.log(
      `${colors.green}║                                                           ║${colors.reset}`
    );
    console.log(
      `${colors.green}║  Double-booking prevention is working correctly!          ║${colors.reset}`
    );
    console.log(
      `${colors.green}║  - Exactly 1 booking succeeded per iteration              ║${colors.reset}`
    );
    console.log(
      `${colors.green}║  - All duplicates returned 409 Conflict                   ║${colors.reset}`
    );
    console.log(
      `${colors.green}║  - No unexpected errors occurred                          ║${colors.reset}`
    );
    console.log(
      `${colors.green}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`
    );
  } else {
    console.log(
      `${colors.red}╔═══════════════════════════════════════════════════════════╗${colors.reset}`
    );
    console.log(
      `${colors.red}║                    ✗ TESTS FAILED                         ║${colors.reset}`
    );
    console.log(
      `${colors.red}║                                                           ║${colors.reset}`
    );
    console.log(
      `${colors.red}║  Double-booking prevention has issues!                    ║${colors.reset}`
    );
    console.log(
      `${colors.red}║  Please review the test results above.                    ║${colors.reset}`
    );
    console.log(
      `${colors.red}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`
    );
  }

  return allPassed;
}

/**
 * Verify server is running
 */
async function verifyServerRunning() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();

    if (data.status === 'healthy') {
      console.log(`${colors.green}✓ Server is running at ${API_BASE_URL}${colors.reset}\n`);
      return true;
    }

    console.log(`${colors.red}✗ Server health check failed${colors.reset}\n`);
    return false;
  } catch (error) {
    console.log(`${colors.red}✗ Cannot connect to server at ${API_BASE_URL}${colors.reset}`);
    console.log(`${colors.red}  Error: ${error.message}${colors.reset}\n`);
    return false;
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log(
    `\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.cyan}║         CONCURRENCY TEST: DOUBLE-BOOKING PREVENTION       ║${colors.reset}`
  );
  console.log(
    `${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`
  );

  console.log(`Configuration:`);
  console.log(`  API URL:             ${API_BASE_URL}`);
  console.log(`  Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`  Test Iterations:     ${TEST_ITERATIONS}`);
  console.log(`  Test Slot ID:        ${TEST_SLOT_ID}\n`);

  // Verify server is running
  const serverRunning = await verifyServerRunning();
  if (!serverRunning) {
    console.log(`${colors.red}Please start the server and try again.${colors.reset}\n`);
    process.exit(1);
  }

  // Run test iterations
  const allResults = [];

  for (let i = 1; i <= TEST_ITERATIONS; i++) {
    const testData = await runConcurrencyTest(i);
    const analysis = analyzeResults(testData);
    allResults.push(analysis);

    // Small delay between iterations
    if (i < TEST_ITERATIONS) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Print final summary
  const allPassed = printFinalSummary(allResults);

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});

// Run the test
main();
