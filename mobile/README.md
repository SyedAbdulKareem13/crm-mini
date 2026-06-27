# Manzil One — Mobile (Android)

A native **Android** application for [Manzil One](https://github.com/SyedAbdulKareem13/crm-mini),
the premium CRM & quotation-management platform.

Built with **Capacitor 6** as a high-fidelity native shell around the live
Manzil One web app — so the **UI/UX, Framer-Motion animations and
glassmorphism are byte-identical** to production, and the app talks to the
**exact same backend and database** (full end-to-end functionality: auth,
leads, opportunities, pipeline, RFQ, quotations, approvals, reports, admin…).

On top of the web experience it adds a layer of native capabilities and a
bespoke **glass + fluid launch animation**.

---

## ✨ What makes it a real app (not just a webview)

| Capability | How |
| --- | --- |
| **Glassmorphic fluid launch screen** | Animated aurora/gradient-mesh + glass card with sheen sweep & breathing logo (`www/`), shown before the live app loads |
| **Native splash** | Android 12 splash API, dark themed to match the brand |
| **Branded adaptive icon** | Gradient background + Manzil "M" monogram (vector) |
| **Status bar theming** | Dark, edge-to-edge, brand-coloured |
| **Hardware back button** | Walks WebView history, exits at root (`MainActivity.java`) |
| **Push notifications** | `@capacitor/push-notifications` wired (needs Firebase — see below) |
| **Haptics** | Launch + ready for in-app feedback |
| **Network awareness** | Offline screen with auto-retry on reconnect |
| **Keyboard handling** | Native resize, no layout jumps |
| **Device info / Preferences** | Stored locally for diagnostics & token cache |
| **Share, deep-link ready** | `@capacitor/share`, `singleTask` launch mode |
| **App detection hook** | UA tagged `ManzilOneApp/1.0` so the web app can light up app-only features |

---

## 🔧 Configure your backend (one line)

The app loads your **deployed** Manzil One web app. Point it at your URL:

1. Edit **`www/app.config.js`**:
   ```js
   window.MANZIL_REMOTE_URL = "https://your-manzilone.vercel.app";
   ```
2. Add the host to `server.allowNavigation` in **`capacitor.config.ts`** so it
   stays inside the app (anything else opens in the system browser).
3. `npm run sync`

Because it points at your deployed web app, it uses the **same PostgreSQL
database** and the same NextAuth sessions — nothing is forked.

---

## 📦 Get the APK (no local Android SDK needed)

Every push to `main` triggers **GitHub Actions** (`.github/workflows/build-apk.yml`)
which installs the Android SDK on the runner, builds the APK, and **attaches it
to a GitHub Release**.

- **Releases tab → latest release →** download `ManzilOne-vX.Y.Z.apk`
- or **Actions → latest run → Artifacts → `ManzilOne-APK`**

Install on your phone: enable *Install unknown apps* for your browser/file
manager, open the APK, tap install.

You can also trigger a build manually from **Actions → Build Android APK → Run workflow**.

---

## 💻 Build locally (optional)

Requires Android Studio / Android SDK + JDK 17+.

```bash
npm install
npm run sync
npm run build:apk      # -> android/app/build/outputs/apk/debug/app-debug.apk
# or open in Android Studio:
npm run open
```

---

## 🔔 Enable push notifications (optional)

Push uses Firebase Cloud Messaging:

1. Create a Firebase project, add an Android app with id `com.manzilone.app`.
2. Download `google-services.json` → place in `android/app/`.
3. In `android/build.gradle` add the classpath
   `com.google.gms:google-services:4.4.2`, and in `android/app/build.gradle`
   add `apply plugin: 'com.google.gms.google-services'`.
4. Rebuild. The app already requests permission, registers, and caches the
   token in Preferences (`push_token`).

---

## 🏷 Release-signed build for the Play Store

The CI ships a **debug-signed** APK (installable directly). For the Play Store:

1. Generate a keystore: `keytool -genkey -v -keystore manzilone.jks -keyalg RSA -keysize 2048 -validity 10000 -alias manzilone`.
2. Add signing config to `android/app/build.gradle` (or `keystore.properties`).
3. `cd android && ./gradlew bundleRelease` → upload the `.aab`.

---

## 🧱 Project layout

```
www/                     # native launch shell (glass + fluid animations)
  app.config.js          # ← your deployed URL (the ONLY required edit)
  index.html, styles.css, boot.js
capacitor.config.ts      # app id, allowNavigation, plugin config
android/                 # native Android project (committed)
  app/src/main/java/.../MainActivity.java   # WebView tuning + back button
  app/src/main/res/      # icon, splash, theme, colors
.github/workflows/build-apk.yml             # CI → APK → Release
```

App id: `com.manzilone.app` · Min SDK 22 · Target SDK 34
