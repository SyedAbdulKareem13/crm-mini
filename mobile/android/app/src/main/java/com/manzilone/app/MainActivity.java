package com.manzilone.app;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Capacitor activity + an OVER-THE-AIR mobile shim.
 *
 * All mobile UI fixes live in one file — www/mz-shim.js — which is:
 *   1. bundled into the APK (offline fallback), and
 *   2. re-fetched from the repo at every launch (SHIM_URL) and cached,
 * then injected into every page the WebView loads (page-load event + a
 * periodic idempotent re-inject).
 *
 * Result: shipping a mobile UI fix = pushing mz-shim.js to the branch.
 * The installed app picks it up on next launch — NO new APK required.
 */
public class MainActivity extends BridgeActivity {

    private static final String SHIM_URL =
        "https://raw.githubusercontent.com/SyedAbdulKareem13/crm-mini/claude/manzilone-mobile-app-yjajl7/mobile/www/mz-shim.js";
    private static final String PREFS = "mz_shim";
    private static final String KEY_JS = "js";

    private volatile String shimJs = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Load order: cached remote copy -> bundled copy. Then refresh from
        // the network in the background for next injections/launches.
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String cached = prefs.getString(KEY_JS, null);
        shimJs = (cached != null && !cached.isEmpty()) ? cached : loadBundledShim();
        fetchRemoteShim(prefs);

        final Bridge bridge = this.getBridge();
        if (bridge == null) return;
        final WebView webView = bridge.getWebView();
        if (webView == null) return;

        try {
            webView.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    inject(view);
                }
            });
        } catch (Exception ignored) {
        }

        // Periodic idempotent re-inject: survives missed load events and
        // client-side route changes.
        final Handler h = new Handler(Looper.getMainLooper());
        h.postDelayed(new Runnable() {
            @Override
            public void run() {
                inject(webView);
                h.postDelayed(this, 1200);
            }
        }, 1500);
    }

    private void inject(WebView view) {
        final String js = shimJs;
        if (js == null || js.isEmpty()) return;
        try {
            view.evaluateJavascript(js, null);
        } catch (Exception ignored) {
        }
    }

    /** Bundled fallback: the copy of mz-shim.js packaged into the APK. */
    private String loadBundledShim() {
        try (InputStream in = getAssets().open("public/mz-shim.js")) {
            BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    /** Refresh the shim from the repo; sanity-check before trusting it. */
    private void fetchRemoteShim(final SharedPreferences prefs) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL(SHIM_URL).openConnection();
                    c.setConnectTimeout(6000);
                    c.setReadTimeout(6000);
                    if (c.getResponseCode() != 200) return;
                    BufferedReader r = new BufferedReader(
                        new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = r.readLine()) != null) sb.append(line).append('\n');
                    String body = sb.toString();
                    // Only accept something that looks like our shim.
                    if (body.length() > 200 && body.contains("mz-shim-version")) {
                        prefs.edit().putString(KEY_JS, body).apply();
                        shimJs = body;
                    }
                } catch (Exception ignored) {
                } finally {
                    if (c != null) c.disconnect();
                }
            }
        }).start();
    }
}
