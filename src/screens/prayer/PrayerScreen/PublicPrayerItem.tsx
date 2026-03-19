import React from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'
import { Avatar } from 'src/components/common'
import type { PrayerRow } from 'src/lib/types'
import { relativeDate } from 'src/hooks/prayer/dateUtils'

interface PublicPrayerItemProps {
  prayer: PrayerRow
  currentUserId: string
  onPray: () => void
  isPraying: boolean
}

export function PublicPrayerItem({
  prayer,
  currentUserId,
  onPray,
  isPraying,
}: PublicPrayerItemProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const isOwnPrayer = prayer.user_id === currentUserId

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
      accessibilityRole="none"
    >
      <View style={styles.header}>
        <Avatar size={32} />
        <View style={styles.meta}>
          <Text style={[styles.author, { color: colors.textSecondary }]}>
            익명
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>
            {relativeDate(prayer.created_at)}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.title, { color: colors.textPrimary }]}
        numberOfLines={3}
      >
        {prayer.title}
      </Text>

      <View style={styles.footer}>
        <Text style={[styles.prayCount, { color: colors.textTertiary }]}>
          🙏 {prayer.pray_count}
        </Text>
        <Pressable
          onPress={onPray}
          disabled={isOwnPrayer || isPraying}
          style={({ pressed }) => [
            styles.prayButton,
            {
              backgroundColor: isOwnPrayer
                ? colors.divider
                : colors.primaryLight,
              opacity: pressed && !isOwnPrayer ? 0.75 : 1,
            },
          ]}
          accessibilityLabel="기도하기"
          accessibilityRole="button"
          accessibilityState={{ disabled: isOwnPrayer || isPraying }}
        >
          {isPraying ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.prayButtonText,
                {
                  color: isOwnPrayer ? colors.textTertiary : colors.primary,
                },
              ]}
            >
              {isOwnPrayer ? '내 기도' : '기도하기'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: theme.spacing.borderRadius,
    padding: theme.spacing.cardPadding,
    marginBottom: theme.spacing.itemGap,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  meta: {
    flex: 1,
  },
  author: {
    ...theme.typography.styles.label,
  },
  date: {
    ...theme.typography.styles.caption,
  },
  title: {
    ...theme.typography.styles.body,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  prayCount: {
    ...theme.typography.styles.bodySmall,
  },
  prayButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.spacing.borderRadiusSm,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayButtonText: {
    ...theme.typography.styles.label,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
})
