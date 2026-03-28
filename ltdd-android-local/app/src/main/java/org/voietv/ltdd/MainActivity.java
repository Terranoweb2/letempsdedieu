package org.voietv.ltdd;

import android.Manifest;
import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.res.ColorStateList;

public class MainActivity extends Activity {

    private WebView webView;
    private View splashView;
    private View offlineView;
    private ProgressBar progressBar;
    private boolean isPageLoaded = false;
    private static final int PERMISSION_REQUEST_CODE = 1;
    private static final String APP_URL = "https://voietv.org/app/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(0xFF060B18);
            getWindow().setNavigationBarColor(0xFF060B18);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF060B18);

        webView = new WebView(this);
        setupWebView();
        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setScaleY(1.5f);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            progressBar.setProgressTintList(ColorStateList.valueOf(0xFF0D9488));
            progressBar.setProgressBackgroundTintList(ColorStateList.valueOf(0x00000000));
        }
        root.addView(progressBar, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 6));

        splashView = createSplashView();
        root.addView(splashView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        offlineView = createOfflineView();
        offlineView.setVisibility(View.GONE);
        root.addView(offlineView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(root);

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQUEST_CODE);
        }

        // Clear old caches to force fresh load
        webView.clearCache(true);
        CookieManager.getInstance().flush();

        // Unregister stale service workers via JS
        webView.evaluateJavascript(
            "if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){r.unregister()})})}", null);

        if (isNetworkAvailable()) {
            webView.loadUrl(APP_URL);
        } else {
            showOffline();
        }
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        // FORCE network fetch - no stale cache
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setDatabaseEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(settings.getUserAgentString() + " LeTempsDeDieuApp/5.0");
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(100);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress >= 100) {
                    progressBar.animate().alpha(0f).setDuration(300).start();
                } else {
                    progressBar.setAlpha(1f);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.contains("voietv.org")) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception e) { }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                offlineView.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Disable overscroll
                view.evaluateJavascript(
                    "document.documentElement.style.overscrollBehavior='none';" +
                    "document.body.style.overscrollBehavior='none';", null);

                if (!isPageLoaded) {
                    isPageLoaded = true;
                    splashView.animate().alpha(0f).setDuration(400).setStartDelay(200)
                        .setListener(new AnimatorListenerAdapter() {
                            @Override
                            public void onAnimationEnd(Animator animation) {
                                splashView.setVisibility(View.GONE);
                            }
                        }).start();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) showOffline();
            }
        });

        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    }

    private View createSplashView() {
        LinearLayout splash = new LinearLayout(this);
        splash.setOrientation(LinearLayout.VERTICAL);
        splash.setGravity(android.view.Gravity.CENTER);
        splash.setBackgroundColor(0xFF060B18);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(220, 220);
        logoParams.gravity = android.view.Gravity.CENTER;
        splash.addView(logo, logoParams);

        TextView title = new TextView(this);
        title.setText("Le Temps de Dieu");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(24);
        title.setGravity(android.view.Gravity.CENTER);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tp.topMargin = 32;
        tp.gravity = android.view.Gravity.CENTER;
        splash.addView(title, tp);

        TextView sub = new TextView(this);
        sub.setText("Assistant IA — Etudes islamiques");
        sub.setTextColor(0x99FFFFFF);
        sub.setTextSize(14);
        sub.setGravity(android.view.Gravity.CENTER);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        sp.topMargin = 8;
        sp.gravity = android.view.Gravity.CENTER;
        splash.addView(sub, sp);

        ProgressBar loading = new ProgressBar(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            loading.setIndeterminateTintList(ColorStateList.valueOf(0xFF0D9488));
        }
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(56, 56);
        lp.topMargin = 48;
        lp.gravity = android.view.Gravity.CENTER;
        splash.addView(loading, lp);

        return splash;
    }

    private View createOfflineView() {
        LinearLayout offline = new LinearLayout(this);
        offline.setOrientation(LinearLayout.VERTICAL);
        offline.setGravity(android.view.Gravity.CENTER);
        offline.setBackgroundColor(0xFF060B18);
        offline.setPadding(48, 0, 48, 0);

        TextView icon = new TextView(this);
        icon.setText("\uD83D\uDCF6");
        icon.setTextSize(48);
        icon.setGravity(android.view.Gravity.CENTER);
        offline.addView(icon);

        TextView msg = new TextView(this);
        msg.setText("Pas de connexion Internet");
        msg.setTextColor(0xFFE8E8EC);
        msg.setTextSize(18);
        msg.setGravity(android.view.Gravity.CENTER);
        LinearLayout.LayoutParams mp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        mp.topMargin = 20;
        offline.addView(msg, mp);

        TextView desc = new TextView(this);
        desc.setText("Verifiez votre connexion et reessayez");
        desc.setTextColor(0xFF9CA3B0);
        desc.setTextSize(14);
        desc.setGravity(android.view.Gravity.CENTER);
        LinearLayout.LayoutParams dp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        dp.topMargin = 10;
        offline.addView(desc, dp);

        TextView retry = new TextView(this);
        retry.setText("   Reessayer   ");
        retry.setTextColor(0xFFFFFFFF);
        retry.setTextSize(16);
        retry.setGravity(android.view.Gravity.CENTER);
        retry.setPadding(48, 20, 48, 20);
        retry.setBackgroundColor(0xFF0D9488);
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rp.topMargin = 32;
        rp.gravity = android.view.Gravity.CENTER;
        offline.addView(retry, rp);

        offline.setOnClickListener(v -> {
            if (isNetworkAvailable()) {
                offlineView.setVisibility(View.GONE);
                webView.clearCache(true);
                webView.loadUrl(APP_URL);
            }
        });

        return offline;
    }

    private void showOffline() {
        offlineView.setVisibility(View.VISIBLE);
        if (!isPageLoaded) splashView.setVisibility(View.GONE);
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkInfo info = cm.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
