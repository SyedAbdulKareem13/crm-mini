package com.manzilone.app;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Stock Capacitor activity + a native mobile-CSS shim.
 *
 * The app loads the live Manzil One website, so any responsive tweak normally
 * needs a website redeploy. To keep mobile fixes shipping in the APK itself,
 * we inject a small stylesheet into every page the WebView finishes loading
 * (works cross-origin because the host app injects it, not page script).
 */
public class MainActivity extends BridgeActivity {

    /** Surgical, !important mobile fixes layered on top of the live site. */
    private static final String MOBILE_CSS =
        "@media (max-width:1023px){"
            + "html,body{overflow-x:hidden !important;max-width:100% !important}"
            + "[role=dialog]{width:calc(100vw - 24px) !important;max-width:32rem !important;"
            + "max-height:86dvh !important;overflow-y:auto !important;overscroll-behavior:contain !important}"
            + "main{padding-bottom:7rem !important}"
        + "}"
        + "@media (max-width:640px){"
            + "header > button:first-child{flex:1 1 auto !important;min-width:0 !important;max-width:none !important}"
            + "header > div:last-child{flex:0 0 auto !important}"
            + "input,textarea,select{font-size:16px !important}"
        + "}";

    private static final String INJECT_JS =
        "(function(){try{"
            + "var id='mz-mobile-fix';"
            + "if(document.getElementById(id))return;"
            + "var s=document.createElement('style');s.id=id;"
            + "s.appendChild(document.createTextNode('" + MOBILE_CSS.replace("'", "\\'") + "'));"
            + "(document.head||document.documentElement).appendChild(s);"
        + "}catch(e){}})();";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final Bridge bridge = this.getBridge();
        if (bridge == null) return;
        final WebView webView = bridge.getWebView();
        if (webView == null) return;

        // Wrap Capacitor's own client so the bridge keeps working; just add a
        // post-load CSS injection on top.
        webView.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                try {
                    view.evaluateJavascript(INJECT_JS, null);
                } catch (Exception ignored) {
                }
            }
        });
    }
}
