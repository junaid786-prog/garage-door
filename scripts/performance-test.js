#!/usr/bin/env node

/**
 * Performance Testing Script
 *
 * Tests API endpoint performance with concurrent requests.
 * Measures response times, calculates percentiles, and reports statistics.
 *
 * Usage:
 *   node scripts/performance-test.js [endpoint] [concurrency] [iterations]
 *
 * Examples:
 *   node scripts/performance-test.js /health 100 1
 *   node scripts/performance-test.js /api/bookings 50 10
 */

const http = require('http');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key-12345';

// Parse command line arguments
const endpoint = process.argv[2] || '/health';
const concurrency = parseInt(process.argv[3] || '100', 10);
const iterations = parseInt(process.argv[4] || '1', 10);

// Sample booking data for POST requests (matches actual schema)
const SAMPLE_BOOKING = {
  service: {
    type: 'repair',
    symptom: 'wont_open',
    can_open_close: 'no',
  },
  door: {
    age_bucket: 'lt_8',
    count: 1,
  },
  replacement_pref: null,
  address: {
    street: '123 Performance Test St',
    unit: '',
    city: 'Beverly Hills',
    state: 'CA',
    zip: '90210',
  },
  occupancy: {
    type: 'homeowner',
    renterPermission: false,
  },
  contact: {
    phoneE164: '+12125551234',
    name: 'Performance Test User',
  },
  scheduling: {
    slot_id: `perf-test-slot-${Date.now()}`,
    asap_selected: false,
    priority_score: 50,
  },
  notes: 'Automated performance test booking',
  suspected_issue: 'Performance testing',
};

/**
 * Make a single HTTP request
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @param {Object} data - Request body (for POST/PUT)
 * @returns {Promise<Object>} Response data and timing
 */
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const startTime = process.hrtime.bigint();

    // Generate unique slot_id for booking requests
    let requestData = data;
    if (data && data.scheduling && data.scheduling.slot_id) {
      requestData = JSON.parse(JSON.stringify(data)); // Deep clone
      requestData.scheduling.slot_id = `perf-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    };

    if (requestData) {
      const body = JSON.stringify(requestData);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000;

        resolve({
          statusCode: res.statusCode,
          duration: durationMs,
          responseTime: res.headers['x-response-time'],
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (error) => {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      resolve({
        statusCode: 0,
        error: error.message,
        duration: durationMs,
        success: false,
      });
    });

    if (requestData) {
      req.write(JSON.stringify(requestData));
    }

    req.end();
  });
}

/**
 * Calculate percentiles from sorted array
 * @param {Array<number>} sortedArray - Sorted array of numbers
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Percentile value
 */
function calculatePercentile(sortedArray, percentile) {
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Calculate statistics from response times
 * @param {Array<number>} durations - Array of response durations in ms
 * @returns {Object} Statistics
 */
function calculateStats(durations) {
  if (!durations || durations.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      p95: 0,
      p99: 0,
    };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: calculatePercentile(sorted, 50),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
  };
}

/**
 * Run performance test
 */
async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         API Performance Testing Tool                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`Configuration:`);
  console.log(`  Endpoint:     ${endpoint}`);
  console.log(`  Base URL:     ${BASE_URL}`);
  console.log(`  Concurrency:  ${concurrency} requests`);
  console.log(`  Iterations:   ${iterations}`);
  console.log(`  Total:        ${concurrency * iterations} requests\n`);

  const method = endpoint.includes('/bookings') ? 'POST' : 'GET';
  const data = method === 'POST' ? SAMPLE_BOOKING : null;

  console.log(`Starting performance test...\n`);

  const allDurations = [];
  const allResults = [];

  for (let iter = 1; iter <= iterations; iter++) {
    console.log(`Iteration ${iter}/${iterations}...`);

    // Create array of concurrent requests
    const requests = Array.from({ length: concurrency }, () =>
      makeRequest(endpoint, method, data).catch((err) => err)
    );

    // Execute all requests concurrently
    const iterStartTime = Date.now();
    const results = await Promise.all(requests);
    const iterDuration = Date.now() - iterStartTime;

    // Collect results
    const successCount = results.filter((r) => r.success).length;
    const durations = results
      .filter((r) => r.success && r.duration)
      .map((r) => r.duration);

    allDurations.push(...durations);
    allResults.push(...results);

    // Show errors for debugging (only first iteration)
    if (iter === 1 && successCount === 0) {
      const errors = results.filter((r) => !r.success);
      if (errors.length > 0) {
        console.log(`  ⚠ Sample error: ${errors[0].error || 'Unknown error'}`);
        console.log(`  ⚠ Status codes: ${results.map((r) => r.statusCode).join(', ')}`);
      }
    }

    console.log(
      `  ✓ Completed in ${iterDuration}ms (${successCount}/${concurrency} successful)\n`
    );
  }

  // Calculate overall statistics
  const stats = calculateStats(allDurations);
  const successCount = allResults.filter((r) => r.success).length;
  const errorCount = allResults.length - successCount;
  const successRate = (successCount / allResults.length) * 100;

  // Display results
  console.log('═════════════════════════════════════════════════════════');
  console.log('Performance Test Results');
  console.log('═════════════════════════════════════════════════════════\n');

  console.log('Response Times (milliseconds):');
  console.log(`  Min:      ${stats.min.toFixed(2)} ms`);
  console.log(`  Max:      ${stats.max.toFixed(2)} ms`);
  console.log(`  Average:  ${stats.avg.toFixed(2)} ms`);
  console.log(`  Median:   ${stats.median.toFixed(2)} ms`);
  console.log(`  P95:      ${stats.p95.toFixed(2)} ms`);
  console.log(`  P99:      ${stats.p99.toFixed(2)} ms\n`);

  console.log('Request Summary:');
  console.log(`  Total:     ${allResults.length} requests`);
  console.log(`  Success:   ${successCount} (${successRate.toFixed(1)}%)`);
  console.log(`  Errors:    ${errorCount}`);

  // Performance assessment
  console.log('\nPerformance Assessment:');
  if (stats.avg < 100) {
    console.log('  ✓ Excellent - Average < 100ms');
  } else if (stats.avg < 500) {
    console.log('  ✓ Good - Average < 500ms');
  } else if (stats.avg < 1000) {
    console.log('  ⚠ Fair - Average < 1s');
  } else {
    console.log('  ✗ Needs improvement - Average > 1s');
  }

  if (stats.p95 < 500) {
    console.log('  ✓ P95 meets target (< 500ms)');
  } else {
    console.log(`  ⚠ P95 above target: ${stats.p95.toFixed(2)}ms`);
  }

  console.log('\n═════════════════════════════════════════════════════════\n');

  // Return stats for programmatic use
  return {
    endpoint,
    concurrency,
    iterations,
    totalRequests: allResults.length,
    successCount,
    errorCount,
    successRate,
    stats,
  };
}

// Run the test
if (require.main === module) {
  runTest()
    .then((results) => {
      // Write results to file for tracking
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `performance-baseline-${timestamp}.json`;

      fs.writeFileSync(
        filename,
        JSON.stringify(results, null, 2),
        'utf-8'
      );

      console.log(`Results saved to: ${filename}\n`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { runTest, makeRequest, calculateStats };
