package com.manzilone.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.bridge != null ? this.bridge.getWebView() : null;
        if (webView != null) {
            WebSettings s = webView.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setDatabaseEnabled(true);
            // Allow autoplay / inline media for richer screens.
            s.setMediaPlaybackRequiresUserGesture(false);
            // Keep the live app's own responsive layout; no forced zoom.
            s.setBuiltInZoomControls(false);
            s.setSupportZoom(false);
            s.setLoadWithOverviewMode(true);
            s.setUseWideViewPort(true);
            s.setCacheMode(WebSettings.LOAD_DEFAULT);
            // Let the Manzil One web app detect it is running inside the native shell
            // (e.g. to enable app-only behaviours) by sniffing the User-Agent.
            s.setUserAgentString(s.getUserAgentString() + " ManzilOneApp/1.0 Capacitor");
        }
    }

    // Hardware back button: walk the WebView history, exit at the root.
    @Override
    public void onBackPressed() {
        WebView webView = this.bridge != null ? this.bridge.getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
