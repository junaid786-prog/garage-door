# Widget Security Configuration Guide

**Document Version:** 1.0.0
**Last Updated:** 2026-02-28

This document outlines the security measures implemented in the A1 Garage Door Booking Widget and the requirements for external sites that wish to embed the widget.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [For Widget Administrators](#for-widget-administrators)
3. [For External Site Operators](#for-external-site-operators)
4. [Security Features](#security-features)
5. [Configuration Reference](#configuration-reference)
6. [Troubleshooting](#troubleshooting)

---

## Security Overview

The A1 Booking Widget implements multiple layers of security to protect both the widget and embedding sites:

- **Content Security Policy (CSP)** - Controls which domains can embed the widget
- **Cross-Origin Resource Sharing (CORS)** - Controls which domains can make API requests
- **PostMessage Origin Validation** - Validates all inter-frame communication
- **XSS Prevention** - Protects against cross-site scripting attacks
- **Input Sanitization** - All user input is validated and sanitized

---

## For Widget Administrators

### Adding New Domains to Whitelist

When a new external site wants to embed the widget, you must update the security configuration:

#### 1. Backend Configuration (garage-door/.env)

Add the new domain to these variables:

```env
# Allow the widget frontend to be accessed from these origins
CORS_ORIGIN=http://localhost:5173,https://rapid-response-scheduler.vercel.app,https://newsite.com

# Allow these domains to embed the widget in an iframe
ALLOWED_EMBED_DOMAINS=http://localhost:3000,http://localhost:5173,https://rapid-response-scheduler.vercel.app,https://newsite.com

# Allow postMessage communication from these origins
ALLOWED_PARENT_ORIGINS=http://localhost:3000,http://localhost:5173,https://rapid-response-scheduler.vercel.app,https://garage-door-mwkt.onrender.com,https://newsite.com
```

**Important:**
- Use comma-separated values with no spaces after commas
- Always use HTTPS in production (HTTP is only for localhost development)
- Include both `www.` and non-`www.` versions if needed

#### 2. Frontend Configuration (garage-door-frontend/.env.production)

Add the new domain to the frontend configuration:

```env
# Allow postMessage communication with these parent origins
VITE_ALLOWED_PARENT_ORIGINS=https://rapid-response-scheduler.vercel.app,https://garage-door-mwkt.onrender.com,https://newsite.com
```

#### 3. Deploy Changes

After updating the environment variables:

1. **Backend:** Restart the backend server for changes to take effect
2. **Frontend:** Rebuild and redeploy the frontend application

```bash
# Backend (restart the server)
npm run dev  # Development
# OR deploy to production environment

# Frontend (rebuild)
cd garage-door-frontend
npm run build
# Deploy the dist/ folder to your hosting service
```

---

## For External Site Operators

### Requirements to Embed the Widget

To embed the A1 Booking Widget on your site, you must:

1. **Request Whitelisting** - Contact the A1 Garage team to add your domain to the whitelist
2. **Use HTTPS** - Your site must use HTTPS in production (HTTP only allowed for localhost development)
3. **Implement the Embed Script** - Use the provided widget-embed.js script

### Integration Steps

#### 1. Request Domain Whitelisting

Contact A1 Garage support with:
- Your production domain (e.g., `https://yoursite.com`)
- Whether you need both `www.yoursite.com` and `yoursite.com`
- Your estimated go-live date

#### 2. Add the Widget Script

Add this script to your HTML page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Site</title>
</head>
<body>
  <!-- Your page content -->

  <button id="book-now-btn">Book Appointment Now</button>

  <!-- A1 Widget Embed Script -->
  <script src="https://garage-door-mwkt.onrender.com/demo/widget-embed.js"></script>

  <script>
    // Initialize widget when button is clicked
    document.getElementById('book-now-btn').addEventListener('click', function() {
      A1Widget.open({
        // Optional: Override allowed origins for postMessage validation
        // (Only needed if you're embedding on a subdomain)
        allowedOrigins: ['https://rapid-response-scheduler.vercel.app'],

        // Optional: Callbacks
        onBookingComplete: function(data) {
          console.log('Booking completed!', data);
          // Fire your conversion tracking, redirect user, etc.
        },
        onError: function(error, message) {
          console.error('Widget error:', error, message);
          // Handle error
        },
        onClose: function(reason) {
          console.log('Widget closed:', reason);
          // User closed widget
        }
      });
    });
  </script>
</body>
</html>
```

#### 3. Test in Staging

Before going live:
1. Test the widget on your staging site
2. Verify booking flow works end-to-end
3. Test on multiple browsers (Chrome, Firefox, Safari, Edge)
4. Test on mobile devices

#### 4. Monitor for Errors

Check your browser console for security errors:
- **CSP Violations:** If you see CSP errors, your domain may not be whitelisted
- **PostMessage Rejected:** The widget origin may not be in your `allowedOrigins` array
- **CORS Errors:** Contact A1 Garage support - backend configuration may need updating

---

## Security Features

### 1. Content Security Policy (CSP)

**Backend CSP Headers:**
The backend sets CSP headers to control:
- Where the widget can load scripts/styles from
- Which domains can embed the widget (`frame-ancestors`)
- Where the widget can make network requests

**Frontend CSP Meta Tag:**
The widget HTML includes a CSP meta tag for additional XSS protection.

### 2. Cross-Origin Resource Sharing (CORS)

The API backend only accepts requests from whitelisted origins. This prevents unauthorized sites from making API calls.

### 3. PostMessage Origin Validation

All communication between the widget (iframe) and parent page is validated:

**Widget → Parent Messages:**
- `widget.loaded` - Widget is ready
- `widget.close` - User closed widget
- `widget.height` - Content height changed
- `widget.error` - Error occurred
- `booking.completed` - Booking was successful

**Parent → Widget Messages:**
- `widget.config` - Configuration from parent (future use)
- `widget.close` - Parent requests widget to close

All messages are validated to ensure:
- Message comes from an allowed origin
- Message structure matches expected schema
- No malicious data is injected

### 4. XSS Prevention

- No use of `innerHTML` with untrusted data
- All user input is validated and sanitized
- CSP prevents inline scripts from untrusted sources
- React's built-in XSS protection (escaping)

### 5. Third-Party Cookie Restrictions

**Note:** Modern browsers (Safari, Firefox, Chrome) block third-party cookies by default. The widget handles this by:
- Using `localStorage` for session tracking instead of cookies
- Sending session data via postMessage to parent page
- Parent page can track conversions using first-party cookies

---

## Configuration Reference

### Backend Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `CORS_ORIGIN` | Domains that can access the widget frontend | `https://yoursite.com,https://widget.a1garage.com` |
| `ALLOWED_EMBED_DOMAINS` | Domains that can embed the widget in iframe | `https://yoursite.com` |
| `ALLOWED_PARENT_ORIGINS` | Parent origins allowed for postMessage | `https://yoursite.com,https://backend.a1garage.com` |

### Frontend Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_ALLOWED_PARENT_ORIGINS` | Parent origins for postMessage validation | `https://yoursite.com,https://backend.a1garage.com` |

### Widget Embed Options

| Option | Type | Description |
|--------|------|-------------|
| `widgetUrl` | string | Widget frontend URL (auto-detected) |
| `apiUrl` | string | Backend API URL (auto-detected) |
| `apiKey` | string | API authentication key (auto-detected) |
| `allowedOrigins` | string[] | Override allowed origins for postMessage |
| `onBookingComplete` | function | Callback when booking completes |
| `onError` | function | Callback when error occurs |
| `onClose` | function | Callback when widget closes |

---

## Troubleshooting

### Widget Won't Load

**Symptom:** Blank iframe or loading spinner never disappears

**Possible Causes:**
1. **Domain not whitelisted** - Check CSP `frame-ancestors` in backend
2. **CORS error** - Check browser console for CORS errors
3. **Network issue** - Check if widget URL is accessible

**Solution:**
- Contact A1 Garage support to verify domain is whitelisted
- Check browser console for specific error messages
- Verify widget URL loads directly in browser

### PostMessage Errors

**Symptom:** Console shows "Rejected message from unauthorized origin"

**Possible Causes:**
1. Widget origin not in `allowedOrigins` array
2. Parent page origin not whitelisted in backend

**Solution:**
```javascript
// Override allowed origins when opening widget
A1Widget.open({
  allowedOrigins: [
    'https://rapid-response-scheduler.vercel.app',
    'https://your-widget-domain.com'
  ]
});
```

### CSP Violations

**Symptom:** Browser console shows CSP violation errors

**Possible Causes:**
1. Domain not in backend's `ALLOWED_EMBED_DOMAINS`
2. Conflicting CSP headers from your site

**Solution:**
- Request domain whitelisting from A1 Garage support
- Check your site's CSP headers don't block the widget

### Booking Doesn't Complete

**Symptom:** Widget loads but booking submission fails

**Possible Causes:**
1. API endpoint blocked by CORS
2. Network firewall blocking requests
3. Backend API error

**Solution:**
- Check browser Network tab for failed requests
- Check console for error messages
- Contact A1 Garage support with error details

---

## Security Best Practices

### For Widget Administrators

1. **Keep Whitelist Minimal** - Only add trusted domains
2. **Use HTTPS Everywhere** - Never allow HTTP in production
3. **Monitor Logs** - Watch for security violations
4. **Regular Audits** - Review whitelisted domains quarterly
5. **Rotate API Keys** - Change API keys periodically

### For External Site Operators

1. **Use Callbacks** - Implement `onBookingComplete` for conversion tracking
2. **Handle Errors** - Implement `onError` to gracefully handle issues
3. **Test Thoroughly** - Test on all browsers and devices before launch
4. **Monitor Performance** - Track widget load times and errors
5. **Keep Script Updated** - Use the latest version of widget-embed.js

---

## Support

For security-related questions or to request domain whitelisting:

- **Email:** support@a1garage.com
- **Documentation:** https://github.com/a1garage/widget-docs
- **Emergency Contact:** Contact your A1 Garage account manager

---

## Changelog

### Version 1.0.0 (2026-02-28)
- Initial security documentation
- Phase 3 security implementation complete
- CSP frame-ancestors directive
- PostMessage origin validation
- XSS prevention measures
