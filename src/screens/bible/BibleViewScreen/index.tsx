import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ListRenderItemInfo,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import { theme } from 'src/theme'
import { Loading, EmptyState, Button } from 'src/components/common'
import { useBibleView } from 'src/hooks/bible/useBibleView'
import { useBibleReading } from 'src/hooks/bible/useBibleReading'
import type { RootStackParamList } from 'src/navigation/types'
import type { BibleVerse } from 'src/hooks/bible/useBibleView'
import { VerseItem } from './VerseItem'
import { ChapterNav } from './ChapterNav'
import { ViewerHeader } from './ViewerHeader'

type Nav = NativeStackNavigationProp<RootStackParamList, 'BibleView'>
type RouteT = RouteProp<RootStackParamList, 'BibleView'>

const MIN_FONT = 14
const MAX_FONT = 24
const FONT_STEP = 2

export default function BibleViewScreen() {
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const navigation = useNavigation<Nav>()
  const route = useRoute<RouteT>()

  const { book, chapter: initialChapter, verse: initialVerse, keyword } = route.params
  const [chapter, setChapter] = useState(initialChapter)
  const [fontSize, setFontSize] = useState(16)
  const listRef = useRef<FlatList<BibleVerse>>(null)

  const {
    verses,
    isLoading,
    error,
    bookName,
    totalChapters,
    audioUrl,
    favoriteVerseNums,
    toggleFavorite,
  } = useBibleView(book, chapter)
  const { markAsRead, isMarking } = useBibleReading()

  useEffect(() => {
    if (!initialVerse || verses.length === 0) return
    const index = verses.findIndex((v) => v.verse === initialVerse)
    if (index >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index, animated: true })
      }, 300)
    }
  }, [verses, initialVerse])

  const handleMarkRead = useCallback(async () => {
    await markAsRead(book, chapter)
    navigation.goBack()
  }, [markAsRead, book, chapter, navigation])

  const handlePrevChapter = useCallback(() => {
    if (chapter > 1) setChapter((c) => c - 1)
  }, [chapter])

  const handleNextChapter = useCallback(() => {
    if (chapter < totalChapters) setChapter((c) => c + 1)
  }, [chapter, totalChapters])

  // 좌우 스와이프로 이전/다음 장 전환 (수직 스크롤과 공존)
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX < -60) runOnJS(handleNextChapter)()
      else if (e.translationX > 60) runOnJS(handlePrevChapter)()
    })

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<BibleVerse>) => (
      <VerseItem
        item={item}
        fontSize={fontSize}
        bookName={bookName}
        chapter={chapter}
        isFavorited={favoriteVerseNums.has(item.verse)}
        toggleFavorite={toggleFavorite}
        keyword={keyword}
      />
    ),
    [fontSize, bookName, chapter, favoriteVerseNums, toggleFavorite, keyword],
  )

  const keyExtractor = useCallback((item: BibleVerse) => String(item.verse), [])

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ViewerHeader
        bookName={bookName}
        chapter={chapter}
        fontSize={fontSize}
        minFont={MIN_FONT}
        maxFont={MAX_FONT}
        paddingTop={insets.top}
        onBack={() => navigation.goBack()}
        onFontDecrease={() => setFontSize((f) => Math.max(MIN_FONT, f - FONT_STEP))}
        onFontIncrease={() => setFontSize((f) => Math.min(MAX_FONT, f + FONT_STEP))}
      />

      <GestureDetector gesture={swipeGesture}>
        <View style={styles.fill}>
          {isLoading ? (
            <Loading />
          ) : error ? (
            <EmptyState
              title="본문을 불러올 수 없어요"
              description={error.message}
              action={{ label: '다시 시도', onPress: () => {} }}
            />
          ) : (
            <FlatList
              ref={listRef}
              data={verses}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={() => {}}
              ListEmptyComponent={
                <EmptyState
                  title="본문 데이터가 없어요"
                  description="서버에서 데이터를 준비 중입니다"
                />
              }
            />
          )}
        </View>
      </GestureDetector>

      <ChapterNav
        chapter={chapter}
        totalChapters={totalChapters}
        onPrev={handlePrevChapter}
        onNext={handleNextChapter}
      />

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + theme.spacing.sm,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        {audioUrl !== null && (
          <Pressable
            style={[styles.audioBtn, { borderColor: colors.primary }]}
            accessibilityLabel="오디오 재생"
            accessibilityRole="button"
          >
            <Text style={[styles.audioBtnText, { color: colors.primary }]}>오디오</Text>
          </Pressable>
        )}
        <Button
          title="읽기 완료"
          onPress={() => { void handleMarkRead() }}
          variant="primary"
          size="md"
          loading={isMarking}
          fullWidth={audioUrl === null}
          style={audioUrl !== null ? styles.markBtn : undefined}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
  },
  audioBtn: {
    height: theme.spacing.buttonHeight,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBtnText: {
    ...theme.typography.styles.button,
  },
  markBtn: { flex: 1 },
})
