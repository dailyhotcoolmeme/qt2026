/**
 * app.config.js — Dynamic Expo configuration
 *
 * 이 파일은 app.json의 정적 설정을 상속하면서 동적 값(환경변수 등)을 주입합니다.
 *
 * ──────────────────────────────────────────────────────────────────
 * [Android 푸시알림 FCM 설정 안내]
 *
 * Android에서 expo-notifications(FCM)를 사용하려면 google-services.json이 필요합니다.
 *
 * 준비 방법:
 *   1. https://console.firebase.google.com 에서 Firebase 프로젝트 생성
 *   2. Android 앱 등록 시 패키지명: com.myamen.app
 *   3. google-services.json 다운로드 → 프로젝트 루트(/)에 배치
 *   4. 아래 주석 처리된 googleServicesFile 줄의 주석을 해제
 *   5. .gitignore에 google-services.json 추가 (보안)
 *
 * 주의: google-services.json 없이도 개발 빌드는 가능하나,
 *       Android 푸시알림은 FCM 설정 완료 후 작동합니다.
 * ──────────────────────────────────────────────────────────────────
 *
 * [iOS 푸시알림 APNs 설정 안내]
 *
 * iOS 푸시알림은 Apple Developer Console에서 APNs 키 발급 후
 * EAS Credentials를 통해 자동으로 관리됩니다.
 *   1. https://developer.apple.com → Certificates > Keys → + 버튼
 *   2. Apple Push Notifications service (APNs) 체크 후 생성
 *   3. eas credentials 명령어로 등록 (EAS가 자동 처리)
 * ──────────────────────────────────────────────────────────────────
 */

/** @param {{ config: import('@expo/config-types').ExpoConfig }} param */
module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      // TODO: FCM 설정 완료 후 아래 주석 해제
      // googleServicesFile: './google-services.json',
    },
    extra: {
      ...config.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      r2BaseUrl: process.env.EXPO_PUBLIC_R2_BASE_URL,
    },
  };
};
