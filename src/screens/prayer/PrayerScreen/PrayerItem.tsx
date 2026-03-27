import React from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import { Badge } from 'src/components/common'
import type { PrayerRow } from 'src/lib/types'
import { relativeDate } from 'src/hooks/prayer/dateUtils'

interface PrayerItemProps {
  prayer: PrayerRow
  onPress: () => void
  onDelete: () => void
  onMarkAnswered: () => void
  isSaved?: boolean
  onToggleSave?: () => void
}

export function PrayerItem({ prayer, onPress, onDelete, onMarkAnswered, isSaved, onToggleSave }: PrayerItemProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const handleMorePress = () => {
    const options = ['수정', prayer.is_answered ? null : '응답 완료', '삭제', '취소'].filter(
      Boolean
    ) as string[]

    Alert.alert('기도 제목', undefined, [
      {
        text: '수정',
        onPress,
      },
      ...(!prayer.is_answered
        ? [{ text: '응답 완료', onPress: onMarkAnswered }]
        : []),
      {
        text: '삭제',
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert('삭제 확인', '이 기도 제목을 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: onDelete },
          ])
        },
      },
      { text: '취소', style: 'cancel' as const },
    ])
    // suppress unused variable warning
    void options
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
      onLongPress={() => {
        Alert.alert('기도 제목 삭제', '이 기도 제목을 삭제하시겠습니까?', [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: onDelete },
        ])
      }}
      accessibilityRole="button"
      accessibilityLabel={prayer.title}
    >
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {prayer.title}
          </Text>
          {prayer.is_answered && (
            <Badge label="응답됨" variant="success" size="sm" style={styles.badge} />
          )}
          {prayer.group_id && (
            <Badge label="그룹" variant="primary" size="sm" style={styles.badge} />
          )}
        </View>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {relativeDate(prayer.created_at)}
        </Text>
      </View>
      {onToggleSave && (
        <Pressable onPress={onToggleSave} hitSlop={8} style={styles.iconButton}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isSaved ? colors.primary : colors.textTertiary}
          />
        </Pressable>
      )}
      <Pressable
        onPress={handleMorePress}
        hitSlop={8}
        style={styles.moreButton}
        accessibilityLabel="더보기"
        accessibilityRole="button"
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.spacing.borderRadius,
    paddingHorizontal: theme.spacing.cardPadding,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.itemGap,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    ...theme.typography.styles.h4,
    flexShrink: 1,
  },
  badge: {
    flexShrink: 0,
  },
  date: {
    ...theme.typography.styles.caption,
  },
  iconButton: {
    paddingLeft: theme.spacing.sm,
  },
  moreButton: {
    paddingLeft: theme.spacing.sm,
  },
})
