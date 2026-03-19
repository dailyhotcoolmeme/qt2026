import React, { useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Alert, Share } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import * as Haptics from 'expo-haptics'
import { theme, palette } from 'src/theme'
import type { BibleVerse } from 'src/hooks/bible/useBibleView'

interface Props {
  item: BibleVerse
  fontSize: number
  bookName: string
  chapter: number
  isFavorited: boolean
  toggleFavorite: (v: BibleVerse) => Promise<void>
  keyword?: string
}

function highlightText(text: string, keyword: string, highlightColor: string, textColor: string) {
  if (!keyword.trim()) {
    return <Text style={{ color: textColor }}>{text}</Text>
  }
  const parts = text.split(new RegExp(`(${keyword})`, 'gi'))
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <Text key={index} style={{ color: highlightColor, fontWeight: '600' }}>
            {part}
          </Text>
        ) : (
          <Text key={index} style={{ color: textColor }}>
            {part}
          </Text>
        ),
      )}
    </>
  )
}

export const VerseItem = React.memo(function VerseItem({
  item,
  fontSize,
  bookName,
  chapter,
  isFavorited,
  toggleFavorite,
  keyword,
}: Props) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const handleToggleFavorite = useCallback(() => {
    void toggleFavorite(item)
  }, [toggleFavorite, item])

  const handleLongPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const reference = `${bookName} ${chapter}:${item.verse}`
    Alert.alert(
      reference,
      undefined,
      [
        {
          text: isFavorited ? '즐겨찾기 제거' : '즐겨찾기 추가',
          onPress: handleToggleFavorite,
        },
        {
          text: '구절 공유',
          onPress: () => {
            void Share.share({
              message: `"${item.content}"\n\n— ${reference}`,
            })
          },
        },
        { text: '취소', style: 'cancel' },
      ],
    )
  }, [bookName, chapter, item, isFavorited, handleToggleFavorite])

  const verseNumColor = isFavorited ? palette.amber500 : colors.primary

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={[
        styles.container,
        isFavorited && { borderLeftColor: palette.amber500, borderLeftWidth: 3 },
      ]}
      accessibilityLabel={`${item.verse}절 ${item.content}`}
      accessibilityHint="길게 누르면 즐겨찾기 또는 공유"
    >
      <Text style={[styles.verseNumber, { color: verseNumColor }]}>{item.verse}</Text>
      <Text style={[styles.content, { fontSize, lineHeight: fontSize * 1.7, color: colors.textPrimary }]}>
        {keyword
          ? highlightText(item.content, keyword, colors.primary, colors.textPrimary)
          : item.content}
      </Text>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadiusSm,
    borderLeftWidth: 0,
  },
  verseNumber: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    marginTop: 3,
    marginRight: theme.spacing.sm,
    minWidth: 20,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    fontWeight: theme.typography.fontWeight.regular,
  },
})
