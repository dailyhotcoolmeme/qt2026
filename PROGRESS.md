# 마이아멘 앱 전환 작업 계획

## 목표
PWA → Capacitor 래핑으로 iOS / Android 앱 출시

---

## 1. 푸시 알림 — Cloudflare Workers 전환

### 현재 상태
- 클라이언트 푸시 코드는 존재 (`client/src/lib/pushNotifications.ts`, `TopBar.tsx`)
- 서버 엔드포인트 `/api/push/subscribe`, `/api/push/unsubscribe` **미구현**
- VAPID 키 **미설정** (`VITE_VAPID_PUBLIC_KEY` 환경변수 없음)
- Cloudflare Worker (`cloudflare/worker.ts`) 에 푸시 로직 **없음**

### 구현 계획

#### 웹 푸시 (브라우저)
- Cloudflare Worker에서 VAPID 기반 Web Push Protocol 처리
- VAPID 키 쌍 생성 → Cloudflare Worker 환경변수에 등록
- 구독 정보는 Supabase `push_subscriptions` 테이블에 저장
- Cloudflare Worker가 Supabase에서 구독 목록 조회 후 Web Push 발송

#### 네이티브 푸시 (iOS / Android)
- iOS: Cloudflare Worker → APNs HTTP/2 API 직접 호출 (JWT 인증)
- Android: Cloudflare Worker → FCM HTTP v1 API 호출
- 토큰은 Supabase `push_subscriptions` 테이블에 channel 컬럼으로 구분
  - `channel: "webpush"` — 브라우저 구독 객체
  - `channel: "fcm"` — Android FCM 토큰
  - `channel: "apns"` — iOS APNs 토큰

#### 구독 테이블 스키마 (Supabase)
```sql
create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  channel text not null,         -- 'webpush' | 'fcm' | 'apns'
  platform text,                 -- 'web' | 'android' | 'ios'
  token text,                    -- FCM/APNs 토큰
  subscription jsonb,            -- 웹 푸시 구독 객체
  created_at timestamptz default now()
);
```

#### Cloudflare Worker 엔드포인트
- `POST /api/push/subscribe` — 구독 등록 (Supabase에 저장)
- `POST /api/push/unsubscribe` — 구독 해제
- `POST /api/push/send` — 내부용: 알림 발송 트리거 (Supabase → Worker 호출)

#### 환경변수 (Cloudflare Worker)
- `VAPID_PUBLIC_KEY` — 웹 푸시용 공개키
- `VAPID_PRIVATE_KEY` — 웹 푸시용 비밀키
- `VAPID_SUBJECT` — mailto:admin@myamen.co.kr
- `FCM_SERVER_KEY` — Android FCM
- `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` — iOS APNs
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. 레이아웃 — Safe Area (TopBar / BottomNav)

### 현재 상태 (이미 잘 구현됨)

