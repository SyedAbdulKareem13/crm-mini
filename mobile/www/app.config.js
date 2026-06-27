/**
 * ───────────────────────────────────────────────────────────────────────────
 *  THE ONLY THING YOU NEED TO EDIT.
 *  Point this at your deployed Manzil One web app (same DB, full backend).
 *  e.g. "https://manzilone.vercel.app"  or  "https://crm.yourdomain.com"
 *  Also add the host to `server.allowNavigation` in capacitor.config.ts.
 *
 *  NOTE: we deep-link straight to /app so the app opens to the product
 *  (dashboard / login) instead of the marketing landing page, which is a
 *  desktop-only WebGL showcase and isn't meant for phones.
 * ───────────────────────────────────────────────────────────────────────────
 */
window.MANZIL_REMOTE_URL = "https://manzilone.vercel.app/app";

// Minimum time (ms) the glass launch animation stays on screen.
window.MANZIL_SPLASH_MIN_MS = 1600;
