# myamen — React Native App 개발 가이드

## 📱 프로젝트 개요

**myamen**은 기독교 신앙 앱으로, 기존 PWA(myamen.co.kr)의 기능을 React Native로 완전 재개발하는 프로젝트입니다.

- 코드 이식 ❌ — 기능 기준으로 처음부터 새로 설계
- 기존 백엔드(Supabase, Cloudflare Workers, R2)는 그대로 유지
- iOS + Android 동시 타겟
- 출시 목표: 1개월 이내

---

## 🛠 기술 스택

| 분류 | 라이브러리 | 버전 | 용도 |
|------|-----------|------|------|
| Runtime | Expo | ~53 | 관리형 워크플로우 |
| Navigation | React Navigation | v7 | 화면 전환 |
| Auth/DB | @supabase/supabase-js | v2 | 인증 + DB |
| 상태관리 | Zustand | v5 | 전역 클라이언트 상태 |
| 서버 상태 | @tanstack/react-query | v5 | 서버 데이터 캐싱 |
| OAuth | expo-auth-session | latest | Google/카카오 로그인 |
| 토큰 저장 | expo-secure-store | latest | 민감 데이터 저장 |
| 이미지 | expo-image | latest | 최적화된 이미지 렌더링 |
| 애니메이션 | react-native-reanimated | v3 | 네이티브 애니메이션 |
| 햅틱 | expo-haptics | latest | 진동 피드백 |
| 빌드 | EAS Build | latest | iOS/Android 빌드 |

---

## 🏗 앱 정보

- **앱명**: myamen
- **번들 ID**: com.myamen.app
- **Deep link scheme**: myamen://
- **OAuth callback**: myamen://auth/callback
- **그룹 초대 링크**: myamen://invite/:groupId
- **타겟 OS**: iOS 15+ / Android 10+ (API 29+)

---

## ☁️ 백엔드 (절대 수정하지 않음)

| 서비스 | 용도 | 환경변수 |
|--------|------|---------|
| Supabase | Auth + PostgreSQL DB | EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY |
| Cloudflare Workers | REST API | EXPO_PUBLIC_API_BASE_URL |
| Cloudflare R2 | 이미지/파일 스토리지 | EXPO_PUBLIC_R2_BASE_URL |

---

## 📂 폴더 구조

```
myamen/
├── App.tsx
├── app.json
├── eas.json
├── babel.config.js
├── tsconfig.json
├── .env
├── .env.example
├── CLAUDE.md
│
├── .claude/
│   ├── settings.json
│   └── commands/
│       ├── new-screen.md
│       ├── new-hook.md
│       ├── new-component.md
│       ├── review.md
│       ├── phase.md
│       ├── fix.md
│       ├── supabase-type.md
│       └── build.md
│
├── assets/
│   ├── images/
│   └── fonts/
│
└── src/
    ├── lib/
    │   ├── supabase.ts        # Supabase 클라이언트
    │   ├── queryClient.ts     # TanStack Query 클라이언트
    │   ├── api.ts             # Cloudflare Workers API 래퍼
    │   └── types.ts           # DB 타입 정의
    │
    ├── stores/
    │   ├── authStore.ts       # 인증 상태 (user, session)
    │   └── settingsStore.ts   # 앱 설정 (다크모드 등)
    │
    ├── hooks/
    │   ├── auth/
    │   │   ├── useAuth.ts
    │   │   ├── useGoogleAuth.ts
    │   │   └── useKakaoAuth.ts
    │   ├── home/
    │   │   ├── useDailyWord.ts
    │   │   └── useQT.ts
    │   ├── bible/
    │   │   ├── useBibleReading.ts
    │   │   └── useBibleView.ts
    │   ├── prayer/
    │   │   └── usePrayers.ts
    │   ├── community/
    │   │   └── useCommunity.ts
    │   └── group/
    │       └── useGroup.ts
    │
    ├── navigation/
    │   ├── types.ts           # 라우트 파라미터 타입
    │   ├── RootNavigator.tsx  # 루트 (인증 분기)
    │   ├── TabNavigator.tsx   # 하단 탭 5개
    │   └── linking.ts         # Deep link 설정
    │
    ├── screens/
    │   ├── auth/
    │   │   ├── AuthScreen/
    │   │   ├── RegisterScreen/
    │   │   ├── FindAccountScreen/
    │   │   └── UpdatePasswordScreen/
    │   ├── home/
    │   │   └── HomeScreen/
    │   ├── bible/
    │   │   ├── BibleScreen/
    │   │   └── BibleViewScreen/
    │   ├── prayer/
    │   │   └── PrayerScreen/
    │   ├── community/
    │   │   ├── CommunityScreen/
    │   │   └── PostDetailScreen/
    │   ├── group/
    │   │   ├── GroupScreen/
    │   │   └── GroupDetailScreen/
    │   └── common/
    │       ├── SearchScreen/
    │       ├── SettingsScreen/
    │       └── NotFoundScreen/
    │
    ├── components/
    │   ├── common/
    │   │   ├── Button/
    │   │   ├── Input/
    │   │   ├── Card/
    │   │   ├── Avatar/
    │   │   ├── Badge/
    │   │   ├── Divider/
    │   │   ├── Loading/
    │   │   ├── EmptyState/
    │   │   └── index.ts
    │   └── layout/
    │       ├── SafeScreen/
    │       └── KeyboardView/
    │
    └── theme/
        ├── colors.ts
        ├── typography.ts
        ├── spacing.ts
        ├── shadows.ts
        └── index.ts
```

