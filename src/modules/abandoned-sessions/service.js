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
   * Send abandoned session to ServiceTitan as a Booking
   * @param {string} sessionId - Abandoned session ID
   * @returns {Promise<Object>} Result with success status
   */
  async sendToServiceTitan(sessionId) {
    const serviceTitanIntegration = require('../integrations/servicetitan/integration');

    try {
      const session = await AbandonedSession.findByPk(sessionId);

      if (!session) {
        throw new Error(`Abandoned session not found: ${sessionId}`);
      }

      // Check if already sent to avoid duplicates
      if (session.servicetitanBookingId) {
        logger.info('Session already sent to ServiceTitan', {
          sessionId,
          stBookingId: session.servicetitanBookingId,
        });
        return { success: true, alreadySent: true };
      }

      // Validate that we have minimum required contact info (email OR phone)
      if (!session.email && !session.phoneE164) {
        logger.warn('Cannot send to ServiceTitan - no contact info', {
          sessionId,
        });
        await session.update({
          servicetitanStatus: 'failed',
          servicetitanError: 'No email or phone provided',
        });
        return {
          success: false,
          error: 'No email or phone provided',
          shouldRetry: false,
        };
      }

      // Prepare data for ServiceTitan
      const bookingData = {
        sessionId: session.sessionId,
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
        phone: session.phoneE164,
        smsOptIn: session.smsOptIn || false,
        contactPref: session.contactPref,
        street: session.street,
        unit: session.unit,
        city: session.city,
        state: session.state,
        zip: session.zip,
        utms: {
          utm_source: session.utmSource,
          utm_medium: session.utmMedium,
          utm_campaign: session.utmCampaign,
          utm_term: session.utmTerm,
          utm_content: session.utmContent,
        },
        campaignId: session.campaignId,
        flowSource: session.flowSource,
        serviceType: session.serviceType,
        serviceSymptom: session.serviceSymptom,
        doorCount: session.doorCount,
        selectedDate: session.selectedDate,
        selectedSlotId: session.selectedSlotId,
        lastStepName: session.lastStepName,
        lastStepNumber: session.lastStepNumber,
        timeElapsedMs: session.timeElapsedMs,
        idleTimeMs: session.idleTimeMs,
        abandonmentReason: session.abandonmentReason,
      };

      // Call ServiceTitan integration with retry logic
      let result;
      let attempts = 0;
      const maxAttempts = 3;
      const retryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

      while (attempts < maxAttempts) {
        result = await serviceTitanIntegration.createBooking(bookingData);

        if (result.success) {
          // Update session with ServiceTitan booking ID
          await session.update({
            servicetitanBookingId: result.serviceTitanBookingId,
            servicetitanStatus: result.status || 'pending',
            sentToServicetitanAt: new Date(),
          });

          logger.info('Abandoned session sent to ServiceTitan', {
            sessionId,
            stBookingId: result.serviceTitanBookingId,
            bookingNumber: result.bookingNumber,
            attempts: attempts + 1,
          });

          return {
            success: true,
            stBookingId: result.serviceTitanBookingId,
            bookingNumber: result.bookingNumber,
            attempts: attempts + 1,
          };
        } else if (result.shouldRetry && attempts < maxAttempts - 1) {
          // Retry with exponential backoff
          attempts++;
          const delay = retryDelays[attempts - 1];
          logger.warn('ServiceTitan booking creation failed, retrying', {
            sessionId,
            attempt: attempts,
            maxAttempts,
            retryInMs: delay,
            error: result.error,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Final failure (either non-retryable or max attempts reached)
          break;
        }
      }

      // Mark as failed after all retry attempts
      await session.update({
        servicetitanStatus: 'failed',
        servicetitanError: result.error,
      });

      logger.error('ServiceTitan booking creation failed permanently', {
        sessionId,
        error: result.error,
        attempts: attempts + 1,
        shouldRetry: result.shouldRetry,
      });

      return {
        success: false,
        error: result.error,
        shouldRetry: result.shouldRetry,
        attempts: attempts + 1,
      };
    } catch (error) {
      logger.error('Error sending abandoned session to ServiceTitan', {
        sessionId,
        error: error.message,
        stack: error.stack,
      });

      // Try to update session status if we have the session object
      try {
        const session = await AbandonedSession.findByPk(sessionId);
        if (session) {
          await session.update({
            servicetitanStatus: 'failed',
            servicetitanError: error.message,
          });
        }
      } catch (updateError) {
        logger.error('Failed to update session status', {
          sessionId,
          error: updateError.message,
        });
      }

      return { success: false, error: error.message, shouldRetry: true };
    }
  }
}

module.exports = new AbandonedSessionService();
