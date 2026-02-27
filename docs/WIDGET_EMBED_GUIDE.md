# Widget Embed Guide

Add a "BOOK NOW" button to any website that opens the A1 Garage booking widget in a modal.

---

## Quick Start

```html
<button id="book-now">BOOK NOW</button>

<script src="https://cdn.yourdomain.com/a1-widget.js"></script>
<script>
  document.getElementById('book-now').onclick = () => {
    A1Widget.open({
      apiUrl: 'https://api.a1garagedoor.com',
      apiKey: 'your-api-key'
    });
  };
</script>
```

Done. Widget opens in modal overlay.

---

## Configuration

**Required:**
- `apiUrl` - Backend API URL
- `apiKey` - Partner API key

**Optional:**
```javascript
A1Widget.open({
  apiUrl: 'https://api.a1garagedoor.com',
  apiKey: 'your-api-key',
  prefill: {
    zipCode: '85001',
    name: 'John Doe',
    phone: '555-1234'
  }
});
```

---

## How It Works

1. Button click triggers `A1Widget.open()`
2. JavaScript creates modal overlay with iframe
3. Iframe loads widget from your domain
4. User completes booking
5. Modal closes (X button, Escape key, or background click)

**Benefits:**
- ✅ Complete CSS/JS isolation (iframe)
- ✅ Mobile responsive
- ✅ No CORS issues
- ✅ Works on any website

---

## Working Example

See: `examples/iframe-modal-demo.html`

**To test:**
```bash
cd garage-door && npm run dev              # Start backend
cd garage-door-frontend && npm run dev     # Start frontend
open examples/iframe-modal-demo.html       # Open demo
```

---

## Production Deployment

1. **Build widget:**
   ```bash
   cd garage-door-frontend && npm run build
   ```

2. **Deploy `dist/` folder** to static hosting (Vercel, Netlify, S3)

3. **Configure backend CORS:**
   ```javascript
   // garage-door/src/app.js
   app.use(cors({
     origin: ['https://partner-site.com', 'https://booking.a1garagedoor.com']
   }));
   ```

4. **Create partner API keys** (one per domain, with restrictions)

---

## Embed Script

The actual embed script code is in `examples/iframe-modal-demo.html` (lines 85-146).

Copy/paste and modify for production URLs.

---

## Troubleshooting

**Modal doesn't open?**
- Check browser console for errors
- Verify backend: `curl http://localhost:3000/health`

**Widget shows errors?**
- Check CORS configured for partner domain
- Verify API key valid

---

**Version:** 1.0.0
**Status:** ✅ Ready
