# 앱 출시 전 준비사항 체크리스트

> 마이아멘 (com.myamen.app) 앱스토어 출시 전 반드시 완료해야 할 작업 목록.
> 이 파일을 먼저 읽고 작업을 시작할 것.

---

## 현재 아키텍처 개요

```
React/TypeScript PWA (client/)
    → vite build → dist/
        → Capacitor 번들 (네이티브 앱에 정적 파일 포함)
            → APK (Android) / IPA (iOS) → 스토어 제출
```

**현재 사용 중인 네이티브 플러그인:**
- `@capacitor/push-notifications` — FCM 푸시
- `@capacitor/filesystem` — 이미지 저장
- `@capacitor/share` — 공유 기능
- `@capacitor/status-bar`, `@capacitor/splash-screen`
- `@capawesome/capacitor-live-update@8.2.1` — OTA 업데이트 ✅ 설치 완료

**웹 배포:** Cloudflare Worker (`cloudflare/worker.ts`) + R2  
**DB:** Supabase (프로젝트 ID: `zjnxvdhjbzqrlbrzrxit`)

---

## 스토어 심사 최소화 전략

### 원칙
- 네이티브 코드(플러그인, 권한) 변경이 없으면 스토어 심사 불필요
- JS/CSS/HTML(React 코드) 변경은 OTA로 배포 → 심사 없이 즉시 반영
- Remote WebView(`server.url` 방식)는 절대 사용 금지 — Apple §4.2.2 리젝

---

## 구현 완료 현황

### ✅ 기능 플래그 시스템
- Supabase `feature_flags` 테이블 생성 및 적용 완료
- `client/src/lib/useFeatureFlag.ts` — React 훅
- `client/src/lib/useFeatureFlag.ts` — `getFeatureFlag()` 비동기 함수
- 사용법: `const isEnabled = useFeatureFlag('key');`
- 새 플래그 추가 시 Supabase 대시보드에서 row 추가만 하면 됨

### ✅ OTA 업데이트 시스템
- `client/src/lib/appUpdate.ts` — 앱 시작 시 버전 체크 + 자동 적용
- `App.tsx` — 마운트 시 `checkAndApplyUpdate()` 자동 호출
- `cloudflare/worker.ts` — `/api/app-update/check` 엔드포인트 배포 완료
- `scripts/upload-bundle.mjs` — 빌드 + R2 업로드 스크립트
- `@capawesome/capacitor-live-update@8.2.1` — 네이티브 플러그인 설치 + `cap sync` 완료
- **R2에 v1.0.0 초기 번들 업로드 완료** (`myamen-assets/app-bundles/`)
- 현재 테스트용 APK(v1.0.0) 기기에 설치됨

---

## 테스트 기간 운용 방법

### JS/화면 변경사항 배포 (APK 재빌드 없음)

```bash
# 1. client/package.json 의 version을 올린다 (예: 1.0.0 → 1.0.1)
# 2. 웹 빌드
cd client && npm run build

# 3. OTA 번들 R2 업로드 (version은 package.json과 맞춤)
cd .. && APP_VERSION=1.0.1 node scripts/upload-bundle.mjs

# 끝. 앱 재시작 시 자동으로 새 버전 수신 + 적용됨
```

> ⚠️ `APP_VERSION`은 반드시 현재 설치된 APK 버전보다 높아야 업데이트됨
> - 현재 설치된 APK: **v1.0.0**
> - 다음 OTA 배포 시: **v1.0.1** 이상 사용

### 현재 APK로 계속 테스트 가능
지금 설치된 APK를 그대로 사용하면 됨. JS 변경이 생기면 위 OTA 배포 명령만 실행하면
앱 재시작 시 자동으로 최신 코드로 업데이트됨.

