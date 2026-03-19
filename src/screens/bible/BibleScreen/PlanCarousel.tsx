import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { theme, palette } from 'src/theme'
import { Button } from 'src/components/common'
import type { ReadingPlan } from 'src/hooks/bible/useBibleReading'
import { BOOK_NAMES } from './planCarouselData'
import { styles } from './planCarouselStyles'

const SPRING_CFG = { damping: 22, stiffness: 220, mass: 0.8 }
const CARD_COUNT = 3

interface Props {
  plan: ReadingPlan
  weeklyCount: number
  completionRate: number
  onStartReading: () => void
}

export function PlanCarousel({ plan, weeklyCount, completionRate, onStartReading }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const [activeIndex, setActiveIndex] = useState(0)

  const cardWidth = screenWidth * 0.82
  const snapUnit = cardWidth
  const maxCardHeight = screenHeight * 0.7

  const offsetX = useSharedValue(0)
  const startX = useSharedValue(0)

  const snapTo = (index: number) => {
    const clamped = Math.max(0, Math.min(CARD_COUNT - 1, index))
    offsetX.value = withSpring(-clamped * snapUnit, SPRING_CFG)
    setActiveIndex(clamped)
  }

  const pan = Gesture.Pan()
    .onBegin(() => { startX.value = offsetX.value })
    .onUpdate((e) => { offsetX.value = startX.value + e.translationX })
    .onEnd((e) => {
      const rawIndex = -offsetX.value / snapUnit
      const target =
        e.velocityX < -400 ? Math.ceil(rawIndex)
        : e.velocityX > 400 ? Math.floor(rawIndex)
        : Math.round(rawIndex)
      runOnJS(snapTo)(target)
    })

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }))

  const bookName = BOOK_NAMES[plan.book] ?? plan.book
  const percent = Math.round(completionRate * 100)
  const cardBase = [styles.card, { width: cardWidth, maxHeight: maxCardHeight }]

  return (
    <View style={styles.outer}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.track, { width: cardWidth * CARD_COUNT }, trackStyle]}>

          {/* 카드 1: 오늘의 읽기 */}
          <View style={cardBase}>
            <View style={styles.cardLabelRow}>
              <Text style={[styles.cardLabel, { color: colors.primary }]}>오늘의 읽기</Text>
              {plan.isCompleted && (
                <View style={[styles.badge, { backgroundColor: colors.success }]}>
                  <Text style={[styles.badgeText, { color: colors.textInverse }]}>완료</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {bookName} {plan.chapter}장
            </Text>
            <Text style={[styles.cardDate, { color: colors.textTertiary }]}>{plan.date}</Text>
            <ScrollView
              style={[styles.verseScroll, { maxHeight: maxCardHeight * 0.5 }]}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={[styles.versePlaceholder, { color: colors.textSecondary }]}>
                말씀을 읽으려면 아래 버튼을 눌러 시작하세요.
              </Text>
            </ScrollView>
            {!plan.isCompleted && (
              <Button
                title="읽기 시작"
                onPress={onStartReading}
                variant="primary"
                size="md"
                fullWidth
                style={styles.cardButton}
              />
            )}
          </View>

          {/* 카드 2: 이번 주 진도 */}
          <View style={cardBase}>
            <Text style={[styles.cardLabel, { color: colors.primary }]}>이번 주 진도</Text>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {weeklyCount} / 7일
            </Text>
            <View style={styles.weekDots}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.weekDot,
                    { backgroundColor: i < weeklyCount ? colors.success : colors.border },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
              {weeklyCount >= 7 ? '이번 주 목표 달성!' : `${7 - weeklyCount}일 더 읽으면 완주`}
            </Text>
          </View>

          {/* 카드 3: 이번 달 진도 */}
          <View style={cardBase}>
            <Text style={[styles.cardLabel, { color: colors.primary }]}>이번 달 진도</Text>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{percent}%</Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${percent}%` as `${number}%`, backgroundColor: palette.blue600 },
                ]}
              />
            </View>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
              {percent >= 100 ? '이달 목표 완료!' : `목표까지 ${100 - percent}% 남음`}
            </Text>
          </View>

        </Animated.View>
      </GestureDetector>

      {/* 페이지 인디케이터 */}
      <View style={styles.dotsRow}>
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === activeIndex ? colors.primary : colors.border },
            ]}
          />
        ))}
      </View>
    </View>
  )
}
