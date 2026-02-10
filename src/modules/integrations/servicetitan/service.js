const env = require('../../../config/env');
const { Booking } = require('../../../database/models');
const { createCircuitBreaker } = require('../../../utils/circuitBreaker');
const { ServiceUnavailableError, ExternalServiceError } = require('../../../utils/errors');
const logger = require('../../../utils/logger');

/**
 * ServiceTitan integration service
 * Simulates ServiceTitan API for job creation and management
 *
 * This is a simulation service that mimics the real ServiceTitan API.
 * When real API credentials are available, replace this with actual API calls.
 */
class ServiceTitanService {
  constructor() {
    this.baseURL = env.SERVICETITAN_API_URL || 'https://api.servicetitan.io';
    this.apiKey = env.SERVICETITAN_API_KEY || 'sim_key_12345';
    this.tenantId = env.SERVICETITAN_TENANT_ID || 'sim_tenant_67890';
    this.appKey = env.SERVICETITAN_APP_KEY || 'sim_app_abcde';

    // Simulation state
    this.simulatedJobs = new Map();
    this.simulatedJobCounter = 1000;
    this.initialized = false;

    // Circuit breakers for external calls
    this._setupCircuitBreakers();
  }

  /**
   * Setup circuit breakers for external API calls
   * @private
   */
  _setupCircuitBreakers() {
    // Circuit breaker for job creation (most critical operation)
    this.createJobBreaker = createCircuitBreaker(
      this._createJobInternal.bind(this),
      {
        name: 'ServiceTitan.createJob',
        timeout: 10000, // 10 seconds
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
      },
      async (bookingData) => {
        // Fallback: Store job for later retry
        logger.warn('ServiceTitan circuit breaker open, using fallback', {
          operation: 'createJob',
          bookingId: bookingData.bookingId
        });
        throw new ServiceUnavailableError(
          'ServiceTitan is temporarily unavailable. Job will be created in background.',
          'ServiceTitan'
        );
      }
    );

    // Circuit breaker for job updates
    this.updateJobBreaker = createCircuitBreaker(
      this._updateJobStatusInternal.bind(this),
      {
        name: 'ServiceTitan.updateJobStatus',
        timeout: 8000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
      }
    );

    // Circuit breaker for getting jobs
    this.getJobBreaker = createCircuitBreaker(
      this._getJobInternal.bind(this),
      {
        name: 'ServiceTitan.getJob',
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
      }
    );

    // Circuit breaker for cancellations
    this.cancelJobBreaker = createCircuitBreaker(
      this._cancelJobInternal.bind(this),
      {
        name: 'ServiceTitan.cancelJob',
        timeout: 8000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
      }
    );
  }

  /**
   * Initialize counter from database to avoid conflicts after server restart
   * @private
   */
  async _initializeCounter() {
    if (this.initialized) return;

    try {
      const maxJob = await Booking.findOne({
        attributes: [[Booking.sequelize.fn('MAX', Booking.sequelize.cast(Booking.sequelize.col('service_titan_job_id'), 'INTEGER')), 'maxId']],
        where: {
          service_titan_job_id: {
            [Booking.sequelize.Op.ne]: null
          }
        },
        raw: true
      });

      if (maxJob && maxJob.maxId) {
        this.simulatedJobCounter = parseInt(maxJob.maxId);
      }

      this.initialized = true;
    } catch (error) {
      // If initialization fails, continue with default counter
      this.initialized = true;
    }
  }

  /**
   * Authenticate with ServiceTitan API
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate() {
    // Simulate authentication delay
    await this._simulateDelay(200);

    // Simulate authentication scenarios
    if (this.apiKey === 'invalid_key') {
      throw new Error('Authentication failed: Invalid API key');
    }

    if (this.tenantId === 'invalid_tenant') {
      throw new Error('Authentication failed: Invalid tenant ID');
    }

    return {
      success: true,
      token: `sim_token_${Date.now()}`,
      expiresIn: 3600,
      authenticated: true,
    };
  }

  /**
   * Create a job in ServiceTitan (with circuit breaker protection)
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Created job information
   */
  async createJob(bookingData) {
    try {
      return await this.createJobBreaker.fire(bookingData);
    } catch (error) {
      // Circuit breaker errors
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      // Transform generic errors to ExternalServiceError
      throw new ExternalServiceError(
        error.message,
        'ServiceTitan',
        'CREATE_JOB_FAILED',
        this._isRetryableError(error)
      );
    }
  }

