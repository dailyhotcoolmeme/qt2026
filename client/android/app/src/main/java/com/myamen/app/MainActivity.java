package com.myamen.app;

import android.os.Bundle;
import android.content.Intent;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

    try {
      WebView webView = this.bridge.getWebView();
      if (webView != null) {
        webView.getSettings().setTextZoom(100);
      }
    } catch (Exception ignored) {
      // ignore
    }
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }
}
