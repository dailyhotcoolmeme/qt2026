import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface Props {
  bookName: string
  chapter: number
  fontSize: number
  minFont: number
  maxFont: number
  paddingTop: number
  onBack: () => void
  onFontDecrease: () => void
  onFontIncrease: () => void
}

export function ViewerHeader({
  bookName,
  chapter,
  fontSize,
  minFont,
  maxFont,
  paddingTop,
  onBack,
  onFontDecrease,
  onFontIncrease,
}: Props) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: paddingTop + theme.spacing.sm,
          backgroundColor: colors.header,
          borderBottomColor: colors.headerBorder,
        },
      ]}
    >
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
      >
        <Text style={[styles.backArrow, { color: colors.primary }]}>‹</Text>
      </Pressable>

      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {bookName} {chapter}장
      </Text>

      <View style={styles.fontControls}>
        <Pressable
          onPress={onFontDecrease}
          disabled={fontSize <= minFont}
          style={({ pressed }) => [
            styles.fontBtn,
            { opacity: fontSize <= minFont ? 0.3 : pressed ? 0.6 : 1 },
          ]}
          accessibilityLabel="글자 크기 줄이기"
        >
          <Text style={[styles.fontSm, { color: colors.textSecondary }]}>가</Text>
        </Pressable>
        <Pressable
          onPress={onFontIncrease}
          disabled={fontSize >= maxFont}
          style={({ pressed }) => [
            styles.fontBtn,
            { opacity: fontSize >= maxFont ? 0.3 : pressed ? 0.6 : 1 },
          ]}
          accessibilityLabel="글자 크기 키우기"
        >
          <Text style={[styles.fontLg, { color: colors.textSecondary }]}>가</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    minHeight: theme.spacing.headerHeight,
  },
  backBtn: { paddingRight: theme.spacing.sm },
  backArrow: { fontSize: 28, lineHeight: 32, fontWeight: '300' },
  title: {
    ...theme.typography.styles.h4,
    flex: 1,
    textAlign: 'center',
  },
  fontControls: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  fontBtn: { padding: theme.spacing.xs },
  fontSm: { fontSize: 13, fontWeight: '500' },
  fontLg: { fontSize: 17, fontWeight: '500' },
})
