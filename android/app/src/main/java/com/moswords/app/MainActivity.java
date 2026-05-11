package com.moswords.app;

import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Extend BridgeWebViewClient (not plain WebViewClient) so that:
        //  - All Capacitor plugin bridge calls still work (StatusBar, SplashScreen, etc.)
        //  - CapacitorHttp request interception still works
        //  - We also show a custom offline page when the server is unreachable
        getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {

            private static final String OFFLINE_HTML =
                "<!DOCTYPE html><html><head><meta charset='UTF-8'>" +
                "<meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
                "<style>" +
                "body{margin:0;min-height:100vh;display:flex;flex-direction:column;" +
                "align-items:center;justify-content:center;background:#030014;" +
                "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#fff;" +
                "padding:32px;box-sizing:border-box;text-align:center;}" +
                ".logo{width:96px;height:96px;margin:0 auto 24px;background:linear-gradient(135deg,#a259ff,#00f0ff);" +
                "border-radius:24px;display:flex;align-items:center;justify-content:center;" +
                "font-size:44px;font-weight:bold;box-shadow:0 8px 32px rgba(162,89,255,.4);}" +
                "h1{font-size:28px;font-weight:700;margin:0 0 8px;" +
                "background:linear-gradient(135deg,#a259ff,#00f0ff);-webkit-background-clip:text;" +
                "-webkit-text-fill-color:transparent;}" +
                "p{color:#8888a0;font-size:15px;margin:0 0 32px;line-height:1.6;}" +
                ".card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);" +
                "border-radius:16px;padding:20px 24px;width:100%;max-width:340px;text-align:left;}" +
                ".card p{color:#c0c0d8;font-size:14px;margin:0 0 8px;}" +
                ".card p:last-child{margin:0;}" +
                "button{margin-top:28px;padding:14px 36px;background:linear-gradient(135deg,#a259ff,#7c3aed);" +
                "color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;}" +
                "</style></head><body>" +
                "<div class='logo'>M</div>" +
                "<h1>Moswords</h1>" +
                "<p>Cannot reach the server.<br>Check your internet connection.</p>" +
                "<div class='card'>" +
                "<p>&#8594; Make sure you have internet access</p>" +
                "<p>&#8594; Try switching between WiFi and mobile data</p>" +
                "<p>&#8594; If the problem persists, the server may be temporarily down</p>" +
                "</div>" +
                "<button onclick='window.location.reload()'>Retry</button>" +
                "</body></html>";

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                // Must call super so Capacitor bridge keeps functioning
                super.onReceivedError(view, request, error);
                // Only replace main-frame failures (not sub-resource errors like images)
                if (request != null && request.isForMainFrame()) {
                    view.loadDataWithBaseURL(null, OFFLINE_HTML, "text/html", "UTF-8", null);
                }
            }
        });
    }
}
