# 새 화면 생성

화면명: $ARGUMENTS

## 작업 순서

### 1단계: 화면 파일 생성
`src/screens/{category}/{ScreenName}/index.tsx` 생성

**필수 포함 요소:**
- `useSafeAreaInsets` 적용 (상단/하단 패딩)
- `useColorScheme` 적용 (다크모드)
- `theme` import해서 색상/간격 사용
- 로딩 상태 처리 (`<Loading />` 컴포넌트)
- 에러 상태 처리
- 빈 상태 처리 (`<EmptyState />` 컴포넌트)

**기본 구조:**
```tsx
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'react-native'
import { theme } from 'src/theme'

export default function {ScreenName}() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <View style={[styles.container, {
      paddingTop: insets.top,
      backgroundColor: colors.background
    }]}>
      {/* 내용 */}
    </View>
  )
}
```

### 2단계: 해당 화면 전용 훅 생성
`src/hooks/{category}/use{ScreenName}.ts` 생성 (비즈니스 로직 전담)

### 3단계: navigation/types.ts 업데이트
해당 화면의 라우트 파라미터 타입 추가

### 4단계: 적절한 Navigator에 라우트 등록
- Tab 화면이면 TabNavigator.tsx
- Stack 화면이면 RootNavigator.tsx

### 5단계: CLAUDE.md 업데이트
해당 Phase 체크박스 체크

## 주의사항
- 스크롤 필요 시 `FlatList` 또는 `ScrollView` + `KeyboardAvoidingView`
- 리스트는 절대 `map()` 렌더링 금지 → `FlatList` 사용
- 터치는 `Pressable` 사용 (`TouchableOpacity` 금지)
- 이미지는 `expo-image` 사용
- 한 파일 200줄 초과 시 `components/` 서브폴더로 분리
