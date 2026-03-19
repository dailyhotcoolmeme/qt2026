# 새 공통 컴포넌트 생성

컴포넌트명: $ARGUMENTS

## 작업 순서

### 1단계: 컴포넌트 파일 생성
`src/components/common/{ComponentName}/index.tsx`

**필수 포함 요소:**
- Props 인터페이스 완전 정의 (optional 여부 명시)
- `useColorScheme` + `theme` 으로 다크모드 대응
- `StyleSheet.create` 사용 (인라인 스타일 금지)
- 접근성 props (`accessibilityLabel`, `accessibilityRole`)
- 애니메이션 필요 시 `react-native-reanimated` 사용

**기본 구조:**
```tsx
import { View, StyleSheet, useColorScheme } from 'react-native'
import { theme } from 'src/theme'

interface {ComponentName}Props {
  // 필수 props
  title: string
  // 선택 props
  variant?: 'primary' | 'secondary'
  onPress?: () => void
  style?: ViewStyle
}

export function {ComponentName}({
  title,
  variant = 'primary',
  onPress,
  style,
}: {ComponentName}Props) {
  const colorScheme = useColorScheme()
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <View
      style={[styles.container, { backgroundColor: colors.card }, style]}
      accessibilityRole="..."
    >
      {/* 내용 */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // 스타일
  },
})
```

### 2단계: src/components/common/index.ts에 export 추가
```typescript
export { {ComponentName} } from './{ComponentName}'
```

### 3단계: 사용 예시 주석 추가
JSDoc으로 사용 예시 1~2개 작성

## 컴포넌트 원칙
- 완전히 presentational (비즈니스 로직 없음)
- props만 받아서 렌더링
- 재사용 가능하도록 설계
- 플랫폼별 분기는 `Platform.OS` 사용
- 애니메이션은 `useAnimatedStyle` + `withTiming`
