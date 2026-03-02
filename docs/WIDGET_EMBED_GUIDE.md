# Widget Embed Guide

Embed the A1 Garage Door booking widget on any website.

---

## Quick Start

```html
<button id="book-now">BOOK NOW</button>

<script src="https://yoursite.com/demo/widget-embed.js"></script>
<script>
  A1Widget.open();
</script>
```

Done. Auto-detects environment (localhost vs production).

---

## Configuration Options

```javascript
A1Widget.open({
  // URLs (optional - auto-detects if omitted)
  widgetUrl: 'https://rapid-response-scheduler.vercel.app',
  apiUrl: 'https://garage-door-mwkt.onrender.com',
  apiKey: 'your-api-key',

  // Prefill form data (optional)
  prefill: {
    zipCode: '85001',
    name: 'John Doe',
    phone: '555-1234'
  },

  // Security (optional - override allowed origins)
  allowedOrigins: ['https://yoursite.com'],

  // Callbacks
  onSessionStart: (session) => {
    // Widget loaded - session contains: sessionId, clientId, utmParams
    console.log('Session:', session.sessionId);
  },

  onBookingComplete: (data) => {
    // Booking confirmed - data contains: bookingId, serviceType, analytics
    console.log('Booking:', data.bookingId);
    // Redirect user: window.location = '/thank-you';
  },

  onError: (error, message) => {
    console.error(error, message);
  },

  onClose: (reason) => {
    // Reasons: 'booking_completed', 'escape_key', 'overlay_click', 'manual'
    console.log('Closed:', reason);
  }
});
```

---

## PostMessage Events (Widget → Parent)

| Event | Data | Description |
|-------|------|-------------|
| `widget.loaded` | `{version, sessionId, clientId, utmParams}` | Widget ready |
| `booking.completed` | `{bookingId, serviceType, analytics}` | Booking confirmed |
| `widget.close` | `{reason}` | Widget wants to close |
| `widget.error` | `{error, message}` | Error occurred |
| `widget.height` | `{height, scrollHeight}` | Height changed |

All events have `source: 'a1-booking-widget'`.

---

## Analytics Integration

Widget sends rich analytics data in `booking.completed` event:

```javascript
onBookingComplete: (data) => {
  const { analytics } = data;

  // Fire your conversion pixels
  gtag('event', 'conversion', {
    'send_to': 'AW-XXXXXXX/XXXXX',
    'transaction_id': data.bookingId,
    'value': 100.0
  });

  fbq('track', 'Lead', {
    content_name: data.serviceType,
    value: 100.0
  });

  // Analytics contains:
  // - sessionId, clientId (tracking)
  // - utmSource, utmMedium, utmCampaign (attribution)
  // - gclid, fbclid, msclkid (ad click IDs)
  // - referrer, sameDay
}
```

See [WIDGET_ANALYTICS_INTEGRATION.md](WIDGET_ANALYTICS_INTEGRATION.md) for details.

---

## Demo

**Local:** `http://localhost:3000/demo/`
**Production:** `https://garage-door-mwkt.onrender.com/demo/`

View source: `public/demo/widget-embed.js`

---

## Security

Widget validates postMessage origins. Add your domain to whitelist:

**Backend:** `garage-door/.env`
```env
ALLOWED_EMBED_DOMAINS=https://yoursite.com
ALLOWED_PARENT_ORIGINS=https://yoursite.com
```

**Frontend:** `garage-door-frontend/.env.production`
```env
VITE_ALLOWED_PARENT_ORIGINS=https://yoursite.com
```

See [WIDGET_SECURITY.md](WIDGET_SECURITY.md) for details.

---

## Production Deployment

1. Copy `public/demo/widget-embed.js` to your site
2. Update URLs in script (or omit for auto-detection)
3. Add your domain to security whitelist
4. Test on staging environment
5. Deploy

**Checklist:**
- [ ] CORS configured for your domain
- [ ] CSP allows iframe embedding
- [ ] Domain in security whitelist
- [ ] SSL certificate (HTTPS required)
- [ ] Test on mobile devices
- [ ] Test conversion tracking

---

## Troubleshooting

**Modal doesn't open?**
- Check console for errors
- Verify backend running: `curl https://yourapi.com/health`

**Widget shows blank/white?**
- Check browser console for CORS errors
- Verify domain in `ALLOWED_EMBED_DOMAINS`

**PostMessage not working?**
- Check console for "unauthorized origin" warnings
- Verify domain in `ALLOWED_PARENT_ORIGINS`
- Check `allowedOrigins` config

**Conversion tracking missing?**
- Check `data.analytics` exists in `onBookingComplete`
- Verify gtag/fbq loaded before widget
- Check browser console for analytics errors

**Mobile issues?**
- Widget is responsive (320px - 1920px)
- Safe area insets for notched phones
- Test landscape/portrait orientation

---

## Support

Questions? Check existing docs:
- [WIDGET_SECURITY.md](WIDGET_SECURITY.md) - Security config
- [WIDGET_ANALYTICS_INTEGRATION.md](WIDGET_ANALYTICS_INTEGRATION.md) - Analytics setup

---

**Version:** 2.0.0 (Phase 6 - Production Ready)