  /**
   * Internal job creation method (protected by circuit breaker)
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Created job information
   * @private
   */
  async _createJobInternal(bookingData) {
    // Validate required fields
    this._validateBookingData(bookingData);

    // Simulate API delay
    await this._simulateDelay(800);

    // Simulate different error scenarios
    await this._simulateErrors(bookingData);

    // Generate unique job ID using timestamp + random to avoid collisions
    const jobId = Date.now() + Math.floor(Math.random() * 1000);

    const serviceTitanJob = {
      id: jobId,
      externalId: bookingData.bookingId || null,
      jobNumber: `JOB-${String(jobId).padStart(6, '0')}`,
      status: 'scheduled',
      priority: this._determinePriority(bookingData.problemType),

      // Customer information
      customer: {
        id: this._generateCustomerId(),
        name: `${bookingData.firstName} ${bookingData.lastName}`,
        phone: bookingData.phone,
        email: bookingData.email,
        type: bookingData.customerType || 'residential',
      },

      // Service location
      location: {
        address: {
          street: bookingData.address,
          city: bookingData.city,
          state: bookingData.state,
          zip: bookingData.zip,
        },
        coordinates: bookingData.coordinates || null,
        specialInstructions: bookingData.specialInstructions || null,
      },

      // Job details
      jobType: 'garage_door_service',
      category: 'repair',
      description: this._generateJobDescription(bookingData),
      problemType: bookingData.problemType,
      doorCount: bookingData.doorCount || 1,
      doorAge: bookingData.doorAge || null,
      isRenter: bookingData.isRenter || false,

      // Scheduling
      scheduledDate: bookingData.scheduledDate,
      timeSlot: bookingData.timeSlot,
      estimatedDuration: this._estimateDuration(bookingData.problemType),

      // ServiceTitan specific fields
      businessUnit: this._getBusinessUnit(bookingData.zip),
      campaignId: bookingData.campaignId || null,
      source: 'online_booking_widget',

      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Simulation metadata
      _simulation: {
        created: true,
        apiVersion: '2024-11-13',
        responseTime: '800ms',
      },
    };

    // Store in simulation state
    this.simulatedJobs.set(jobId, serviceTitanJob);

    return serviceTitanJob;
  }

  /**
   * Get job by ID (with circuit breaker protection)
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Job information
   */
  async getJob(jobId) {
    try {
      return await this.getJobBreaker.fire(jobId);
    } catch (error) {
      throw new ExternalServiceError(
        error.message,
        'ServiceTitan',
        'GET_JOB_FAILED',
        this._isRetryableError(error)
      );
    }
  }

  /**
   * Internal get job method (protected by circuit breaker)
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Job information
   * @private
   */
  async _getJobInternal(jobId) {
    await this._simulateDelay(300);

    const job = this.simulatedJobs.get(parseInt(jobId));
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    return job;
  }

  /**
   * Update job status (with circuit breaker protection)
   * @param {number} jobId - Job ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated job
   */
  async updateJobStatus(jobId, status) {
    try {
      return await this.updateJobBreaker.fire(jobId, status);
    } catch (error) {
      throw new ExternalServiceError(
        error.message,
        'ServiceTitan',
        'UPDATE_JOB_FAILED',
        this._isRetryableError(error)
      );
    }
  }

