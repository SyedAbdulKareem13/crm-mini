/**
 * Manzil One — native boot sequence.
 * Wires Capacitor native capabilities (best-effort, never blocking), then hands
 * the WebView to the live app. Uses the global Capacitor bridge (no bundler).
 */
(function () {
  "use strict";

  var REMOTE = window.MANZIL_REMOTE_URL;
  var MIN_MS = window.MANZIL_SPLASH_MIN_MS || 1400;
  var startedAt = Date.now();
  var navigated = false;

  var cap = window.Capacitor || {};
  var P = cap.Plugins || {};
  var isNative = typeof cap.isNativePlatform === "function" ? cap.isNativePlatform() : false;

  var statusEl = document.getElementById("status");
  var offlineEl = document.getElementById("offline");
  var retryBtn = document.getElementById("retry");

  function say(msg) { if (statusEl) statusEl.textContent = msg; }
  function showOffline(show) { if (offlineEl) offlineEl.hidden = !show; }

  /* ── Native capabilities (all best-effort, fire-and-forget) ──────────────── */
  function setupNative() {
    if (!isNative) return;
    if (P.StatusBar) {
      try { P.StatusBar.setStyle({ style: "DARK" }); P.StatusBar.setBackgroundColor({ color: "#0b0f1a" }); } catch (e) {}
    }
    if (P.SplashScreen) { try { P.SplashScreen.hide(); } catch (e) {} }
    if (P.Haptics) { try { P.Haptics.impact({ style: "LIGHT" }); } catch (e) {} }
    if (P.Keyboard) {
      try {
        P.Keyboard.addListener("keyboardWillShow", function () { document.documentElement.classList.add("kb-open"); });
        P.Keyboard.addListener("keyboardWillHide", function () { document.documentElement.classList.remove("kb-open"); });
      } catch (e) {}
    }
    if (P.Device && P.Preferences) {
      try {
        P.Device.getInfo().then(function (info) {
          P.Preferences.set({ key: "device_info", value: JSON.stringify(info) });
        }).catch(function () {});
      } catch (e) {}
    }
  }

  /* ── Hand-off to the live app ───────────────────────────────────────────── */
  function go() {
    if (navigated) return;
    if (!REMOTE || /your-app|example|REPLACE/i.test(REMOTE)) {
      say("Set your deployed URL in www/app.config.js");
      return;
    }
    navigated = true;
    say("Opening Manzil One…");
    document.body.classList.add("leaving");
    setTimeout(function () { window.location.replace(REMOTE); }, 380);
  }

  /* Connectivity check that can never block the hand-off. */
  function checkOnlineThen(cb) {
    if (isNative && P.Network) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; cb(true); } }, 1200);
      try {
        P.Network.getStatus().then(function (s) {
          if (done) return; done = true; clearTimeout(t); cb(!!s.connected);
        }).catch(function () { if (!done) { done = true; clearTimeout(t); cb(true); } });
      } catch (e) { if (!done) { done = true; clearTimeout(t); cb(true); } }
      return;
    }
    cb(navigator.onLine !== false);
  }

  function proceed() {
    checkOnlineThen(function (online) {
      if (!online) { showOffline(true); say("Waiting for connection…"); return; }
      showOffline(false);
      var wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
      setTimeout(go, wait);
    });
  }

  if (retryBtn) retryBtn.addEventListener("click", proceed);
  if (isNative && P.Network) {
    try {
      P.Network.addListener("networkStatusChange", function (s) {
        if (s.connected && offlineEl && !offlineEl.hidden) proceed();
      });
    } catch (e) {}
  }
  window.addEventListener("online", function () { if (offlineEl && !offlineEl.hidden) proceed(); });

  /* ── Run ──────────────────────────────────────────────────────────────────
     Hard safety net: navigate no matter what, even if a plugin/online check
     misbehaves, so the launch screen can never get stuck. */
  setupNative();
  proceed();
  setTimeout(go, MIN_MS + 2500);
})();