### 네이티브 변경 시에만 APK 재빌드 필요
```bash
cd client
npm run build
ANDROID_HOME=~/Library/Android/sdk npx cap sync android
cd android && ANDROID_HOME=~/Library/Android/sdk ./gradlew assembleDebug
# APK: client/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 스토어 출시 직전 체크리스트

### ① 앱 버전 및 설정

- [ ] `client/package.json` — version 확인 (예: `"version": "1.0.0"`)
- [ ] `client/android/app/build.gradle` — `versionCode`, `versionName` 업데이트
  ```gradle
  android {
      defaultConfig {
          versionCode 1       // 스토어에 올릴 때마다 +1 (정수)
          versionName "1.0.0" // 사용자에게 보이는 버전
      }
  }
  ```
- [ ] `capacitor.config.ts` — `server.url` 없는지 확인 (있으면 제거)
- [ ] `capacitor.config.ts` — `appId: 'com.myamen.app'` 확인

### ② 앱 아이콘 / 스플래시 스크린

- [ ] 앱 아이콘 교체
  - Android: `client/android/app/src/main/res/mipmap-*/` 폴더 안 ic_launcher.png 교체
  - 권장 도구: `npx @capacitor/assets generate` (1024x1024 원본 이미지 필요)
- [ ] SplashScreen 배경색 확인 (`capacitor.config.ts` → `backgroundColor: '#E8F5E9'`)

### ③ OTA 관련 (이미 완료, 확인만)

- [x] `@capawesome/capacitor-live-update` 플러그인 설치 완료
- [x] `npx cap sync android` 완료
- [x] Worker `/api/app-update/check` 엔드포인트 배포 완료
- [x] R2에 초기 번들 v1.0.0 업로드 완료
- [ ] **스토어 제출 직전:** 최종 빌드 버전으로 OTA 번들 업로드
  ```bash
  APP_VERSION=1.0.0 node scripts/upload-bundle.mjs
  ```

### ④ 푸시 알림

- [ ] FCM 설정 확인
  - `client/android/app/google-services.json` 최신 버전인지 확인
  - Cloudflare Worker secrets에 `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` 설정 여부 확인
    ```bash
    npx wrangler secret list  # 목록 확인
    ```
- [ ] APN (iOS 푸시) — iOS 빌드 시 설정 필요
  - Apple Developer → Certificates → APNs Key 생성
  - Firebase Console → 프로젝트 설정 → APNs 인증서 업로드

### ⑤ Android Release 빌드 (서명)

> ⚠️ Debug APK는 스토어 제출 불가. Release APK에 keystore 서명 필요.

**Keystore 생성 (최초 1회, 분실 시 앱 업데이트 영구 불가)**
```bash
keytool -genkey -v -keystore myamen-release.keystore \
  -alias myamen -keyalg RSA -keysize 2048 -validity 10000
```
→ 생성된 `myamen-release.keystore` 파일을 **절대 분실/공개하지 말 것**
→ 안전한 곳에 백업 (iCloud, 외장하드 등)

**`client/android/app/build.gradle` 서명 설정 추가**
```gradle
android {
    signingConfigs {
        release {
            storeFile file('/경로/myamen-release.keystore')
            storePassword '설정한_비밀번호'
            keyAlias 'myamen'
            keyPassword '설정한_비밀번호'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

**Release APK 빌드**
```bash
cd client
npm run build
ANDROID_HOME=~/Library/Android/sdk npx cap sync android
cd android
ANDROID_HOME=~/Library/Android/sdk ./gradlew assembleRelease
# 결과: app/build/outputs/apk/release/app-release.apk
```

### ⑥ Google Play Store 등록

- [ ] [Google Play Console](https://play.google.com/console) 접속
- [ ] 앱 생성 → `com.myamen.app`
- [ ] 앱 설명(국문) 작성 (최대 4000자)
- [ ] 스크린샷 준비
  - 폰: 최소 2장 (권장 16:9 또는 9:16, 최소 320px)
  - 태블릿: 선택사항
- [ ] 개인정보처리방침 URL 등록 (필수 — 없으면 심사 거부)
- [ ] 앱 카테고리 선택: `종교/신앙` 또는 `라이프스타일`
- [ ] 콘텐츠 등급 설문 완료
- [ ] Release APK 업로드 → 검토 제출

### ⑦ iOS 빌드 및 App Store 등록 (추후)

- [ ] Apple Developer Program 등록 ($99/년)
- [ ] Xcode에서 `client/ios` 프로젝트 열기
- [ ] Bundle ID `com.myamen.app` 확인
- [ ] Provisioning Profile 생성
- [ ] `GoogleService-Info.plist` 추가 (iOS FCM용)
- [ ] Archive → App Store Connect 업로드
- [ ] TestFlight 내부 테스트 완료 후 심사 제출

---

## 출시 이후 JS 변경 배포 흐름

```
코드 수정
  → cd client && npm run build
  → cd .. && APP_VERSION=x.x.x node scripts/upload-bundle.mjs
  → 완료 (사용자 앱 재시작 시 자동 업데이트)
```

**버전 관리 규칙 (권장)**
- 버그 수정: `1.0.0 → 1.0.1`
- 기능 추가: `1.0.0 → 1.1.0`
- 네이티브 변경 (APK 재빌드 필요): `1.0.0 → 2.0.0`

---

## 네이티브 변경이 필요한 경우 (APK 재빌드 + 스토어 재심사)

| 변경 사항 | 재빌드 필요 |
|-----------|------------|
| JS/화면/기능 수정 | ❌ OTA로 처리 |
| Capacitor 플러그인 추가 | ✅ |
| AndroidManifest.xml 권한 추가 | ✅ |
| 앱 아이콘 / 패키지명 변경 | ✅ |
| 스토어 심사 통과 후 업데이트 | ✅ (versionCode +1) |

---

## 주의사항

- **`capacitor.config.ts`에 `server.url` 절대 추가 금지** — Apple §4.2.2 리젝
- **Keystore 분실 = 앱 업데이트 불가** — 반드시 백업
- **OTA 버전은 항상 현재 설치된 버전보다 높아야 함** — 같거나 낮으면 무시됨
- **`.env`, `.dev.vars` 파일은 git에 올라가지 않도록** — `.gitignore` 확인
