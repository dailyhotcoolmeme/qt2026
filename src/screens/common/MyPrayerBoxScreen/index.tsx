import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  ListRenderItemInfo,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PostgrestError } from '@supabase/supabase-js'

import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'
import { Loading, EmptyState } from 'src/components/common'
import { supabase } from 'src/lib/supabase'
import { usePrayerBox } from 'src/hooks/prayer/usePrayerBox'
import { useAuthStore } from 'src/stores/authStore'
import type { PrayerRow } from 'src/lib/types'
import type { RootStackParamList } from 'src/navigation/types'
import { PrayerBoxItem, type PrayerWithGroup } from './PrayerBoxItem'

type Props = NativeStackScreenProps<RootStackParamList, 'MyPrayerBox'>

export default function MyPrayerBoxScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const colors = theme.colors[isDark ? 'dark' : 'light']
  const userId = useAuthStore((s) => s.user?.id)
  const { savedIds, isLoaded, removePrayer } = usePrayerBox()
  const [prayers, setPrayers] = useState<PrayerWithGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchPrayers = useCallback(async () => {
    if (!isLoaded || !userId) return
    if (savedIds.size === 0) { setPrayers([]); return }

    setIsLoading(true)
    try {
      const ids = [...savedIds]
      const { data: rawPrayerData, error: prayerErr } = await supabase
        .from('prayers')
        .select('*')
        .in('id', ids)
      if (prayerErr) throw prayerErr
      const prayerData = (rawPrayerData ?? []) as PrayerRow[]

      const groupIds = [...new Set(
        prayerData.filter((p) => p.group_id).map((p) => p.group_id as string)
      )]
      const groupNameMap: Record<string, string> = {}
      if (groupIds.length > 0) {
        const { data: rawGroupData } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds)
        const groupData = (rawGroupData ?? []) as Array<{ id: string; name: string }>
        groupData.forEach((g) => { groupNameMap[g.id] = g.name })
      }

      const result = ids
        .map((id) => {
          const p = prayerData.find((x) => String(x.id) === id)
          if (!p) return null
          return { ...p, groupName: p.group_id ? groupNameMap[p.group_id] : undefined } as PrayerWithGroup
        })
        .filter((x): x is PrayerWithGroup => x !== null)

      setPrayers(result)
    } catch (e) {
      console.error('[MyPrayerBox]', (e as PostgrestError).message)
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, userId, savedIds])

  useEffect(() => { void fetchPrayers() }, [fetchPrayers])

  const handleRemove = (prayerId: string) => {
    Alert.alert('저장 취소', '기도제목함에서 제거하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '제거',
        style: 'destructive',
        onPress: async () => {
          await removePrayer(prayerId)
          setPrayers((prev) => prev.filter((p) => String(p.id) !== prayerId))
        },
      },
    ])
  }

  const renderItem = ({ item }: ListRenderItemInfo<PrayerWithGroup>) => (
    <PrayerBoxItem item={item} onRemove={() => handleRemove(String(item.id))} />
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.header, borderBottomColor: colors.headerBorder }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>내 기도제목함</Text>
        <View style={styles.headerBtn} />
      </View>

      {!isLoaded || isLoading ? (
        <Loading />
      ) : (
        <FlatList<PrayerWithGroup>
          data={prayers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.xl }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="bookmark-outline" size={40} color={colors.textTertiary} />}
              title="저장된 기도 제목이 없습니다"
              description="기도제목 옆 북마크 아이콘을 눌러 저장하세요"
            />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: theme.spacing.xs, minWidth: 36, alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', ...theme.typography.styles.h4 },
  list: { padding: theme.spacing.screenPaddingH, gap: theme.spacing.sm, flexGrow: 1 },
})
