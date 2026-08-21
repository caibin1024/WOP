package com.xdw.fitness;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "WOP";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 状态栏白色内容（时间/电量等图标）：App 是深色 OLED 背景，图标必须为浅色才可见。
        // 原生侧强制，避免 WebView 加载前/中 JS 尚未生效时先闪现黑色图标。
        forceLightStatusBarContent();
        // 小米 WebView 不通过 CSS env(safe-area-inset-*) 上报安全区，
        // 改为原生读取真实 insets，在页面加载完成后注入 CSS 变量兜底。
        this.bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                injectSafeAreaInsets();
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        // 从后台/系统设置返回时安全区可能变化，重新注入；同时重设状态栏样式
        forceLightStatusBarContent();
        injectSafeAreaInsets();
    }

    /**
     * 强制状态栏为"非亮"外观 → 状态栏图标渲染为白色。
     * setAppearanceLightStatusBars(false)：false = 状态栏视为深色 → 白色内容。
     */
    private void forceLightStatusBarContent() {
        if (getWindow() == null) return;
        try {
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                    .setAppearanceLightStatusBars(false);
        } catch (Exception e) {
            Log.e(TAG, "设置状态栏样式失败", e);
        }
    }

    /**
     * 读取系统真实 insets，物理像素 / density 换算成 CSS px 后，
     * 注入到 --safe-top-real / --safe-bottom-real。
     * CSS 侧用 var(--safe-top-real, env(safe-area-inset-top)) 兜底。
     */
    private void injectSafeAreaInsets() {
        if (this.bridge == null) return;
        try {
            WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(getWindow().getDecorView());
            if (insets == null) return;
            float density = getResources().getDisplayMetrics().density;
            int topPx = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
            int bottomPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            String js = "document.documentElement.style.setProperty('--safe-top-real','"
                    + (topPx / density) + "px');"
                    + "document.documentElement.style.setProperty('--safe-bottom-real','"
                    + (bottomPx / density) + "px');";
            this.bridge.eval(js, null);
        } catch (Exception e) {
            Log.e(TAG, "注入安全区失败", e);
        }
    }
}
