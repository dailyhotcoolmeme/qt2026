import React, { useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { theme } from 'src/theme'

const PEEK = 24
const GAP = 12
const SPRING = { damping: 20, stiffness: 200, mass: 0.8 }
const TOTAL = 3

interface Props {
  todayCount: number
  answeredCount: number
  groupCount: number
}

export function PrayerSummaryCards({ todayCount, answeredCount, groupCount }: Props) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const { width: screenWidth } = useWindowDimensions()
  const [dotIndex, setDotIndex] = useState(0)

  const cardWidth = screenWidth - PEEK * 2 - GAP
  const step = cardWidth + GAP

  const cards = [
    { title: '오늘의 기도', count: todayCount, icon: '🙏', sub: '오늘 작성한 기도' },
    { title: '응답된 기도', count: answeredCount, icon: '✨', sub: '응답 받은 기도' },
    { title: '그룹 기도', count: groupCount, icon: '👥', sub: '함께하는 기도' },
  ]

  const tx = useSharedValue(0)
  const startTx = useSharedValue(0)
  const idxSv = useSharedValue(0)

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      startTx.value = tx.value
    })
    .onUpdate((e) => {
      const min = -(TOTAL - 1) * step
      tx.value = Math.max(min, Math.min(0, startTx.value + e.translationX))
    })
    .onEnd((e) => {
      const threshold = cardWidth / 3
      let next = idxSv.value
      if (e.translationX < -threshold && next < TOTAL - 1) next += 1
      else if (e.translationX > threshold && next > 0) next -= 1
      idxSv.value = next
      tx.value = withSpring(-(next * step), SPRING)
      runOnJS(setDotIndex)(next)
    })

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }))

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={pan}>
        <View style={[styles.clipper, { paddingHorizontal: PEEK }]}>
          <Animated.View style={[styles.track, animStyle]}>
            {cards.map((card, i) => (
              <View
                key={i}
                style={[
                  styles.card,
                  {
                    width: cardWidth,
                    backgroundColor: '#FFFFFF',
                    marginRight: i < TOTAL - 1 ? GAP : 0,
                  },
                ]}
              >
                <Text style={styles.icon}>{card.icon}</Text>
                <Text style={[styles.count, { color: colors.primary }]}>{card.count}</Text>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {card.title}
                </Text>
                <Text style={[styles.sub, { color: colors.textTertiary }]}>{card.sub}</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.dots}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === dotIndex
                ? { width: 16, backgroundColor: colors.primary }
                : { width: 6, backgroundColor: colors.border },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: theme.spacing.md,
  },
  clipper: {
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
  },
  card: {
    borderRadius: 20,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.cardPadding,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  icon: {
    fontSize: 28,
    lineHeight: 36,
  },
  count: {
    ...theme.typography.styles.h2,
  },
  cardTitle: {
    ...theme.typography.styles.h4,
  },
  sub: {
    ...theme.typography.styles.caption,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
})
