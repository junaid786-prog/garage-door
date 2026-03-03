const AbandonedSession = require('../../database/models/AbandonedSession');
const logger = require('../../utils/logger');

/**
 * Abandoned Session Service
 * Phase 1: Data capture and storage only
 * Phase 2: ServiceTitan integration will be added
 */
class AbandonedSessionService {
  /**
   * Create abandoned session record
   * @param {Object} sessionData - Abandoned session data from frontend
   * @returns {Promise<Object>} Created session record
   */
  async createAbandonedSession(sessionData) {
    try {
      // Transform frontend data to model format
      const modelData = this._transformSessionData(sessionData);

      // Create session record in database
      const session = await AbandonedSession.create(modelData);

      logger.info('Abandoned session recorded', {
        sessionId: session.id,
        userSessionId: session.sessionId,
        lastStep: session.lastStepName,
        hasEmail: !!session.email,
        hasPhone: !!session.phoneE164,
        reason: session.abandonmentReason,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create abandoned session', {
        error: error.message,
        stack: error.stack,
        sessionId: sessionData.sessionId,
      });
      throw error;
    }
  }

  /**
   * Get abandoned session by ID
   * @param {string} id - Session ID
   * @returns {Promise<Object|null>} Session or null if not found
   */
  async getAbandonedSessionById(id) {
    try {
      const session = await AbandonedSession.findByPk(id);
      return session;
    } catch (error) {
      logger.error('Failed to get abandoned session', {
        error: error.message,
        sessionId: id,
      });
      throw error;
    }
  }

  /**
   * Check if session has already been sent to ServiceTitan
   * @param {string} sessionId - User session ID (from sessionStorage)
   * @returns {Promise<boolean>} True if already sent
   */
  async isSessionAlreadySent(sessionId) {
    try {
      const session = await AbandonedSession.findOne({
        where: {
          sessionId: sessionId,
          sentToServicetitanAt: {
            [require('sequelize').Op.ne]: null,
          },
        },
      });
      return !!session;
    } catch (error) {
      logger.error('Failed to check session status', {
        error: error.message,
        sessionId,
      });
      // On error, assume not sent to avoid duplicate prevention
      return false;
    }
  }

  /**
   * Transform frontend session data to database model format
   * @private
   * @param {Object} sessionData - Raw session data from frontend
   * @returns {Object} Transformed data for model
   */
  _transformSessionData(sessionData) {
    const data = {
      sessionId: sessionData.sessionId,

      // Contact info
      firstName: sessionData.firstName || null,
      lastName: sessionData.lastName || null,
      email: sessionData.email || null,
      phoneE164: sessionData.phone || null,
      smsOptIn: sessionData.smsOptIn || false,
      contactPref: sessionData.contactPref || null,

      // Address
      street: sessionData.address || null,
      unit: sessionData.unit || null,
      city: sessionData.city || null,
      state: sessionData.state || null,
      zip: sessionData.zipCode || null,

      // Campaign context
      utmSource: sessionData.utms?.utm_source || null,
      utmMedium: sessionData.utms?.utm_medium || null,
      utmCampaign: sessionData.utms?.utm_campaign || null,
      utmTerm: sessionData.utms?.utm_term || null,
      utmContent: sessionData.utms?.utm_content || null,
      campaignId: sessionData.campaignId || null,
      flowSource: sessionData.flowSource || null,
      referrer: sessionData.referrer || null,

      // Booking context
      serviceType: sessionData.serviceType || null,
      serviceSymptom: sessionData.serviceSymptom || null,
      doorCount: sessionData.doorCount || null,
      selectedDate: sessionData.selectedDate || null,
      selectedSlotId: sessionData.selectedSlotId || null,

      // Abandonment tracking
      lastStepNumber: sessionData.lastStepNumber || null,
      lastStepName: sessionData.lastStepName || null,
      timeElapsedMs: sessionData.timeElapsedMs || null,
      idleTimeMs: sessionData.idleTimeMs || null,
      abandonmentReason: sessionData.abandonmentReason || 'unknown',

      // ServiceTitan fields (Phase 2)
      servicetitanBookingId: null,
      servicetitanStatus: 'pending',
      servicetitanError: null,
      sentToServicetitanAt: null,
    };

    return data;
  }

  /**
   * PHASE 2: Send abandoned session to ServiceTitan
   * This will be implemented in Phase 2
   */
  async sendToServiceTitan(sessionId) {
    // TODO: Implement in Phase 2
    logger.info('ServiceTitan integration not yet implemented (Phase 2)', { sessionId });
    return { success: false, message: 'Not implemented - Phase 2' };
  }
}

module.exports = new AbandonedSessionService();
