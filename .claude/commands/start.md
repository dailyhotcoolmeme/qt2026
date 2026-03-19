# Phase 1 시작 — 프로젝트 초기 세팅

CLAUDE.md를 먼저 읽고, Phase 1 작업을 아래 순서대로 진행해줘.
코드 작성 전에 각 단계별로 어떻게 만들 것인지 먼저 설명하고 진행해.

---

## 작업 목록 (순서 중요)

### Step 1: Expo 프로젝트 초기화
```bash
npx create-expo-app . --template blank-typescript
```
이미 파일이 있으면 덮어쓰지 말고 병합해줘.

### Step 2: 패키지 설치
아래 패키지들을 한번에 설치:
```
expo-router
@react-navigation/native
@react-navigation/native-stack
@react-navigation/bottom-tabs
react-native-screens
react-native-safe-area-context
@supabase/supabase-js
zustand
@tanstack/react-query
expo-auth-session
expo-web-browser
expo-secure-store
expo-image
expo-haptics
expo-linking
expo-notifications
expo-sharing
expo-image-picker
react-native-reanimated
react-native-gesture-handler
@expo/vector-icons
@react-native-async-storage/async-storage
```

### Step 3: 설정 파일들
아래 파일들을 생성/수정:
- `babel.config.js` — reanimated 플러그인 + 절대경로 별칭
- `tsconfig.json` — strict mode + paths 설정
- `app.json` — 번들ID, scheme, 권한, 아이콘 설정
- `eas.json` — development/preview/production 프로파일

### Step 4: 테마 시스템
`src/theme/` 폴더에 생성:
- `colors.ts` — 라이트/다크 색상 팔레트
- `typography.ts` — 폰트 크기/굵기 시스템
- `spacing.ts` — 간격 시스템 (4, 8, 12, 16, 24, 32, 48)
- `shadows.ts` — iOS/Android 그림자
- `index.ts` — 전체 export

컬러는 CLAUDE.md의 컬러 팔레트 기준으로.

### Step 5: Supabase 클라이언트
`src/lib/supabase.ts`:
- expo-secure-store로 토큰 저장
- AsyncStorage 폴백
- 타입 임포트 준비

### Step 6: QueryClient
`src/lib/queryClient.ts`:
- staleTime: 5분
- retry: 2
- 네트워크 에러 시 toast 처리 준비

### Step 7: Zustand 스토어
`src/stores/authStore.ts`:
- user: User | null
- session: Session | null
- isLoading: boolean
- setUser / setSession / clear 액션

### Step 8: 네비게이션 타입
`src/navigation/types.ts`:
- RootStackParamList (모든 스택 라우트)
- TabParamList (탭 5개)
- 각 화면 파라미터 정의

### Step 9: Deep Link 설정
`src/navigation/linking.ts`:
- scheme: myamen://
- auth/callback 처리
- invite/:groupId 처리

### Step 10: TabNavigator
`src/navigation/TabNavigator.tsx`:
- 탭 5개: 홈, 성경, 기도, 커뮤니티, 그룹
- 각 탭 아이콘 (Ionicons 사용)
- 다크모드 대응 탭 바 스타일
- 각 탭 화면은 빈 placeholder로 먼저 생성

### Step 11: RootNavigator
`src/navigation/RootNavigator.tsx`:
- authStore의 session 상태 감지
- session 없음 → Auth Stack (AuthScreen)
- session 있음 → TabNavigator
- 초기 로딩 중 → SplashScreen 유지

### Step 12: App.tsx 조립
- SafeAreaProvider
- QueryClientProvider
- NavigationContainer (linking 설정 포함)
- GestureHandlerRootView
- RootNavigator

---

모든 Step 완료 후:
1. `npx tsc --noEmit` 실행해서 타입 에러 확인
2. CLAUDE.md Phase 1 체크박스 업데이트
3. 실행 방법 안내 (`npx expo start`)
