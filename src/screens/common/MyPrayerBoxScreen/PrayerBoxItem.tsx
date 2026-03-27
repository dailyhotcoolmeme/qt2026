import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'
import type { PrayerRow } from 'src/lib/types'

export type PrayerWithGroup = PrayerRow & { groupName?: string }

interface Props {
  item: PrayerWithGroup
  onRemove: () => void
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

export function PrayerBoxItem({ item, onRemove }: Props) {
  const { isDark } = useAppTheme()
  const colors = theme.colors[isDark ? 'dark' : 'light']
  const [expanded, setExpanded] = useState(false)

  const isGroup = !!item.group_id
  const hasMaeum = item.pray_count > 0
  const hasGl = !!item.content
  const hasVoice = !!item.voice_url
  const hasDetails = isGroup && (hasMaeum || hasGl || hasVoice)

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => hasDetails && setExpanded((e) => !e)}
    >
      <View style={styles.topRow}>
        <View style={styles.badges}>
          {isGroup ? (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>{item.groupName ?? '그룹 기도'}</Text>
            </View>
          ) : (
            <View style={[styles.personalBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.personalBadgeText, { color: colors.primary }]}>매일기도</Text>
            </View>
          )}
          {item.is_answered && (
            <View style={styles.answeredBadge}>
              <Text style={styles.answeredBadgeText}>응답됨</Text>
            </View>
          )}
        </View>
        <View style={styles.rightActions}>
          {hasDetails && (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textTertiary}
            />
          )}
          <Pressable onPress={onRemove} hitSlop={8}>
            <Ionicons name="trash-outline" size={15} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
      <Text style={[styles.date, { color: colors.textTertiary }]}>
        {new Date(item.created_at).toLocaleDateString('ko-KR')}
      </Text>

      {hasDetails && expanded && (
        <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
          {hasMaeum && (
            <View style={styles.detailRow}>
              <Ionicons name="heart" size={13} color="#EF4444" />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                마음기도 {item.pray_count}명
              </Text>
            </View>
          )}
          {hasGl && (
            <View style={styles.detailBlock}>
              <View style={styles.detailRow}>
                <Ionicons name="pencil-outline" size={13} color={colors.primary} />
                <Text style={[styles.detailLabel, { color: colors.primary }]}>글기도</Text>
              </View>
              <Text style={[styles.contentText, { color: colors.textPrimary }]} numberOfLines={5}>
                {item.content}
              </Text>
            </View>
          )}
          {hasVoice && (
            <View style={styles.detailRow}>
              <Ionicons name="mic-outline" size={13} color="#8B5CF6" />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                음성기도{item.voice_duration ? ` · ${formatDuration(item.voice_duration)}` : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: theme.spacing.borderRadius,
    padding: theme.spacing.md,
    gap: 5,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 },
  groupBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: '#FEF3C7' },
  groupBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  personalBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  personalBadgeText: { fontSize: 10, fontWeight: '700' },
  answeredBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: '#DCFCE7' },
  answeredBadgeText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8 },
  title: { ...theme.typography.styles.h4 },
  date: { ...theme.typography.styles.caption },
  detailSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 4, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { ...theme.typography.styles.caption },
  detailLabel: { ...theme.typography.styles.caption, fontWeight: '700' },
  detailBlock: { gap: 4 },
  contentText: { ...theme.typography.styles.body, paddingLeft: 18, lineHeight: 22 },
})
