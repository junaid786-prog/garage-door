(function() {
  'use strict';

  // Auto-detect environment: use production URLs if not on localhost
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const defaultWidgetUrl = isLocal ? 'http://localhost:5173' : 'https://rapid-response-scheduler.vercel.app';
  const defaultApiUrl = isLocal ? 'http://localhost:3000' : 'https://garage-door-mwkt.onrender.com';

  const A1Widget = {
    config: { widgetUrl: defaultWidgetUrl, apiUrl: defaultApiUrl, apiKey: 'garage-door-api-key-2026', prefill: {} },
    open: function(options) {
      this.config = Object.assign({}, this.config, options);
      this._createModal();
    },
    close: function() {
      const modal = document.getElementById('a1-widget-modal');
      if (modal) { document.body.removeChild(modal); document.body.style.overflow = ''; }
    },
    _createModal: function() {
      if (document.getElementById('a1-widget-modal')) return;

      // Create overlay backdrop
      const overlay = document.createElement('div');
      overlay.id = 'a1-widget-modal';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';

      // Create modal container for iframe (match standalone exactly)
      const modalContainer = document.createElement('div');
      modalContainer.style.cssText = 'width:520px;height:85vh;max-height:750px;min-height:600px;background:white;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.3);';

      // Create iframe
      const iframe = document.createElement('iframe');
      const url = new URL(this.config.widgetUrl);
      url.searchParams.set('embedded', 'true');
      if (this.config.apiUrl) url.searchParams.set('apiUrl', this.config.apiUrl);
      if (this.config.apiKey) url.searchParams.set('apiKey', this.config.apiKey);
      if (this.config.prefill && Object.keys(this.config.prefill).length) url.searchParams.set('prefill', JSON.stringify(this.config.prefill));
      iframe.src = url.toString();
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
      iframe.setAttribute('title', 'A1 Garage Door Booking Widget');

      modalContainer.appendChild(iframe);
      overlay.appendChild(modalContainer);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      // Close on overlay click
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          A1Widget.close();
        }
      });

      // Close on escape key
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          this.close();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
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
        prefill: {}
      });
    });
  }
});
