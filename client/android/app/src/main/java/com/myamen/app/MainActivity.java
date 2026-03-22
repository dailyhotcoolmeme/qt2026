package com.myamen.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    createNotificationChannel();

    try {
      WebView webView = this.bridge.getWebView();
      if (webView != null) {
        webView.getSettings().setTextZoom(100);
      }
    } catch (Exception ignored) {
      // ignore
    }
  }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager manager = getSystemService(NotificationManager.class);
      if (manager == null) return;

      NotificationChannel channel = new NotificationChannel(
        "myamen_alert_v2",
        "마이아멘 알림",
        NotificationManager.IMPORTANCE_HIGH
      );
      channel.setDescription("마이아멘 앱 알림");
      channel.enableVibration(true);
      channel.enableLights(true);
      AudioAttributes audioAttributes = new AudioAttributes.Builder()
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .build();
      android.net.Uri soundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
      channel.setSound(soundUri, audioAttributes);
      manager.createNotificationChannel(channel);
    }
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }
}