`index.html`
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1" />
```

`index.css`
```css
:root {
  --safe-top-inset: env(safe-area-inset-top, 0px);
  --safe-bottom-inset: env(safe-area-inset-bottom, 0px);
  --app-topbar-height: calc(64px + var(--safe-top-inset));
  --app-page-top: calc(96px + var(--safe-top-inset));
}
```

**TopBar** — `paddingTop: "var(--safe-top-inset)"` 적용됨 ✅
**BottomNav** — `height: calc(76px + var(--safe-bottom-inset))`, `paddingBottom: var(--safe-bottom-inset)` 적용됨 ✅
**Layout** — `paddingBottom: calc(76px + var(--safe-bottom-inset))` 적용됨 ✅

### Capacitor 전환 시 추가 확인 사항

1. **Status Bar 플러그인** (`@capacitor/status-bar`)
   - Android: 상태바를 투명하게 설정하면 `env(safe-area-inset-top)`이 제대로 동작
   - iOS: 기본 동작, StatusBar 스타일만 맞추면 됨
   - `capacitor.config.ts`에 StatusBar 설정 추가 필요

2. **Android 전체화면 모드**
   - `MainActivity.java` 또는 `styles.xml`에서 edge-to-edge 설정 확인
   - `WindowCompat.setDecorFitsSystemWindows(window, false)` 적용 필요

3. **iOS Safe Area**
   - `Info.plist`에 `UIViewControllerBasedStatusBarAppearance` 설정
   - 기본적으로 Capacitor가 처리하지만 노치/Dynamic Island 기기에서 검증 필요

4. **Capacitor 설정 추가 예정**
```typescript
// capacitor.config.ts
plugins: {
  StatusBar: {
    style: 'DEFAULT',
    backgroundColor: '#ffffff',
    overlaysWebView: true,  // WebView 위에 상태바 오버레이
  },
  SplashScreen: {
    launchAutoHide: false,
    backgroundColor: '#E8F5E9',
  },
}
```

---

## 3. 작업 순서

### Phase 1 — 푸시 알림 Cloudflare 전환
- [x] VAPID 키 쌍 생성 — `.dev.vars.example`에 가이드 추가 (npx web-push generate-vapid-keys)
- [x] Cloudflare Worker에 Web Push 발송 로직 구현 — FCM + WebPush 모두 구현
- [x] Supabase `push_subscriptions` 테이블 마이그레이션 — 완료
- [x] 클라이언트 구독 API 연결 — FCM/WebPush 구독/해제 완료, iOS 플랫폼 감지 수정
- [x] 알림 발송 트리거 연결 — groupPush.ts + GroupDashboard.tsx 4곳 연결 완료 (worker send-group 오타 수정 포함)
- [ ] iOS APNs 연동 (Xcode → Signing & Capabilities → Push Notifications 추가 필요)
- [x] Android FCM 연동 — google-services.json + Firebase BOM 연결 완료, notification channel 생성 코드 추가
- [ ] Cloudflare Worker 환경변수 등록 (VAPID, FCM, SUPABASE, PUSH_INTERNAL_SECRET) — .dev.vars.example 참고
- [ ] VITE_VAPID_PUBLIC_KEY 클라이언트 .env 등록 (npx web-push generate-vapid-keys)

### Phase 2 — iOS Capacitor 프로젝트
- [x] `npx cap add ios` 실행
- [x] StatusBar, SplashScreen 설정 (capacitor.config.ts)
- [x] Info.plist 권한 추가 (카메라, 마이크, 사진 라이브러리)
- [x] App.entitlements 생성 (aps-environment: development)
- [x] AppDelegate.swift APNs 핸들러 추가
- [ ] Safe Area 기기별 검증 (iPhone SE, 14, 16 Pro 등)
- [ ] APNs 인증서 연결 (Xcode → Signing & Capabilities → Push Notifications)
- [x] App.entitlements aps-environment → production 변경
- [ ] App Store 배포 준비

### Phase 3 — Android 점검 및 배포
- [x] 기존 Android 프로젝트 edge-to-edge 설정 — WindowCompat.setDecorFitsSystemWindows(false) 적용
- [x] FCM `google-services.json` 연결 + notification channel(myamen_default) 생성 코드 추가
- [ ] Safe Area 기기별 검증
- [ ] Play Store 배포 준비

---

## 주요 파일 위치

| 파일 | 경로 |
|------|------|
| 푸시 알림 클라이언트 | `client/src/lib/pushNotifications.ts` |
| 푸시 구독 (TopBar 내) | `client/src/components/TopBar.tsx` (lines 86-324) |
| 서비스 워커 | `client/public/sw.js` |
| Cloudflare Worker | `cloudflare/worker.ts` |
| Safe Area CSS | `client/src/index.css` |
| TopBar | `client/src/components/TopBar.tsx` |
| BottomNav | `client/src/components/BottomNav.tsx` |
| Layout | `client/src/components/Layout.tsx` |
| Capacitor 설정 | `client/capacitor.config.ts` |
| Android 프로젝트 | `client/android/` |
