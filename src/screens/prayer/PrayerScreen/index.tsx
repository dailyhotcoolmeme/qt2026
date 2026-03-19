import React, { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import { Loading, ScreenHeader } from 'src/components/common'
import { useAuthStore } from 'src/stores/authStore'
import { usePrayers } from 'src/hooks/prayer/usePrayers'
import { AddPrayerModal } from './AddPrayerModal'
import { PrayerSummaryCards } from './PrayerSummaryCards'
import { MyPrayerCard, PublicPrayerCard } from './PrayerListCard'
import { PrayerTabBar, TabType } from './PrayerTabBar'

export default function PrayerScreen() {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const userId = useAuthStore((s) => s.user?.id) ?? ''

  const [activeTab, setActiveTab] = useState<TabType>('mine')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [prayingIds, setPrayingIds] = useState<Set<string>>(new Set())

  const {
    myPrayers,
    publicPrayers,
    isLoading,
    createPrayer,
    isCreating,
    deletePrayer,
    markAnswered,
    prayForTopic,
  } = usePrayers()

  const today = new Date()
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일`
  const todayStr = today.toDateString()
  const todayCount = myPrayers.filter(
    (p) => new Date(p.created_at).toDateString() === todayStr
  ).length
  const answeredCount = myPrayers.filter((p) => p.is_answered).length
  const groupCount = myPrayers.filter((p) => p.group_id !== null).length

  const handleCreatePrayer = async (data: {
    title: string
    content: string
    isPublic: boolean
  }) => {
    await createPrayer({
      user_id: userId,
      title: data.title,
      content: data.content || null,
      is_public: data.isPublic,
      is_answered: false,
      pray_count: 0,
      voice_url: null,
      voice_duration: null,
      group_id: null,
    })
    setIsModalVisible(false)
  }

  const handlePrayForTopic = async (prayerId: string) => {
    setPrayingIds((prev) => new Set(prev).add(prayerId))
    try {
      await prayForTopic(prayerId)
    } finally {
      setPrayingIds((prev) => {
        const next = new Set(prev)
        next.delete(prayerId)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <Loading />
      </View>
    )
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="매일기도"
        subtitle={dateLabel}
        paddingTop={insets.top + 8}
      />

      <PrayerSummaryCards
        todayCount={todayCount}
        answeredCount={answeredCount}
        groupCount={groupCount}
      />

      <PrayerTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 메인 카드 영역 */}
      <View style={styles.cardArea}>
        {activeTab === 'mine' ? (
          <MyPrayerCard
            prayers={myPrayers}
            onDelete={(id) => deletePrayer(id)}
            onMarkAnswered={(id) => markAnswered(id)}
            listPaddingBottom={16}
          />
        ) : (
          <PublicPrayerCard
            prayers={publicPrayers}
            currentUserId={userId}
            prayingIds={prayingIds}
            onPray={handlePrayForTopic}
            listPaddingBottom={16}
          />
        )}
      </View>

      {/* FAB */}
      {activeTab === 'mine' && (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: insets.bottom + theme.spacing.lg,
            },
          ]}
          accessibilityLabel="기도 제목 추가"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}

      <AddPrayerModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleCreatePrayer}
        isSubmitting={isCreating}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.screenPaddingH,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
})
