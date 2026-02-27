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
      const modal = document.createElement('div');
      modal.id = 'a1-widget-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;animation:fadeIn 0.2s;';
      const container = document.createElement('div');
      container.style.cssText = 'position:relative;width:100%;max-width:600px;height:90vh;max-height:900px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 25px 70px rgba(0,0,0,0.4);animation:slideUp 0.3s;';
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close booking widget');
      closeBtn.style.cssText = 'position:absolute;top:15px;right:15px;width:40px;height:40px;background:rgba(255,255,255,0.95);border:none;border-radius:50%;font-size:32px;line-height:1;cursor:pointer;z-index:1;box-shadow:0 4px 12px rgba(0,0,0,0.2);color:#666;transition:all 0.2s;font-weight:300;';
      closeBtn.onmouseover = function() { this.style.background = '#D7262D'; this.style.color = 'white'; this.style.transform = 'rotate(90deg)'; };
      closeBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.95)'; this.style.color = '#666'; this.style.transform = 'rotate(0deg)'; };
      closeBtn.onclick = () => this.close();
      const iframe = document.createElement('iframe');
      const url = new URL(this.config.widgetUrl);
      if (this.config.apiUrl) url.searchParams.set('apiUrl', this.config.apiUrl);
      if (this.config.apiKey) url.searchParams.set('apiKey', this.config.apiKey);
      if (this.config.prefill && Object.keys(this.config.prefill).length) url.searchParams.set('prefill', JSON.stringify(this.config.prefill));
      iframe.src = url.toString();
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
      iframe.setAttribute('title', 'A1 Garage Door Booking Widget');
      container.appendChild(closeBtn);
      container.appendChild(iframe);
      modal.appendChild(container);
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';
      modal.addEventListener('click', (e) => { if (e.target === modal) this.close(); });
      const escHandler = (e) => { if (e.key === 'Escape') { this.close(); document.removeEventListener('keydown', escHandler); }};
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
