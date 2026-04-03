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

**웹 배포:** Cloudflare Worker (`cloudflare/worker.ts`) + R2  
**DB:** Supabase (프로젝트 ID: `zjnxvdhjbzqrlbrzrxit`)

---

## 스토어 심사 최소화 전략

### 원칙
- 네이티브 코드(플러그인, 권한) 변경이 없으면 스토어 심사 불필요
- JS/CSS/HTML(React 코드) 변경은 OTA로 배포 → 심사 없이 즉시 반영
- Remote WebView(server.url 방식)는 사용하지 말 것 — Apple §4.2.2 리젝 위험

---

## 출시 전 구현 목록

### ✅ 1단계: 기능 플래그 시스템 (스토어 심사 불필요)

**목적:** DB row 하나로 새 기능 on/off — 앱 업데이트 없이 기능 활성화/비활성화 가능

**구현 방법:**

```sql
-- Supabase에 실행 (supabase/migrations/ 에 파일 추가)
create table feature_flags (
  key text primary key,
  enabled boolean default false,
  description text,
  updated_at timestamptz default now()
);

-- 초기 데이터 예시
insert into feature_flags (key, enabled, description) values
  ('new_prayer_ui', false, '새 기도 UI'),
  ('bible_ai', false, 'AI 성경 기능'),
  ('group_stats', false, '모임 통계');
```

**프론트엔드:** `client/src/lib/useFeatureFlag.ts` 훅 사용

```ts
const isEnabled = useFeatureFlag('new_prayer_ui');
```

**상태:** [ ] 미구현 → 출시 전 구현 필요

---

### ✅ 2단계: OTA (Over-the-Air) 업데이트 시스템

**목적:** 스토어 심사 없이 앱 업데이트 배포. 딱 1번 심사에 포함시키면 이후 JS 변경은 심사 없이 배포.

**작동 원리:**
```
앱 시작
  → Cloudflare Worker /api/app-update/check 호출
  → 현재 번들 버전과 최신 버전 비교
  → 새 버전 있으면 R2에서 bundle.zip 다운로드
  → Capacitor Filesystem에 압축 해제
  → App.reload() → 새 번들 즉시 적용
```

#### 2-1. Cloudflare Worker 수정 (`cloudflare/worker.ts`)

추가할 엔드포인트:
```
GET /api/app-update/check?platform=android&currentVersion=1.0.0
→ { needsUpdate: true, latestVersion: "1.0.3", bundleUrl: "https://r2.../bundle-1.0.3.zip" }
```

R2 버킷: `myamen-bundles` (별도 버킷, 현재 이미지 버킷과 분리)

#### 2-2. 빌드 스크립트 추가 (`scripts/upload-bundle.mjs`)

```
npm run build:release 실행 시:
  1. vite build → dist/ 생성
  2. dist/ → bundle-{버전}.zip 압축
  3. R2 myamen-bundles 버킷에 업로드
  4. version.json 업데이트 { latestVersion, platform, bundleUrl }
```

#### 2-3. 앱 시작 로직 추가 (`client/src/lib/appUpdate.ts`)

- `isNativeApp()` 가드로 웹 버전에는 실행 안 됨 — 웹 서비스 영향 없음
- 앱이 포그라운드로 돌아올 때도 체크 (앱 껐다 켜지 않아도 업데이트 적용)

#### 2-4. 네이티브 플러그인 설치 ← **스토어 제출 시 반드시 포함**

```bash
cd client
npm install @capawesome/capacitor-live-update
npx cap sync
```

> ⚠️ 이 단계가 빠지면 OTA가 작동하지 않음.
> 반드시 스토어 제출 빌드에 포함되어야 함.

**상태:** [ ] 미구현 → 출시 전 구현 필요

---

## 출시 직전 체크리스트 (빼먹으면 안 되는 것들)

### 앱 설정

- [ ] `capacitor.config.ts` — `server.url` 이 없는지 확인 (있으면 제거, Apple 리젝 원인)
- [ ] `capacitor.config.ts` — `appId: 'com.myamen.app'` 확인
- [ ] 앱 버전 번호 업데이트 (`client/package.json` + Android/iOS 각각)
- [ ] SplashScreen 이미지 실제 앱 이미지로 교체 (현재 기본값)
- [ ] 앱 아이콘 설정 완료 여부 확인

### OTA 관련

- [ ] `@capawesome/capacitor-live-update` 플러그인 설치 완료
- [ ] `npx cap sync` 실행 완료
- [ ] `scripts/upload-bundle.mjs` 스크립트 작동 확인
- [ ] Cloudflare R2 `myamen-bundles` 버킷 생성 및 public 설정
- [ ] Worker `/api/app-update/check` 엔드포인트 배포 완료
- [ ] 첫 번째 번들 업로드 완료 (초기 버전 `1.0.0`)
- [ ] `isNativeApp()` 가드 확인 — 웹에서 실행 안 되는지 테스트

### 기능 플래그

- [ ] `feature_flags` 테이블 마이그레이션 적용 완료
- [ ] 출시 시점에 활성화할 플래그 확인

### 푸시 알림

- [ ] FCM 서버 키 (`FIREBASE_SERVER_KEY`) Cloudflare Worker 환경변수 설정 확인
- [ ] APN (iOS 푸시) 인증서 설정 완료
- [ ] 테스트 디바이스에서 푸시 수신 확인

### Supabase / 보안

- [ ] Supabase 프로젝트 plan 확인 (Free tier 제한 초과 여부)
- [ ] RLS 정책 전체 점검
- [ ] admin 페이지 접근 제한 확인 (`/#/admin`)

### Android 빌드

- [ ] keystore 파일 안전하게 보관 (분실 시 앱 업데이트 불가)
- [ ] `google-services.json` 최신 버전 확인
- [ ] minimum SDK 버전 확인 (현재 타겟 안드로이드 버전)
- [ ] APK 서명 빌드 (release 빌드, debug 아님)

### iOS 빌드

- [ ] Apple Developer 계정 활성화 확인
- [ ] Provisioning Profile + Certificate 유효 기간 확인
- [ ] `GoogleService-Info.plist` 최신 버전 확인
- [ ] TestFlight 내부 테스트 완료

### 스토어 등록 정보

- [ ] 앱 스크린샷 준비 (iOS: 6.7인치, 6.5인치 / Android: 폰, 태블릿)
- [ ] 앱 설명(국문) 작성
- [ ] 개인정보처리방침 URL 준비 (필수)
- [ ] 지원 URL 준비

---

## 배포 흐름 (출시 이후)

### 웹 변경사항 (심사 없음)
```bash
npm run build:release
# dist/ 빌드 → R2에 번들 업로드 → version.json 업데이트
# 앱 사용자들이 다음 실행 시 자동으로 새 버전 수신
```

### 네이티브 변경사항 (심사 필요)
- Capacitor 플러그인 추가/제거
- Android/iOS 권한 변경
- 네이티브 모듈 코드 변경

---

## 참고 사항

- **절대 하지 말 것:** `capacitor.config.ts`에 `server.url` 추가 — Apple §4.2.2 리젝
- **OTA 작동 조건:** 네이티브 앱에 `@capawesome/capacitor-live-update` 플러그인이 포함된 빌드가 스토어에 올라가 있어야 함
- **웹 서비스 영향:** 기능 플래그, OTA 로직 모두 `isNativeApp()` 가드로 웹에는 영향 없음