---

## 📱 화면 구조

### Bottom Tab (메인 5개)

| 탭 | 화면 | 설명 |
|----|------|------|
| 🏠 홈 | HomeScreen | 오늘의 말씀 + QT 작성/조회 |
| 📖 성경 | BibleScreen | 성경 읽기 플랜 + 진도 |
| 🙏 기도 | PrayerScreen | 기도 제목 작성/목록 |
| 💬 커뮤니티 | CommunityScreen | 게시글 피드 |
| 👥 그룹 | GroupScreen | 내 그룹 목록 |

### Stack (탭 위에 쌓이는 화면)

| 화면 | 파라미터 | 설명 |
|------|---------|------|
| AuthScreen | 없음 | 로그인 진입점 |
| RegisterScreen | 없음 | 회원가입 |
| FindAccountScreen | 없음 | 계정 찾기 |
| UpdatePasswordScreen | 없음 | 비밀번호 변경 |
| BibleViewScreen | book, chapter | 성경 본문 뷰어 |
| GroupDetailScreen | groupId | 그룹 대시보드 |
| PostDetailScreen | postId | 게시글 상세 |
| SearchScreen | 없음 | 통합 검색 |
| SettingsScreen | 없음 | 계정/앱 설정 |

---

## 🔐 인증 방식

| 방법 | 라이브러리 | 비고 |
|------|-----------|------|
| 이메일/패스워드 | Supabase Auth | 기본 |
| Google OAuth | expo-auth-session | PKCE flow |
| 카카오 OAuth | @react-native-kakao/core | Expo Go 테스트 불가 |

**토큰 저장**: expo-secure-store
**세션 복구**: supabase.auth.onAuthStateChange

---

## 🎨 디자인 원칙

1. **기존 웹앱 톤 유지** — 차분하고 정적인 느낌, 종교적 무게감
2. **네이티브답게** — Safe area, 네이티브 트랜지션, 햅틱 피드백
3. **다크모드 지원** — 모든 화면 라이트/다크 완전 지원
4. **한국어 최적화** — 시스템 폰트 기본, line-height 1.6

### 컬러 팔레트 (기존 웹앱 기준)
- Primary: #4F6EF7 (메인 블루)
- Background Light: #FAFAFA
- Background Dark: #121212
- Text Light: #1A1A1A
- Text Dark: #F5F5F5
- Border: #E5E5E5 / #2A2A2A

---

## ⚙️ 코딩 규칙

### 필수 규칙
- TypeScript strict mode (`any` 절대 금지 — `unknown` 사용)
- 파일당 200줄 이하 유지 (초과 시 분리)
- 비즈니스 로직은 반드시 `hooks/` 에만
- UI 컴포넌트는 완전히 presentational (props만 받음)
- 환경변수 하드코딩 절대 금지
- 절대경로 import 사용 (`src/...`)
- 한 PR = 한 기능

### 네이티브 필수 적용
- 모든 화면 최상단에 `useSafeAreaInsets` 적용
- 텍스트 입력 있는 화면은 `KeyboardAvoidingView` 필수
- 터치 요소는 `Pressable` 사용 (TouchableOpacity 금지)
- 리스트는 `FlatList` 또는 `FlashList` 사용 (map 렌더링 금지)
- 이미지는 반드시 `expo-image` 사용

### Supabase 규칙
- 모든 쿼리는 try/catch 처리
- error는 `PostgrestError` 타입으로 명시
- Realtime 구독은 커뮤니티/그룹 피드에서만 허용
- useEffect 클린업에서 구독 해제 필수

---

## 🗺 개발 로드맵

