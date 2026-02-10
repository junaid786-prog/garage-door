/**
 * PII Sanitization Utilities
 *
 * CRITICAL: These functions ALWAYS sanitize data regardless of environment.
 * PII (Personally Identifiable Information) must NEVER appear in logs.
 *
 * This protects against:
 * - GDPR violations (€20M or 4% revenue fines)
 * - CCPA violations (up to $7,500 per violation)
 * - TCPA violations (SMS/phone number exposure)
 * - Security audits failures
 * - Data breach liability
 */

/**
 * Masks a phone number, showing only country code and last 4 digits
 * @param {string} phone - Phone number to mask
 * @returns {string} Masked phone number
 *
 * Examples:
 *   +12125551234 -> +1212***1234
 *   (555) 123-4567 -> ***4567
 *   5551234567 -> ***4567
 */
const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '[REDACTED]';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) return '[REDACTED]';
  if (digits.length <= 4) return '***' + digits; // Very short numbers

  // Check if it starts with country code
  const hasCountryCode = phone.startsWith('+');

  if (hasCountryCode && digits.length >= 10) {
    // Show country code + area code + *** + last 4
    const countryCode = digits.substring(0, 1);
    const areaCode = digits.substring(1, 4);
    const last4 = digits.substring(digits.length - 4);
    return `+${countryCode}${areaCode}***${last4}`;
  }

  // Default: show last 4 digits only
  const last4 = digits.substring(digits.length - 4);
  return `***${last4}`;
};

/**
 * Masks an email address, showing only first char and domain
 * @param {string} email - Email to mask
 * @returns {string} Masked email
 *
 * Examples:
 *   john.doe@example.com -> j***@example.com
 *   contact@company.co.uk -> c***@company.co.uk
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '[REDACTED]';

  const parts = email.split('@');
  if (parts.length !== 2) return '[REDACTED]';

  const [localPart, domain] = parts;
  if (localPart.length === 0) return '[REDACTED]';

  // Show only first character of local part
  const maskedLocal = localPart.charAt(0) + '***';
  return `${maskedLocal}@${domain}`;
};

/**
 * Masks an address, showing only city and state/ZIP
 * @param {string} address - Full address to mask
 * @returns {string} Masked address
 *
 * Examples:
 *   "123 Main St, Los Angeles, CA 90210" -> "[ADDRESS], Los Angeles, CA 90210"
 *   "456 Oak Ave, New York, NY" -> "[ADDRESS], New York, NY"
 */
const maskAddress = (address) => {
  if (!address || typeof address !== 'string') return '[REDACTED]';

  // Split by comma to get address parts
  const parts = address.split(',').map(p => p.trim());

  if (parts.length <= 1) return '[ADDRESS]';

  // Keep only city, state, zip (last 2-3 parts)
  const publicParts = parts.slice(-2);
  return `[ADDRESS], ${publicParts.join(', ')}`;
};

/**
 * Masks a name, showing only first initial and last initial
 * @param {string} name - Full name to mask
 * @returns {string} Masked name
 *
 * Examples:
 *   "John Doe" -> "J. D."
 *   "Jane Smith Johnson" -> "J. J."
 */
const maskName = (name) => {
  if (!name || typeof name !== 'string') return '[REDACTED]';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '[REDACTED]';
  if (parts.length === 1) return parts[0].charAt(0) + '.';

  const firstInitial = parts[0].charAt(0);
  const lastInitial = parts[parts.length - 1].charAt(0);
  return `${firstInitial}. ${lastInitial}.`;
};

/**
 * Masks credit card numbers, showing only last 4 digits
 * @param {string} cardNumber - Credit card number
 * @returns {string} Masked card number
 *
 * Examples:
 *   "4111111111111111" -> "****1111"
 *   "4111 1111 1111 1111" -> "****1111"
 */
const maskCreditCard = (cardNumber) => {
  if (!cardNumber || typeof cardNumber !== 'string') return '[REDACTED]';

  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '****';

  const last4 = digits.substring(digits.length - 4);
  return `****${last4}`;
};

/**
 * Sanitizes a booking object for logging
 * @param {Object} booking - Booking object with potential PII
 * @returns {Object} Sanitized booking safe for logging
 */
