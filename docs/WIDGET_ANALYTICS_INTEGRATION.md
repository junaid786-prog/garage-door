# Widget Analytics Integration Guide

**Analytics & Tracking in Iframe Context**

This guide explains how to integrate analytics tracking when embedding the A1 Booking Widget on your website. The widget handles third-party cookie restrictions and provides rich analytics data for conversion tracking.

---

## Table of Contents

1. [Overview](#overview)
2. [Cookie Restrictions in Iframes](#cookie-restrictions-in-iframes)
3. [Session Tracking](#session-tracking)
4. [Conversion Tracking](#conversion-tracking)
5. [Integration Examples](#integration-examples)
6. [Troubleshooting](#troubleshooting)
7. [Testing](#testing)

---

## Overview

When the A1 Booking Widget runs in an iframe on your site, it faces browser security restrictions:

- **Third-party cookies are blocked** by Safari, Firefox, and Chrome (Incognito mode)
- **Analytics scripts can't set cookies** in the iframe context
- **Conversion pixels can't track users** across your site and the widget

**Our Solution:**

✅ Widget uses **localStorage** for session tracking (iframe-safe)
✅ Widget sends **session data** to your page via postMessage
✅ Widget sends **conversion data** with full analytics metadata
✅ Your page fires **your own conversion pixels** with widget data

---

## Cookie Restrictions in Iframes

### The Problem

Modern browsers block third-party cookies in iframes to protect user privacy:

```
your-site.com (parent)
  └── iframe: widget.a1garagedoor.com
      └── GTM/GA4 tries to set cookies
          └── ❌ BLOCKED by browser
```

**Impact:**
- Session tracking breaks
- Client IDs regenerate on every load
- Conversion attribution is lost
- Users appear as "new" visitors every time

### How We Solve It

1. **Widget-side:** Uses `sessionStorage`/`localStorage` for tracking (not blocked in iframes)
2. **Your-side:** Widget sends session data to your page via `postMessage`
3. **Your-side:** You track sessions and conversions in your own analytics

---

## Session Tracking

### When Widget Loads

The widget automatically sends session tracking data when it finishes loading:

```javascript
// Event: widget.loaded
{
  type: 'widget.loaded',
  data: {
    version: '2.0.0',
    sessionId: 'uuid-v4-session-id',     // Current session
    clientId: 'uuid-v4-client-id',       // Persistent user ID
    utmParams: {                         // Attribution data
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'spring-sale',
      gclid: 'xxx',                      // Google Ads click ID
      fbclid: 'yyy',                     // Facebook click ID
      msclkid: 'zzz'                     // Microsoft Ads click ID
    }
  }
}
```

### Integration Example

```javascript
A1Widget.open({
  onSessionStart: function(session) {
    console.log('Widget session started:', session);

    // Track in your GA4
    if (typeof gtag === 'function') {
      gtag('event', 'widget_session_start', {
        widget_session_id: session.sessionId,
        widget_client_id: session.clientId,
        utm_source: session.utmParams.utm_source,
        utm_medium: session.utmParams.utm_medium,
        utm_campaign: session.utmParams.utm_campaign,
      });
    }

    // Store session for later (link booking to session)
    sessionStorage.setItem('widget_session_id', session.sessionId);

    // Send to your backend
    fetch('/api/track/widget-session-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
  }
});
```

### Session Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session ID (survives page refresh) |
| `clientId` | string | Persistent user ID (cross-session tracking) |
| `utmParams` | object | UTM parameters and ad click IDs |
| `utmParams.utm_source` | string | Traffic source (e.g., "google", "facebook") |
| `utmParams.utm_medium` | string | Traffic medium (e.g., "cpc", "email") |
| `utmParams.utm_campaign` | string | Campaign name |
| `utmParams.gclid` | string | Google Ads click ID |
| `utmParams.fbclid` | string | Facebook click ID |
| `utmParams.msclkid` | string | Microsoft Ads click ID |
| `loadedAt` | string | ISO timestamp when widget loaded |

---

## Conversion Tracking

### When Booking Completes

The widget sends rich conversion data when a booking is successfully created:

```javascript
// Event: booking.completed
{
  type: 'booking.completed',
  data: {
    bookingId: 'booking-uuid',
    confirmationNumber: 'A1-12345',
    serviceType: 'Garage Door Repair',
    scheduledDate: '2026-03-15',
    customerEmail: 'customer@example.com',

    // Analytics metadata 
    analytics: {
      sessionId: 'uuid-v4-session-id',
      clientId: 'uuid-v4-client-id',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'spring-sale',
      gclid: 'xxx',                  // For Google Ads conversion tracking
      fbclid: 'yyy',                 // For Facebook conversion tracking
      msclkid: 'zzz',                // For Microsoft Ads conversion tracking
      referrer: 'https://google.com',
      flowVersion: 'rr_v1',
      sameDay: true                  // Same-day booking flag
    }
  }
}
```

### Integration Example

The widget **automatically fires** Google Ads and Facebook Pixel conversions if those scripts are present on your page. You can also fire your own custom tracking:

```javascript
A1Widget.open({
  onBookingComplete: function(data) {
    console.log('Booking completed:', data);

    // Fire your GA4 conversion event
    if (typeof gtag === 'function') {
      gtag('event', 'purchase', {
        transaction_id: data.bookingId,
        value: 100.0,
        currency: 'USD',
        items: [{
          item_id: data.serviceType,
          item_name: data.serviceType,
          quantity: 1,
          price: 100.0,
        }],
        // Include attribution data
        session_campaign_id: data.analytics.sessionId,
        utm_source: data.analytics.utmSource,
        utm_medium: data.analytics.utmMedium,
        utm_campaign: data.analytics.utmCampaign,
      });
    }

    // Send to your backend CRM
    fetch('/api/bookings/external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking: data,
        attribution: {
          source: data.analytics.utmSource || 'direct',
          medium: data.analytics.utmMedium || 'none',
          campaign: data.analytics.utmCampaign || 'none',
          gclid: data.analytics.gclid,
          fbclid: data.analytics.fbclid,
        }
      }),
    });

    // Redirect to thank you page (optional)
    setTimeout(() => {
      window.location.href = '/thank-you?booking=' + data.bookingId;
    }, 3000);
  }
});
```

### Conversion Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `bookingId` | string | Unique booking ID |
| `confirmationNumber` | string | User-facing confirmation number |
| `serviceType` | string | Type of service booked |
| `scheduledDate` | string | Appointment date (YYYY-MM-DD) |
| `customerEmail` | string | Customer email address |
| **`analytics`** | **object** | **Rich analytics metadata** |
| `analytics.sessionId` | string | Session ID (link to session start) |
| `analytics.clientId` | string | Client ID (cross-session user) |
| `analytics.utmSource` | string | Attribution source |
| `analytics.utmMedium` | string | Attribution medium |
| `analytics.utmCampaign` | string | Campaign name |
| `analytics.gclid` | string | Google Ads click ID |
| `analytics.fbclid` | string | Facebook click ID |
| `analytics.msclkid` | string | Microsoft Ads click ID |
| `analytics.referrer` | string | Referring URL |
| `analytics.flowVersion` | string | Widget version (e.g., "rr_v1") |
| `analytics.sameDay` | boolean | Same-day booking flag |

---

## Integration Examples

### Example 1: Google Ads Conversion Tracking

```javascript
A1Widget.open({
  onBookingComplete: function(data) {
    // Fire Google Ads conversion
    if (typeof gtag === 'function' && data.analytics) {
      gtag('event', 'conversion', {
        'send_to': 'AW-123456789/AbCdEfGhIjKlMnOpQrSt', // Your conversion ID
        'value': 100.0,
        'currency': 'USD',
        'transaction_id': data.bookingId,
      });

      console.log('Google Ads conversion fired:', data.bookingId);
    }
  }
});
```

### Example 2: Facebook Pixel Conversion Tracking

```javascript
A1Widget.open({
  onBookingComplete: function(data) {
    // Fire Facebook Pixel conversion
    if (typeof fbq === 'function' && data.analytics) {
      fbq('track', 'Lead', {
        content_name: data.serviceType,
        value: 100.0,
        currency: 'USD',
      });

      console.log('Facebook Pixel conversion fired:', data.bookingId);
    }
  }
});
```

### Example 3: Custom Backend Analytics

```javascript
A1Widget.open({
  onSessionStart: function(session) {
    // Track session start
    fetch('/api/analytics/widget-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'session_start',
        sessionId: session.sessionId,
        clientId: session.clientId,
        utmParams: session.utmParams,
        timestamp: new Date().toISOString(),
      }),
    });
  },

  onBookingComplete: function(data) {
    // Track conversion
    fetch('/api/analytics/widget-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'booking_completed',
        bookingId: data.bookingId,
        serviceType: data.serviceType,
        analytics: data.analytics,
        timestamp: new Date().toISOString(),
      }),
    });
  }
});
```

### Example 4: Link Session to Conversion

```javascript
let widgetSessionId = null;

A1Widget.open({
  onSessionStart: function(session) {
    // Store session ID
    widgetSessionId = session.sessionId;

    // Track session start in your analytics
    gtag('event', 'widget_opened', {
      session_id: session.sessionId,
      source: session.utmParams.utm_source || 'direct',
    });
  },

  onBookingComplete: function(data) {
    // Verify session matches
    if (widgetSessionId === data.analytics.sessionId) {
      console.log('Session → Conversion link verified');

      // Track full funnel
      gtag('event', 'widget_conversion', {
        session_id: widgetSessionId,
        booking_id: data.bookingId,
        time_to_convert: Date.now() - performance.now(),
      });
    }
  }
});
```

---

## Troubleshooting

### Issue: Session data is `undefined`

**Cause:** Widget hasn't finished loading yet.

**Solution:** Session data is only available in the `onSessionStart` callback. Don't try to access it before the widget loads.

```javascript
// ❌ Wrong
const session = A1Widget._widgetSession; // undefined

// ✅ Correct
A1Widget.open({
  onSessionStart: function(session) {
    console.log('Session:', session); // Available here
  }
});
```

---

### Issue: Analytics not firing

**Cause:** `gtag` or `fbq` not loaded on the page.

**Solution:** Ensure Google Analytics/Facebook Pixel scripts are loaded before opening the widget.

```html
<!-- Load Google Analytics first -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- Then load widget script -->
<script src="/demo/widget-embed.js"></script>
```

---

### Issue: `gclid` or `fbclid` is `undefined`

**Cause:** User didn't come from a Google/Facebook ad.

**Solution:** These fields are only present when users click paid ads. For organic traffic, they'll be `undefined`.

```javascript
onBookingComplete: function(data) {
  const source = data.analytics.gclid ? 'google-ads' :
                 data.analytics.fbclid ? 'facebook-ads' :
                 data.analytics.utmSource || 'direct';

  console.log('Traffic source:', source);
}
```

---

### Issue: Ad blocker blocking analytics

**Cause:** Browser extensions like uBlock Origin block analytics scripts.

**Solution:** Send analytics data to your own backend endpoint (not blocked):

```javascript
onBookingComplete: function(data) {
  // Send to your backend (not blocked by ad blockers)
  fetch('/api/track-conversion', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

---

## Testing

### Test Session Tracking

1. Open browser DevTools → Console
2. Click "Book Now" button
3. Look for: `[A1Widget] Session tracking: { sessionId: '...', ... }`
4. Verify `onSessionStart` callback fires
5. Check sessionStorage: `Application → Storage → Session Storage → a1_session_id`

### Test Conversion Tracking

1. Complete a booking flow in the widget
2. Look for: `[A1Widget] Booking completed!`
3. Look for: `[A1Widget] Analytics metadata: { ... }`
4. Verify `onBookingComplete` callback fires with `data.analytics`
5. Check your analytics dashboard (GA4, Facebook Events Manager) for events

### Test Cookie Restrictions (Safari)

1. Open Safari → Preferences → Privacy → Enable "Prevent cross-site tracking"
2. Open your site with embedded widget
3. Complete booking
4. Verify session tracking still works (uses localStorage fallback)
5. Check: `Application → Local Storage → a1_client_id`

### Test Attribution Tracking

1. Add UTM parameters to your page URL: `?utm_source=test&utm_campaign=phase6`
2. Open widget
3. Complete booking
4. Verify `data.analytics.utmSource === 'test'` and `data.analytics.utmCampaign === 'phase6'`

### Debug Mode

Enable verbose logging:

```javascript
// Before opening widget
localStorage.setItem('a1_debug', 'true');

A1Widget.open({
  // ... config
});
```

This will log all postMessage events and analytics data to console.

---

## Best Practices

### 1. Always handle both callbacks

```javascript
A1Widget.open({
  onSessionStart: function(session) {
    // Track session start
  },
  onBookingComplete: function(data) {
    // Track conversion
  }
});
```

### 2. Link session to conversion

```javascript
let sessionData = null;

A1Widget.open({
  onSessionStart: function(session) {
    sessionData = session;
  },
  onBookingComplete: function(data) {
    // You can now correlate session → conversion
    const attribution = {
      sessionId: sessionData.sessionId,
      bookingId: data.bookingId,
      source: sessionData.utmParams.utm_source,
    };
    // Send to your analytics
  }
});
```

### 3. Handle errors gracefully

```javascript
A1Widget.open({
  onBookingComplete: function(data) {
    try {
      // Fire analytics
      gtag('event', 'conversion', { ... });
    } catch (e) {
      // Fallback: send to backend
      fetch('/api/track-conversion', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  }
});
```

### 4. Don't block on analytics

```javascript
// ❌ Bad: Blocks user experience
onBookingComplete: function(data) {
  await fetch('/api/track-conversion', { ... }); // Blocks
  window.location.href = '/thank-you'; // User waits
}

// ✅ Good: Fire and forget
onBookingComplete: function(data) {
  fetch('/api/track-conversion', { ... }); // Non-blocking
  setTimeout(() => {
    window.location.href = '/thank-you'; // Immediate redirect
  }, 100);
}
```

---

## Summary

✅ **Session tracking works in iframes** (uses localStorage, not cookies)
✅ **Widget sends session data** to your page on load
✅ **Widget sends conversion data** with full analytics metadata
✅ **Your page fires conversion pixels** with widget data
✅ **Attribution preserved** (UTM params, gclid, fbclid)
✅ **Ad blocker resistant** (you control the data flow)

For questions or issues, see [WIDGET_TROUBLESHOOTING.md](./WIDGET_TROUBLESHOOTING.md).

---

**Last Updated:** 2026-03-02 (Phase 6 Complete)
