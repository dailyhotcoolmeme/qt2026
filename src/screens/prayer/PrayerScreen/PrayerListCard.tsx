import React from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ListRenderItemInfo,
} from 'react-native'
import { EmptyState } from 'src/components/common'
import type { PrayerRow } from 'src/lib/types'
import { PrayerItem } from './PrayerItem'
import { PublicPrayerItem } from './PublicPrayerItem'

interface MyListProps {
  prayers: PrayerRow[]
  onDelete: (id: string) => void
  onMarkAnswered: (id: string) => void
  listPaddingBottom: number
  savedIds?: Set<string>
  onToggleSave?: (id: string) => void
}

interface PublicListProps {
  prayers: PrayerRow[]
  currentUserId: string
  prayingIds: Set<string>
  onPray: (id: string) => void
  listPaddingBottom: number
}

function useCardWidth() {
  const { width } = useWindowDimensions()
  return width * 0.82
}

export function MyPrayerCard({
  prayers,
  onDelete,
  onMarkAnswered,
  listPaddingBottom,
  savedIds,
  onToggleSave,
}: MyListProps) {
  const cardWidth = useCardWidth()

  const renderItem = ({ item }: ListRenderItemInfo<PrayerRow>) => (
    <PrayerItem
      prayer={item}
      onPress={() => {/* TODO: 수정 화면 */}}
      onDelete={() => onDelete(item.id)}
      onMarkAnswered={() => onMarkAnswered(item.id)}
      isSaved={savedIds?.has(item.id)}
      onToggleSave={onToggleSave ? () => onToggleSave(item.id) : undefined}
    />
  )

  return (
    <View
      style={[
        styles.card,
        { width: cardWidth },
        prayers.length === 0 && styles.cardEmpty,
      ]}
    >
      {prayers.length === 0 ? (
        <EmptyState
          title="기도 제목이 없습니다"
          description="+ 버튼을 눌러 첫 번째 기도 제목을 추가해보세요"
        />
      ) : (
        <FlatList<PrayerRow>
          data={prayers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: listPaddingBottom }}
        />
      )}
    </View>
  )
}

export function PublicPrayerCard({
  prayers,
  currentUserId,
  prayingIds,
  onPray,
  listPaddingBottom,
}: PublicListProps) {
  const cardWidth = useCardWidth()

  const renderItem = ({ item }: ListRenderItemInfo<PrayerRow>) => (
    <PublicPrayerItem
      prayer={item}
      currentUserId={currentUserId}
      onPray={() => onPray(item.id)}
      isPraying={prayingIds.has(item.id)}
    />
  )

  return (
    <View
      style={[
        styles.card,
        { width: cardWidth },
        prayers.length === 0 && styles.cardEmpty,
      ]}
    >
      {prayers.length === 0 ? (
        <EmptyState
          title="공개 기도 제목이 없습니다"
          description="아직 공개된 기도 제목이 없어요"
        />
      ) : (
        <FlatList<PrayerRow>
          data={prayers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: listPaddingBottom }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    height: 450,
    borderRadius: 32,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.06,
    shadowRadius: 45,
    elevation: 8,
    overflow: 'hidden',
  },
  cardEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
