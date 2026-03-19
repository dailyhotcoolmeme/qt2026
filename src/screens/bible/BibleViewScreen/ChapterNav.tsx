import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface Props {
  chapter: number
  totalChapters: number
  onPrev: () => void
  onNext: () => void
}

export function ChapterNav({ chapter, totalChapters, onPrev, onNext }: Props) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const canPrev = chapter > 1
  const canNext = chapter < totalChapters

  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable
        onPress={onPrev}
        disabled={!canPrev}
        style={({ pressed }) => [
          styles.navButton,
          { opacity: !canPrev ? 0.3 : pressed ? 0.6 : 1 },
        ]}
        accessibilityLabel="이전 장"
        accessibilityRole="button"
      >
        <Text style={[styles.navArrow, { color: colors.primary }]}>‹</Text>
        <Text style={[styles.navLabel, { color: colors.textSecondary }]}>이전 장</Text>
      </Pressable>

      <Text style={[styles.chapterInfo, { color: colors.textTertiary }]}>
        {chapter} / {totalChapters}
      </Text>

      <Pressable
        onPress={onNext}
        disabled={!canNext}
        style={({ pressed }) => [
          styles.navButton,
          styles.navRight,
          { opacity: !canNext ? 0.3 : pressed ? 0.6 : 1 },
        ]}
        accessibilityLabel="다음 장"
        accessibilityRole="button"
      >
        <Text style={[styles.navLabel, { color: colors.textSecondary }]}>다음 장</Text>
        <Text style={[styles.navArrow, { color: colors.primary }]}>›</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  navRight: {
    flexDirection: 'row',
  },
  navArrow: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '300',
  },
  navLabel: {
    ...theme.typography.styles.label,
    marginHorizontal: theme.spacing.xs,
  },
  chapterInfo: {
    ...theme.typography.styles.caption,
  },
})
