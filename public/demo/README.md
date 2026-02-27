# Widget Embed Demo

Professional demonstration of the A1 Garage Door booking widget embedded on an external website.

## Access

- **Local:** `http://localhost:3000/demo/`
- **Production:** `https://garage-door-mwkt.onrender.com/demo/`

## What It Shows

- Clean landing page with "BOOK APPOINTMENT NOW" button
- Click button → booking widget opens in modal overlay
- Demonstrates exactly how external sites (e.g., abc.com) will embed the scheduler

## Environment Auto-Detection

The demo automatically detects the environment:

- **Localhost:** Uses `http://localhost:5173` (widget) + `http://localhost:3000` (API)
- **Production:** Uses `https://rapid-response-scheduler.vercel.app` (widget) + `https://garage-door-mwkt.onrender.com` (API)

## Files

- `index.html` - Demo landing page
- `widget-embed.js` - Widget integration script (shows how external sites embed the scheduler)

## Local Development

Requires both servers running:
- Backend: `npm run dev` (port 3000)
- Frontend: `cd ../garage-door-frontend && npm run dev` (port 5173)

## For External Sites

Copy `widget-embed.js` to the external website and add:

```html
<button id="book-now-btn">Book Appointment</button>
<script src="widget-embed.js"></script>
```

The script auto-detects environment - no configuration needed.
