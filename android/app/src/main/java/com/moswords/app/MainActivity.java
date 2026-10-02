package com.moswords.app;

import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebViewClient;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private static final String APP_URL = "https://awehchat.co.za/";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {

                private static final String OFFLINE_HTML =
                    "<!DOCTYPE html><html><head><meta charset='UTF-8'>" +
                    "<meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
                    "<style>" +
                    "body{margin:0;min-height:100vh;display:flex;flex-direction:column;" +
                    "align-items:center;justify-content:center;background:#030014;" +
                    "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#fff;" +
                    "padding:32px;box-sizing:border-box;text-align:center;}" +
                    ".logo{width:88px;height:88px;margin:0 auto 20px;background:linear-gradient(135deg,#7c3aed,#00f0ff);" +
                    "border-radius:24px;display:flex;align-items:center;justify-content:center;" +
                    "font-size:42px;font-weight:bold;box-shadow:0 8px 32px rgba(0,240,255,.35);}" +
                    "h1{font-size:26px;font-weight:700;margin:0 0 8px;" +
                    "background:linear-gradient(135deg,#00f0ff,#a855f7);-webkit-background-clip:text;" +
                    "-webkit-text-fill-color:transparent;}" +
                    "p{color:#8888a0;font-size:14px;margin:0 0 28px;line-height:1.5;}" +
                    ".card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);" +
                    "border-radius:16px;padding:18px 20px;width:100%;max-width:320px;text-align:left;}" +
                    ".card p{color:#c0c0d8;font-size:13px;margin:0 0 6px;}" +
                    ".card p:last-child{margin:0;}" +
                    "button{margin-top:24px;padding:14px 36px;background:linear-gradient(135deg,#00f0ff,#7c3aed);" +
                    "color:#030014;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,240,255,.3);}" +
                    "</style></head><body>" +
                    "<div class='logo'>M</div>" +
                    "<h1>Moswords</h1>" +
                    "<p>Connecting to secure server...<br>Please check your connection.</p>" +
                    "<div class='card'>" +
                    "<p>&#8226; Verify your Wi-Fi or mobile data</p>" +
                    "<p>&#8226; App will auto-reconnect once online</p>" +
                    "</div>" +
                    "<button onclick=\"window.location.href='https://awehchat.co.za/'\">Retry Connection</button>" +
                    "<script>" +
                    "window.addEventListener('online', function() { window.location.href='https://awehchat.co.za/'; });" +
                    "</script>" +
                    "</body></html>";

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    super.onReceivedError(view, request, error);
                    if (request != null && request.isForMainFrame()) {
                        int code = error != null ? error.getErrorCode() : 0;
                        if (code == WebViewClient.ERROR_HOST_LOOKUP ||
                            code == WebViewClient.ERROR_CONNECT ||
                            code == WebViewClient.ERROR_TIMEOUT ||
                            code == WebViewClient.ERROR_FAILED_SSL_HANDSHAKE) {
                            view.loadDataWithBaseURL(APP_URL, OFFLINE_HTML, "text/html", "UTF-8", APP_URL);
                        }
                    }
                }
            });
        }
    }
}
