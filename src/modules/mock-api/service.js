/**
 * Mock API service - simulates external API calls
 * Task #2: Mock Endpoint Implementation
 */
class MockApiService {
  /**
   * Mock ServiceTitan API - Create Service Job
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Mock API response
   */
  async createServiceJob(bookingData) {
    // Simulate API delay
    await this._simulateDelay(300);

    // Generate mock job ID
    const jobId = `ST-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Mock successful ServiceTitan response
    return {
      success: true,
      jobId,
      externalReference: bookingData.id,
      status: 'scheduled',
      technician: {
        id: 'TECH-001',
        name: 'John Doe',
      },
      scheduledTime: bookingData.preferredDateTime,
      estimatedDuration: 60, // minutes
      serviceType: bookingData.serviceType,
      customer: {
        name: bookingData.customerName,
        email: bookingData.customerEmail,
        phone: bookingData.customerPhone,
        address: bookingData.address,
      },
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Mock ServiceTitan API - Get Job Status
   * @param {string} jobId - ServiceTitan job ID
   * @returns {Promise<Object>} Mock job status
   */
  async getJobStatus(jobId) {
    await this._simulateDelay(200);

    return {
      success: true,
      jobId,
      status: 'scheduled',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Mock ServiceTitan API - Update Job
   * @param {string} jobId - ServiceTitan job ID
   * @param {Object} updates - Job updates
   * @returns {Promise<Object>} Mock update response
   */
  async updateJob(jobId, updates) {
    await this._simulateDelay(250);

    return {
      success: true,
      jobId,
      updated: true,
      updatedFields: Object.keys(updates),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Simulate API network delay
   * @param {number} ms - Milliseconds to delay
   * @private
   */
  _simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new MockApiService();
