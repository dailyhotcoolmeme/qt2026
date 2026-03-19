import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors } from 'src/theme'

export interface SlideData {
  id: string
  icon: string
  title: string
  subtitle: string
  accent: string
}

interface OnboardingSlideProps {
  slide: SlideData
  index: number
  scrollX: SharedValue<number>
  screenWidth: number
}

export function OnboardingSlide({
  slide,
  index,
  scrollX,
  screenWidth,
}: OnboardingSlideProps): React.JSX.Element {
  const { isDark } = useAppTheme()
  const scheme = isDark ? 'dark' : 'light'
  const c = colors[scheme]

  const inputRange = [
    (index - 1) * screenWidth,
    index * screenWidth,
    (index + 1) * screenWidth,
  ]

  const circleAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1.0, 0.8],
      Extrapolation.CLAMP,
    )
    return { transform: [{ scale }] }
  })

  const textAnimStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1.0, 0.3],
      Extrapolation.CLAMP,
    )
    return { opacity }
  })

  return (
    <View style={[styles.slide, { width: screenWidth }]}>
      {/* 이모지 + 원형 배경 (60%) */}
      <View style={styles.topArea}>
        <Animated.View
          style={[
            styles.circle,
            { backgroundColor: slide.accent },
            circleAnimStyle,
          ]}
        />
        <Ionicons name={slide.icon as never} size={80} color={slide.accent} />
      </View>

      {/* 제목 + 설명 (40%) */}
      <Animated.View style={[styles.bottomArea, textAnimStyle]}>
        <Text style={[styles.title, { color: c.textPrimary }]}>
          {slide.title}
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {slide.subtitle}
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topArea: {
    flex: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.15,
  },
  bottomArea: {
    flex: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
})