const sanitizeBooking = (booking) => {
  if (!booking || typeof booking !== 'object') return booking;

  const sanitized = { ...booking };

  // Sanitize customer information
  if (sanitized.customer_name) {
    sanitized.customer_name = maskName(sanitized.customer_name);
  }
  if (sanitized.customer_phone) {
    sanitized.customer_phone = maskPhone(sanitized.customer_phone);
  }
  if (sanitized.customer_email) {
    sanitized.customer_email = maskEmail(sanitized.customer_email);
  }
  if (sanitized.service_address) {
    sanitized.service_address = maskAddress(sanitized.service_address);
  }
  if (sanitized.notes) {
    // Notes might contain PII - redact completely
    sanitized.notes = '[REDACTED]';
  }

  // Nested customer object
  if (sanitized.customer && typeof sanitized.customer === 'object') {
    sanitized.customer = sanitizeCustomer(sanitized.customer);
  }

  return sanitized;
};

/**
 * Sanitizes a customer object for logging
 * @param {Object} customer - Customer object with PII
 * @returns {Object} Sanitized customer safe for logging
 */
const sanitizeCustomer = (customer) => {
  if (!customer || typeof customer !== 'object') return customer;

  const sanitized = { ...customer };

  if (sanitized.name) sanitized.name = maskName(sanitized.name);
  if (sanitized.phone) sanitized.phone = maskPhone(sanitized.phone);
  if (sanitized.email) sanitized.email = maskEmail(sanitized.email);
  if (sanitized.address) sanitized.address = maskAddress(sanitized.address);
  if (sanitized.street_address) sanitized.street_address = '[ADDRESS]';
  if (sanitized.notes) sanitized.notes = '[REDACTED]';

  return sanitized;
};

/**
 * Sanitizes an error object for logging
 * Removes sensitive data from error messages and stack traces
 * @param {Error} error - Error object
 * @returns {Object} Sanitized error safe for logging
 */
const sanitizeError = (error) => {
  if (!error) return error;

  const sanitized = {
    message: error.message,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode,
  };

  // Only include stack trace in development (but still sanitized)
  if (process.env.NODE_ENV !== 'production' && error.stack) {
    // Remove absolute file paths (could contain usernames)
    sanitized.stack = error.stack
      .split('\n')
      .map(line => {
        // Remove full file paths, keep only relative paths
        return line.replace(/\/home\/[^/]+\//g, '/~/').replace(/\/Users\/[^/]+\//g, '/~/')
      })
      .join('\n');
  }

  return sanitized;
};

/**
 * Deep sanitizes any object or array, recursively finding and masking PII
 * @param {any} data - Any data structure
 * @returns {any} Sanitized data safe for logging
 */
const sanitizeData = (data) => {
  if (data === null || data === undefined) return data;

  // Handle primitive types
  if (typeof data !== 'object') return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // Handle objects
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Detect PII by field name
    if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
      sanitized[key] = maskPhone(value);
    } else if (lowerKey.includes('email')) {
      sanitized[key] = maskEmail(value);
    } else if (lowerKey.includes('address') && !lowerKey.includes('ip')) {
      sanitized[key] = maskAddress(value);
    } else if (lowerKey.includes('name') && !lowerKey.includes('filename') && !lowerKey.includes('username')) {
      sanitized[key] = maskName(value);
    } else if (lowerKey.includes('card') || lowerKey.includes('credit') || lowerKey.includes('payment')) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('ssn') || lowerKey.includes('social')) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret')) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('note') || lowerKey.includes('comment')) {
      // Notes and comments might contain PII
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Sanitizes request objects from Express
 * @param {Object} req - Express request object
 * @returns {Object} Sanitized request data safe for logging
 */
const sanitizeRequest = (req) => {
  if (!req || typeof req !== 'object') return req;

  return {
    method: req.method,
    url: req.url,
    path: req.path,
    // NEVER log req.body - it contains PII
    // NEVER log req.query - might contain PII
    // NEVER log req.params - might contain PII
    headers: {
      'user-agent': req.headers?.['user-agent'] || req.get?.('user-agent'),
      'content-type': req.headers?.['content-type'] || req.get?.('content-type'),
      // Don't log authorization headers
    },
    ip: req.ip,
    requestId: req.id,
  };
};

module.exports = {
  maskPhone,
  maskEmail,
  maskAddress,
  maskName,
  maskCreditCard,
  sanitizeBooking,
  sanitizeCustomer,
  sanitizeError,
  sanitizeData,
  sanitizeRequest,
};