### Phase 1 — 프로젝트 세팅 (Day 1~2)
- [x] Expo 프로젝트 초기화 (`npx create-expo-app`)
- [x] 패키지 전체 설치
- [x] app.json 설정 (번들ID, deep link, 권한)
- [x] eas.json 설정 (development/preview/production)
- [x] babel.config.js (경로 별칭 설정)
- [x] tsconfig.json (strict + 절대경로)
- [x] 테마 시스템 완성 (colors, typography, spacing)
- [x] Supabase 클라이언트 (expo-secure-store 연동)
- [x] TanStack Query 클라이언트
- [x] Zustand authStore 기본 구조
- [x] RootNavigator + TabNavigator 뼈대
- [x] deep link linking.ts 설정
- [x] App.tsx 최종 조립

### Phase 2 — 인증 (Day 3~5)
- [ ] AuthScreen UI (이메일/비번 + 소셜 버튼)
- [ ] useAuth 훅 (로그인/로그아웃/세션)
- [ ] 이메일 로그인 구현
- [ ] RegisterScreen + useRegister 훅
- [ ] FindAccountScreen (비번 재설정 이메일)
- [ ] UpdatePasswordScreen
- [ ] useGoogleAuth (expo-auth-session PKCE)
- [ ] useKakaoAuth (@react-native-kakao/core)
- [ ] 약관 동의 처리 (user_terms_agreements 테이블)
- [ ] 세션 복구 (앱 재시작 시 자동 로그인)

### Phase 3 — 홈 / QT (Day 6~8)
- [ ] HomeScreen (오늘의 말씀 카드 표시)
- [ ] useDailyWord 훅 (Cloudflare Workers API)
- [ ] QT 작성 모달/화면
- [ ] useQT 훅 (CRUD)
- [ ] QT 목록 조회
- [ ] 말씀 즐겨찾기
- [ ] 말씀 카드 이미지 저장/공유 (expo-sharing)

### Phase 4 — 성경 읽기 (Day 9~11)
- [ ] BibleScreen (읽기 플랜 + 진도 표시)
- [ ] useBibleReading 훅 (플랜 진도 관리)
- [ ] BibleViewScreen (성경 본문 뷰어)
- [ ] useBibleView 훅 (본문 API)
- [ ] 구절 길게 누르기 → 하이라이트/메모/공유
- [ ] 읽기 완료 체크 + 진도 업데이트
- [ ] 아카이브 (지난 읽기 기록)

### Phase 5 — 기도 (Day 12~13)
- [ ] PrayerScreen (기도 제목 목록)
- [ ] usePrayers 훅 (CRUD + 필터)
- [ ] 기도 제목 작성/수정
- [ ] 기도 응답 표시
- [ ] 그룹 기도 공유 기능

### Phase 6 — 커뮤니티 + 그룹 (Day 14~18)
- [ ] CommunityScreen (피드 FlatList)
- [ ] useCommunity 훅 (게시글 목록 + 무한스크롤)
- [ ] 게시글 작성 (텍스트 + R2 이미지 업로드)
- [ ] PostDetailScreen (댓글 + 좋아요)
- [ ] GroupScreen (내 그룹 목록)
- [ ] useGroup 훅
- [ ] GroupDetailScreen (그룹 대시보드)
- [ ] 그룹 초대 deep link 처리
- [ ] 그룹 멤버 관리

### Phase 7 — 마무리 + 출시 (Day 19~25)
- [ ] SearchScreen (통합 검색)
- [ ] SettingsScreen (계정/알림/테마 설정)
- [ ] expo-notifications 푸시 알림 설정
- [ ] InsightsDashboard (통계)
- [ ] 전체 화면 버그픽스
- [ ] EAS Build development 빌드 테스트
- [ ] iOS TestFlight 배포
- [ ] Android 내부 테스트 배포
- [ ] 앱 아이콘 + 스플래시 스크린 최종 확인
- [ ] 스토어 심사 제출

---

## 🔄 현재 작업 상태

**현재 Phase**: Phase 2 (인증)
**마지막 작업**: Phase 1 완료 — 프로젝트 세팅, 테마, Supabase, 네비게이션 뼈대

---

## ⚠️ 알려진 주의사항

1. **카카오 로그인**: Expo Go에서 테스트 불가. Phase 2 후반에 작업, 실기기 빌드 필요
2. **R2 이미지 업로드**: multipart/form-data + Cloudflare Workers 경유
3. **Supabase Realtime**: 커뮤니티/그룹에서만. 컴포넌트 언마운트 시 반드시 unsubscribe
4. **그룹 초대 링크**: myamen://invite/:groupId deep link로 처리
5. **iOS 폰트 렌더링**: fontWeight를 숫자('600')로 지정해야 정확히 적용됨
6. **Android 백버튼**: 모달/스택에서 하드웨어 백버튼 처리 필수