  /**
   * Internal update job status method (protected by circuit breaker)
   * @param {number} jobId - Job ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated job
   * @private
   */
  async _updateJobStatusInternal(jobId, status) {
    await this._simulateDelay(400);

    const job = this.simulatedJobs.get(parseInt(jobId));
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    const validStatuses = ['scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    job.status = status;
    job.updatedAt = new Date().toISOString();

    this.simulatedJobs.set(parseInt(jobId), job);
    return job;
  }

  /**
   * Get jobs by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of jobs
   */
  async getJobsByDateRange(startDate, endDate) {
    await this._simulateDelay(600);

    const jobs = Array.from(this.simulatedJobs.values()).filter((job) => {
      const jobDate = new Date(job.scheduledDate);
      return jobDate >= startDate && jobDate <= endDate;
    });

    return jobs;
  }

  /**
   * Cancel a job (with circuit breaker protection)
   * @param {number} jobId - Job ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled job
   */
  async cancelJob(jobId, reason = 'Customer request') {
    try {
      return await this.cancelJobBreaker.fire(jobId, reason);
    } catch (error) {
      throw new ExternalServiceError(
        error.message,
        'ServiceTitan',
        'CANCEL_JOB_FAILED',
        this._isRetryableError(error)
      );
    }
  }

  /**
   * Internal cancel job method (protected by circuit breaker)
   * @param {number} jobId - Job ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled job
   * @private
   */
  async _cancelJobInternal(jobId, reason = 'Customer request') {
    await this._simulateDelay(500);

    const job = this.simulatedJobs.get(parseInt(jobId));
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    if (job.status === 'completed') {
      throw new Error('Cannot cancel completed job');
    }

    job.status = 'cancelled';
    job.cancellationReason = reason;
    job.cancelledAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();

    this.simulatedJobs.set(parseInt(jobId), job);
    return job;
  }

  /**
   * Get service titan health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    await this._simulateDelay(100);

    return {
      status: 'healthy',
      version: 'simulation-v1.0.0',
      uptime: Date.now() - 1000 * 60 * 60 * 24, // 24 hours
      jobsCreated: this.simulatedJobs.size,
      lastJobCreated:
        this.simulatedJobs.size > 0
          ? Array.from(this.simulatedJobs.values()).pop().createdAt
          : null,
    };
  }

  // Private helper methods

  /**
   * Validate booking data
   * @param {Object} bookingData
   */
  _validateBookingData(bookingData) {
    const required = [
      'firstName',
      'lastName',
      'phone',
      'email',
      'address',
      'city',
      'state',
      'zip',
      'problemType',
    ];

    for (const field of required) {
      if (!bookingData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate phone format
    if (!/^\d{10,15}$/.test(bookingData.phone.replace(/[^\d]/g, ''))) {
      throw new Error('Invalid phone number format');
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate ZIP code
    if (!/^\d{5}(-\d{4})?$/.test(bookingData.zip)) {
      throw new Error('Invalid ZIP code format');
    }
  }

  /**
   * Simulate various error scenarios
   */
  async _simulateErrors(bookingData) {
    // Simulate random API failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('ServiceTitan API temporarily unavailable');
    }

    // Simulate specific error cases
    if (bookingData.email === 'error@test.com') {
      throw new Error('Customer already exists with conflicting information');
    }

    if (bookingData.zip === '00000') {
      throw new Error('Service area not supported');
    }

    if (bookingData.phone === '0000000000') {
      throw new Error('Invalid phone number - customer verification failed');
    }
  }

  /**
   * Simulate API delay
   */
  async _simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Determine job priority based on problem type
   */
  _determinePriority(problemType) {
    const urgentProblems = ['broken_spring', 'door_stuck_closed', 'door_wont_close'];
    return urgentProblems.includes(problemType) ? 'high' : 'normal';
  }

  /**
   * Generate job description
   */
  _generateJobDescription(bookingData) {
    const problemDescriptions = {
      broken_spring: 'Garage door spring repair/replacement',
      door_wont_open: 'Garage door opener troubleshooting and repair',
      door_wont_close: 'Garage door closing mechanism repair',
      door_stuck_closed: 'Emergency garage door stuck closed - priority service',
      noisy_door: 'Garage door noise reduction and maintenance',
      remote_not_working: 'Garage door remote control troubleshooting',
      new_door_installation: 'New garage door installation consultation',
      other: 'Garage door service - customer reported issue',
    };

    let description = problemDescriptions[bookingData.problemType] || problemDescriptions.other;

    if (bookingData.doorCount > 1) {
      description += ` (${bookingData.doorCount} doors)`;
    }

    if (bookingData.specialInstructions) {
      description += `\n\nCustomer Notes: ${bookingData.specialInstructions}`;
    }

    return description;
  }

  /**
   * Estimate job duration
   */
  _estimateDuration(problemType) {
    const durations = {
      broken_spring: 120, // 2 hours
      door_wont_open: 90,
      door_wont_close: 90,
      door_stuck_closed: 60,
      noisy_door: 60,
      remote_not_working: 30,
      new_door_installation: 240, // 4 hours
      other: 90,
    };

    return durations[problemType] || 90;
  }

  /**
   * Get business unit based on ZIP code
   */
  _getBusinessUnit(zipCode) {
    const zip = parseInt(zipCode);

    if (zip >= 85001 && zip <= 85099) {
      return 'Phoenix_Central';
    } else if (zip >= 85201 && zip <= 85299) {
      return 'Mesa_East';
    } else if (zip >= 85251 && zip <= 85259) {
      return 'Scottsdale_North';
    } else {
      return 'Phoenix_Metro';
    }
  }

  /**
   * Generate customer ID
   */
  _generateCustomerId() {
    return `CUST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Determine if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether the error is retryable
   * @private
   */
  _isRetryableError(error) {
    const message = error.message.toLowerCase();

    // Non-retryable errors (client errors, validation failures)
    const nonRetryable = [
      'authentication failed',
      'invalid api key',
      'invalid',
      'missing required field',
      'cannot cancel completed job',
      'already exists',
    ];

    if (nonRetryable.some(term => message.includes(term))) {
      return false;
    }

    // Retryable errors (network, timeouts, server errors)
    const retryable = [
      'temporarily unavailable',
      'timeout',
      'network',
      'connection',
      'service unavailable',
    ];

    if (retryable.some(term => message.includes(term))) {
      return true;
    }

    // Random API failures (5% chance) are retryable
    return true;
  }

  /**
   * Get circuit breaker health status
   * @returns {Object} Health status of all circuit breakers
   */
  getCircuitBreakerHealth() {
    return {
      createJob: {
        state: this.createJobBreaker.opened ? 'open' : this.createJobBreaker.halfOpen ? 'half-open' : 'closed',
        stats: this.createJobBreaker.stats
      },
      updateJob: {
        state: this.updateJobBreaker.opened ? 'open' : this.updateJobBreaker.halfOpen ? 'half-open' : 'closed',
        stats: this.updateJobBreaker.stats
      },
      getJob: {
        state: this.getJobBreaker.opened ? 'open' : this.getJobBreaker.halfOpen ? 'half-open' : 'closed',
        stats: this.getJobBreaker.stats
      },
      cancelJob: {
        state: this.cancelJobBreaker.opened ? 'open' : this.cancelJobBreaker.halfOpen ? 'half-open' : 'closed',
        stats: this.cancelJobBreaker.stats
      }
    };
  }
}

module.exports = new ServiceTitanService();
