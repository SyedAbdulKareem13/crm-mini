/**
 * Manzil One — native boot sequence.
 * Wires Capacitor native capabilities, then hands the WebView to the live app.
 * Uses the global Capacitor bridge (no bundler needed).
 */
(function () {
  "use strict";

  var REMOTE = window.MANZIL_REMOTE_URL;
  var MIN_MS = window.MANZIL_SPLASH_MIN_MS || 1400;
  var startedAt = Date.now();

  var cap = window.Capacitor || {};
  var P = cap.Plugins || {};
  var isNative = typeof cap.isNativePlatform === "function" ? cap.isNativePlatform() : false;

  var statusEl = document.getElementById("status");
  var offlineEl = document.getElementById("offline");
  var retryBtn = document.getElementById("retry");

  function say(msg) { if (statusEl) statusEl.textContent = msg; }

  /* ── Native capabilities ────────────────────────────────────────────────── */
  function setupNative() {
    if (!isNative) return Promise.resolve();

    var tasks = [];

    // Edge-to-edge status bar styling.
    if (P.StatusBar) {
      try {
        P.StatusBar.setStyle({ style: "DARK" });
        P.StatusBar.setBackgroundColor({ color: "#0b0f1a" });
      } catch (e) {}
    }

    // Hide the native splash — our animated glass screen takes over.
    if (P.SplashScreen) { try { P.SplashScreen.hide(); } catch (e) {} }

    // Soft haptic on launch.
    if (P.Haptics) { try { P.Haptics.impact({ style: "LIGHT" }); } catch (e) {} }

    // Keyboard: keep layout tidy.
    if (P.Keyboard) {
      try {
        P.Keyboard.addListener("keyboardWillShow", function () {
          document.documentElement.classList.add("kb-open");
        });
        P.Keyboard.addListener("keyboardWillHide", function () {
          document.documentElement.classList.remove("kb-open");
        });
      } catch (e) {}
    }

    // Push notifications: request permission + register, persist the token.
    if (P.PushNotifications) {
      tasks.push(
        P.PushNotifications.requestPermissions()
          .then(function (res) {
            if (res && res.receive === "granted") {
              P.PushNotifications.addListener("registration", function (t) {
                if (P.Preferences) P.Preferences.set({ key: "push_token", value: t.value });
              });
              P.PushNotifications.addListener("registrationError", function () {});
              return P.PushNotifications.register();
            }
          })
          .catch(function () {})
      );
    }

    // Record device info for support/diagnostics.
    if (P.Device && P.Preferences) {
      tasks.push(
        P.Device.getInfo()
          .then(function (info) {
            P.Preferences.set({ key: "device_info", value: JSON.stringify(info) });
          })
          .catch(function () {})
      );
    }

    return Promise.all(tasks);
  }

  /* ── Connectivity ───────────────────────────────────────────────────────── */
  function isOnline() {
    if (isNative && P.Network) {
      return P.Network.getStatus().then(function (s) { return !!s.connected; });
    }
    return Promise.resolve(navigator.onLine !== false);
  }

  function showOffline(show) {
    if (offlineEl) offlineEl.hidden = !show;
  }

  /* ── Hand-off to the live app ───────────────────────────────────────────── */
  function go() {
    if (!REMOTE || /your-app|example|REPLACE/i.test(REMOTE)) {
      say("Set your deployed URL in www/app.config.js");
      return;
    }
    say("Opening Manzil One…");
    document.body.classList.add("leaving");
    setTimeout(function () { window.location.replace(REMOTE); }, 420);
  }

  function proceed() {
    isOnline().then(function (online) {
      if (!online) {
        showOffline(true);
        say("Waiting for connection…");
        return;
      }
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
  window.addEventListener("online", function () {
    if (offlineEl && !offlineEl.hidden) proceed();
  });

  /* ── Run ────────────────────────────────────────────────────────────────── */
  setupNative().finally(proceed);
})();
