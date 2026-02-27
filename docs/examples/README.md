# Widget Embed Examples

Working examples demonstrating different integration methods for the A1 Garage booking widget.

## Files

### 1. `iframe-modal-demo.html`
**Use Case:** External website "BOOK NOW" button integration
**Method:** Iframe Modal (Recommended)
**Features:**
- Full working demo with hero section and features
- "BOOK NOW" button opens widget in modal overlay
- Close button and escape key support
- Mobile responsive
- Production-ready code

**To Test:**
1. Start backend: `cd garage-door && npm run dev`
2. Start frontend: `cd garage-door-frontend && npm run dev`
3. Open `iframe-modal-demo.html` in browser
4. Click "BOOK NOW" button

### 2. `inline-iframe-demo.html`
**Use Case:** Dedicated booking page with embedded widget
**Method:** Inline Iframe
**Features:**
- Widget embedded directly on page
- No modal overlay
- Clean, simple integration
- Good for dedicated booking pages

**To Test:**
1. Start backend and frontend (see above)
2. Open `inline-iframe-demo.html` in browser
3. Widget loads immediately inline

## Configuration

All demos use localhost URLs for development:
- **Frontend:** `http://localhost:5173`
- **Backend:** `http://localhost:3000`
- **API Key:** `garage-door-api-key-2026`

### For Production

Update these values in the HTML files:

```javascript
A1Widget.open({
  apiUrl: 'https://api.a1garagedoor.com',  // Production API
  apiKey: 'your-production-api-key',        // Secure API key
  prefill: {
    zipCode: '85001'  // Optional pre-fill
  }
});
```

## Requirements

- Backend API running on port 3000
- Frontend running on port 5173 (or deployed build)
- CORS configured to allow external domains

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Security Notes

- API keys are visible in frontend code - use domain-restricted keys
- CORS must be configured on backend to allow embedding domains
- For production, consider server-side API proxy to hide keys

## Demo Instructions

**Best demo file:** `iframe-modal-demo.html`

**Demo flow:**
1. Show the example website with hero section
2. Click "BOOK NOW" button
3. Modal opens with booking widget
4. Complete first few steps to show functionality
5. Close modal with X button or escape key
6. Explain: "This is how external sites will embed our widget"

**Key talking points:**
- ✅ Works on any website with simple button + script
- ✅ Mobile responsive, works on all devices
- ✅ Secure iframe isolation prevents CSS/JS conflicts
- ✅ Backend API handles all booking logic
- ✅ Real-time slot availability via SchedulingPro
- ✅ Complete 8-step booking flow
- ✅ Analytics tracking built-in

---

**Created:** 2026-02-26
**Status:** ✅ Ready for Friday Demo
