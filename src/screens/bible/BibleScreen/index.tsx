import React, { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { theme } from 'src/theme'
import { Loading, EmptyState, ScreenHeader } from 'src/components/common'
import { useBibleReading } from 'src/hooks/bible/useBibleReading'
import type { RootStackParamList } from 'src/navigation/types'
import type { ReadingRecordRow } from 'src/lib/types'
import { PlanCarousel } from './PlanCarousel'
import { ReadingRecordItem } from './ReadingRecordItem'

type Nav = NativeStackNavigationProp<RootStackParamList>

export default function BibleScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const navigation = useNavigation<Nav>()
  const { todayPlan, recentRecords, isLoading, completionRate, weeklyCount } = useBibleReading()

  const handleStartReading = useCallback(() => {
    if (!todayPlan) return
    navigation.navigate('BibleView', {
      book: todayPlan.book,
      chapter: todayPlan.chapter,
    })
  }, [navigation, todayPlan])

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ReadingRecordRow>) => <ReadingRecordItem item={item} />,
    [],
  )

  const keyExtractor = useCallback((item: ReadingRecordRow) => item.id, [])

  const dateSubtitle = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  const ListHeader = (
    <View>
      <ScreenHeader
        title="성경읽기"
        subtitle={dateSubtitle}
        paddingTop={insets.top + 8}
      />

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {todayPlan && (
            <PlanCarousel
              plan={todayPlan}
              weeklyCount={weeklyCount}
              completionRate={completionRate}
              onStartReading={handleStartReading}
            />
          )}
          <Text style={[styles.sectionTitle, styles.recentLabel, { color: colors.textPrimary }]}>
            최근 읽은 기록
          </Text>
        </>
      )}
    </View>
  )

  return (
    <FlatList
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.lg }}
      data={recentRecords}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        !isLoading ? (
          <EmptyState
            title="아직 읽은 기록이 없어요"
            description="오늘의 말씀부터 시작해 보세요"
          />
        ) : null
      }
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sectionTitle: { ...theme.typography.styles.h4 },
  recentLabel: {
    marginHorizontal: theme.spacing.screenPaddingH,
    marginBottom: theme.spacing.sm,
  },
})
