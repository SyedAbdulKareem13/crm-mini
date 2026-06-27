import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Manzil One — native Android shell.
 *
 * The shell boots a glassmorphic launch experience (www/index.html), wires up
 * native capabilities, then hands the WebView over to the live Manzil One web
 * app so the UI/UX, animations and data are byte-identical to production and
 * backed by the *same* database.
 *
 * 👉 Set the deployed URL in ONE place: www/app.config.js  (window.MANZIL_REMOTE_URL)
 *    and keep the host list in `server.allowNavigation` below in sync.
 */
const config: CapacitorConfig = {
  appId: "com.manzilone.app",
  appName: "Manzil One",
  webDir: "www",
  backgroundColor: "#f7f7f0",
  android: {
    allowMixedContent: false,
    backgroundColor: "#f7f7f0",
  },
  server: {
    androidScheme: "https",
    // Origins that stay *inside* the app WebView. Anything else opens in the
    // system browser. Add your production host here.
    allowNavigation: [
      "manzilone.vercel.app",
      "*.vercel.app",
      "*.manzilone.com",
      "accounts.google.com",
      "*.googleusercontent.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#f7f7f0",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#f7f7f0",
    },
    Keyboard: {
      resize: "native",
    },
  },
};

export default config;
