/**
 * A1 Booking Widget Embed Script
 *
 * This script allows external sites to embed the A1 Booking Widget in an iframe.
 * Features:
 * - Auto-detects environment (localhost vs production)
 * - PostMessage API for widget-parent communication
 * - Loading state with spinner
 * - Dynamic height adjustment
 * - Auto-close on booking completion
 * - Error handling
 */

(function() {
  'use strict';

  // Auto-detect environment: use production URLs if not on localhost
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const defaultWidgetUrl = isLocal ? 'http://localhost:5173' : 'https://rapid-response-scheduler.vercel.app';
  const defaultApiUrl = isLocal ? 'http://localhost:3000' : 'https://garage-door-mwkt.onrender.com';

  const A1Widget = {
    config: {
      widgetUrl: defaultWidgetUrl,
      apiUrl: defaultApiUrl,
      apiKey: 'garage-door-api-key-2026',
      prefill: {},
      allowedOrigins: null, // Optional: Override allowed origins for postMessage validation
      onBookingComplete: null, // Callback when booking is completed
      onError: null, // Callback when error occurs
      onClose: null // Callback when widget closes
    },
    iframe: null,
    modalContainer: null,
    loadingSpinner: null,

    open: function(options) {
      this.config = Object.assign({}, this.config, options);
      this._createModal();
      this._setupPostMessageListener();
    },

    close: function(reason) {
      console.log('[A1Widget] Closing widget. Reason:', reason || 'manual');

      // Call onClose callback if provided
      if (typeof this.config.onClose === 'function') {
        this.config.onClose(reason);
      }

      const modal = document.getElementById('a1-widget-modal');
      if (modal) {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
      }

      // Clean up postMessage listener
      this._cleanupPostMessageListener();

      // Clean up resize and orientation event listeners
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        window.removeEventListener('orientationchange', this._resizeHandler);
        this._resizeHandler = null;
      }

      if (this._escHandler) {
        document.removeEventListener('keydown', this._escHandler);
        this._escHandler = null;
      }

      // Reset references
      this.iframe = null;
      this.modalContainer = null;
      this.loadingSpinner = null;
    },

    _createModal: function() {
      if (document.getElementById('a1-widget-modal')) return;

      // Create overlay backdrop
      const overlay = document.createElement('div');
      overlay.id = 'a1-widget-modal';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';

      // Create modal container for iframe (Responsive sizing)
      this.modalContainer = document.createElement('div');
      // Use responsive sizing based on viewport
      const isMobile = window.innerWidth < 640;
      const isSmallPhone = window.innerWidth < 375;
      const width = isMobile
        ? (isSmallPhone ? 'calc(100vw - 16px)' : 'min(480px, calc(100vw - 32px))')
        : '520px';
      const borderRadius = isSmallPhone ? '16px' : '20px';
      const maxHeight = isMobile ? '92vh' : '750px';
      const minHeight = isMobile ? 'auto' : '600px';

      this.modalContainer.style.cssText = `position:relative;width:${width};height:85vh;max-height:${maxHeight};min-height:${minHeight};background:white;border-radius:${borderRadius};overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.3);`;

      // Create loading spinner (shown until widget.loaded event)
      this.loadingSpinner = this._createLoadingSpinner();
      this.modalContainer.appendChild(this.loadingSpinner);

      // Create iframe
      this.iframe = document.createElement('iframe');
      const url = new URL(this.config.widgetUrl);
      url.searchParams.set('embedded', 'true');
      if (this.config.apiUrl) url.searchParams.set('apiUrl', this.config.apiUrl);
      if (this.config.apiKey) url.searchParams.set('apiKey', this.config.apiKey);
      if (this.config.prefill && Object.keys(this.config.prefill).length) url.searchParams.set('prefill', JSON.stringify(this.config.prefill));
      this.iframe.src = url.toString();
      this.iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;opacity:0;transition:opacity 0.3s ease;';
      this.iframe.setAttribute('title', 'A1 Garage Door Booking Widget');
      this.iframe.setAttribute('allow', 'geolocation');

      // Set loading timeout (30 seconds)
      const loadTimeout = setTimeout(() => {
        if (this.loadingSpinner && this.loadingSpinner.style.display !== 'none') {
          console.error('[A1Widget] Widget failed to load within 30 seconds');
          this._handleError('Loading timeout', 'Widget failed to load. Please try again.');
        }
      }, 30000);

      // Clear timeout when iframe loads
      this.iframe.addEventListener('load', () => {
        clearTimeout(loadTimeout);
      });

      this.modalContainer.appendChild(this.iframe);
      overlay.appendChild(this.modalContainer);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close('overlay_click');
        }
      });

      // Close on escape key
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          this.close('escape_key');
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      // Handle window resize and orientation changes for responsive modal sizing
      const resizeHandler = () => {
        if (!this.modalContainer) return;

        const isMobile = window.innerWidth < 640;
        const isSmallPhone = window.innerWidth < 375;
        const width = isMobile
          ? (isSmallPhone ? 'calc(100vw - 16px)' : 'min(480px, calc(100vw - 32px))')
          : '520px';
        const borderRadius = isSmallPhone ? '16px' : '20px';
        const maxHeight = isMobile ? '92vh' : '750px';
        const minHeight = isMobile ? 'auto' : '600px';

        this.modalContainer.style.width = width;
        this.modalContainer.style.borderRadius = borderRadius;
        this.modalContainer.style.maxHeight = maxHeight;
        this.modalContainer.style.minHeight = minHeight;
      };

      window.addEventListener('resize', resizeHandler);
      window.addEventListener('orientationchange', resizeHandler);

      // Store handlers for cleanup
      this._resizeHandler = resizeHandler;
      this._escHandler = escHandler;
    },

    _createLoadingSpinner: function() {
      const spinner = document.createElement('div');
      spinner.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:white;z-index:10;';

      const spinnerInner = document.createElement('div');
      spinnerInner.style.cssText = 'width:48px;height:48px;border:4px solid #f3f3f3;border-top:4px solid #D41C1C;border-radius:50%;animation:a1-spin 1s linear infinite;';

      // Add keyframe animation
      if (!document.getElementById('a1-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'a1-spinner-style';
        style.textContent = '@keyframes a1-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }

      const text = document.createElement('div');
      text.textContent = 'Loading booking form...';
      text.style.cssText = 'position:absolute;top:60%;left:50%;transform:translateX(-50%);color:#666;font-size:14px;font-family:system-ui,-apple-system,sans-serif;';

      spinner.appendChild(spinnerInner);
      spinner.appendChild(text);

      return spinner;
    },

    _setupPostMessageListener: function() {
      this._postMessageHandler = (event) => {
        // Validate origin for security
        // NOTE: External sites should update this array to match their widget URL
        // For production, only include the actual widget domain(s)
        const allowedOrigins = this.config.allowedOrigins || [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://rapid-response-scheduler.vercel.app',
          'https://garage-door-mwkt.onrender.com'
        ];

        if (!allowedOrigins.includes(event.origin)) {
          console.warn('[A1Widget] SECURITY: Rejected postMessage from unauthorized origin:', event.origin, 'Allowed:', allowedOrigins);
          return;
        }

        const message = event.data;

        // Validate message structure
        if (!message || message.source !== 'a1-booking-widget') {
          return; // Not a message from our widget
        }

        console.log('[A1Widget] Received message from widget:', message.type, message.data);

        // Handle message based on type
        switch (message.type) {
          case 'widget.loaded':
            this._handleWidgetLoaded(message.data);
            break;

          case 'widget.close':
            this._handleWidgetClose(message.data);
            break;

          case 'widget.height':
            this._handleHeightChange(message.data);
            break;

          case 'widget.error':
            this._handleError(message.data.error, message.data.message);
            break;

          case 'booking.completed':
            this._handleBookingCompleted(message.data);
            break;

          default:
            console.warn('[A1Widget] Unknown message type:', message.type);
        }
      };

      window.addEventListener('message', this._postMessageHandler);
    },

    _cleanupPostMessageListener: function() {
      if (this._postMessageHandler) {
        window.removeEventListener('message', this._postMessageHandler);
        this._postMessageHandler = null;
      }
    },

    _handleWidgetLoaded: function(data) {
      console.log('[A1Widget] Widget loaded successfully. Version:', data.version);

      // Hide loading spinner, show iframe
      if (this.loadingSpinner) {
        this.loadingSpinner.style.display = 'none';
      }
      if (this.iframe) {
        this.iframe.style.opacity = '1';
      }
    },

    _handleWidgetClose: function(data) {
      console.log('[A1Widget] Widget requested close. Reason:', data.reason);
      this.close(data.reason);
    },

    _handleHeightChange: function(data) {
      console.log('[A1Widget] Widget height changed:', data.height, 'px (scroll:', data.scrollHeight, 'px)');

      // Optional: Adjust iframe height dynamically
      // Note: Currently we use fixed height (85vh) for consistent UX
      // Uncomment below to enable dynamic height:
      /*
      if (this.modalContainer && data.scrollHeight) {
        const newHeight = Math.min(Math.max(data.scrollHeight, 600), 750); // Min 600px, max 750px
        this.modalContainer.style.height = newHeight + 'px';
      }
      */
    },

    _handleError: function(error, message) {
      console.error('[A1Widget] Widget error:', error, message);

      // Call onError callback if provided
      if (typeof this.config.onError === 'function') {
        this.config.onError(error, message);
      }

      // Show error to user
      alert('Booking widget error: ' + message);

      // Optionally close widget on error
      // this.close('error');
    },

    _handleBookingCompleted: function(data) {
      console.log('[A1Widget] Booking completed!', data);

      // Call onBookingComplete callback if provided
      if (typeof this.config.onBookingComplete === 'function') {
        this.config.onBookingComplete(data);
      }

      // Auto-close modal after 3 seconds (give user time to see confirmation)
      setTimeout(() => {
        this.close('booking_completed');
      }, 3000);
    },

    // Send message to widget (for parent → widget communication)
    sendMessage: function(type, data) {
      if (!this.iframe || !this.iframe.contentWindow) {
        console.warn('[A1Widget] Cannot send message - iframe not ready');
        return;
      }

      const message = { type, data };
      this.iframe.contentWindow.postMessage(message, this.config.widgetUrl);
      console.log('[A1Widget] Sent message to widget:', type, data);
    }
  };

  window.A1Widget = A1Widget;
})();

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const bookBtn = document.getElementById('book-now-btn');
  if (bookBtn) {
    bookBtn.addEventListener('click', function() {
      // Use default config (auto-detects environment)
      A1Widget.open({
        prefill: {},
        // Optional callbacks:
        onBookingComplete: function(data) {
          console.log('[Demo] Booking completed:', data);
          // Track conversion, redirect, etc.
        },
        onError: function(error, message) {
          console.error('[Demo] Widget error:', error, message);
        },
        onClose: function(reason) {
          console.log('[Demo] Widget closed. Reason:', reason);
        }
      });
    });
  }
});
