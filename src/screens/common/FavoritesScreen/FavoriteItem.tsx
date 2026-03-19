import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'
import { Clipboard } from 'react-native'
import { theme } from 'src/theme'
import type { VerseFavoriteRow } from 'src/lib/types'

interface FavoriteItemProps {
  item: VerseFavoriteRow
  onRemove: (id: string) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export function FavoriteItem({ item, onRemove }: FavoriteItemProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  function handleRemove() {
    Alert.alert(
      '즐겨찾기 삭제',
      '이 구절을 즐겨찾기에서 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onRemove(item.id),
        },
      ],
    )
  }

  function handleLongPress() {
    const text = `${item.reference}\n${item.content}`
    Clipboard.setString(text)
    Alert.alert('복사됨', '구절이 클립보드에 복사되었습니다.')
  }

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.reference, { color: colors.primary }]}>
          {item.reference}
        </Text>
        <Pressable
          onPress={handleRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      </View>

      <Text
        style={[styles.content, { color: colors.textPrimary }]}
        numberOfLines={3}
      >
        {item.content}
      </Text>

      <Text style={[styles.date, { color: colors.textTertiary }]}>
        {formatDate(item.created_at)}
      </Text>

      <View style={[styles.longPressHint, { borderTopColor: colors.divider }]}>
        <Text style={[styles.hintText, { color: colors.textTertiary }]}>
          길게 누르면 복사
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    padding: theme.spacing.cardPadding,
    marginHorizontal: theme.spacing.screenPaddingH,
    marginBottom: theme.spacing.itemGap,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  reference: {
    ...theme.typography.styles.h4,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  deleteBtn: {
    padding: 4,
  },
  content: {
    ...theme.typography.styles.body,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  date: {
    ...theme.typography.styles.caption,
    marginBottom: theme.spacing.xs,
  },
  longPressHint: {
    borderTopWidth: 1,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  hintText: {
    ...theme.typography.styles.caption,
    textAlign: 'right',
  },
})
