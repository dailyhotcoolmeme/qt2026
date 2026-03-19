import React, { useCallback, useState } from 'react'
import { View, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated'

const CARD_RATIO = 0.76
const SWIPE_THRESHOLD = 80
const VELOCITY_THRESHOLD = 500

export interface SwipeCardContainerProps {
  currentDate: string
  onDateChange: (date: string) => void
  renderCard: (date: string, isCenter: boolean) => React.ReactNode
}

function offsetDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function SwipeCardContainer({
  currentDate,
  onDateChange,
  renderCard,
}: SwipeCardContainerProps) {
  const { width: screenWidth } = useWindowDimensions()
  const cardWidth = screenWidth * CARD_RATIO
  const cardLeft = (screenWidth - cardWidth) / 2

  const [cardHeight, setCardHeight] = useState(0)

  const hintHeight = cardHeight * 0.85
  const hintTop = (cardHeight - hintHeight) / 2   // 메인카드 기준 수직 중앙
  const hintOffset = -(cardWidth - cardLeft / 2 + 3)

  const opacity = useSharedValue(1)
  const translateX = useSharedValue(0)
  const transitioning = useSharedValue(false)

  const animateTransition = useCallback(
    (direction: 1 | -1, newDate: string) => {
      if (transitioning.value) return
      transitioning.value = true

      const exitX = 20 * direction
      const enterX = -20 * direction

      opacity.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(onDateChange)(newDate)
        translateX.value = enterX
        opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.ease) })
        translateX.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) }, () => {
          transitioning.value = false
        })
      })
      translateX.value = withTiming(exitX, { duration: 150, easing: Easing.out(Easing.ease) })
    },
    [onDateChange, opacity, translateX, transitioning],
  )

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      if (transitioning.value) return
      translateX.value = e.translationX * 0.18
    })
    .onEnd((e) => {
      if (transitioning.value) return
      const tx = e.translationX
      const vx = e.velocityX
      if (tx > SWIPE_THRESHOLD || (tx > 30 && vx > VELOCITY_THRESHOLD)) {
        animateTransition(1, offsetDate(currentDate, -1))
      } else if (tx < -SWIPE_THRESHOLD || (tx < -30 && vx < -VELOCITY_THRESHOLD)) {
        animateTransition(-1, offsetDate(currentDate, 1))
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 })
      }
    })

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <View
      style={{ width: screenWidth, overflow: 'visible', alignItems: 'center' }}
    >
      {/* 왼쪽 힌트카드 */}
      {cardHeight > 0 && (
        <View
          style={{
            position: 'absolute',
            left: hintOffset,
            top: hintTop,
            width: cardWidth,
            height: hintHeight,
            borderRadius: 32,
            backgroundColor: '#FFFFFF',
            opacity: 0.65,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.04,
            shadowRadius: 20,
            elevation: 4,
          }}
          pointerEvents="none"
        />
      )}

      {/* 메인카드 — 동적 높이 */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          style={[
            { width: cardWidth, zIndex: 10 },
            cardAnimStyle,
          ]}
        >
          {renderCard(currentDate, true)}
        </Animated.View>
      </GestureDetector>

      {/* 오른쪽 힌트카드 */}
      {cardHeight > 0 && (
        <View
          style={{
            position: 'absolute',
            right: hintOffset,
            top: hintTop,
            width: cardWidth,
            height: hintHeight,
            borderRadius: 32,
            backgroundColor: '#FFFFFF',
            opacity: 0.65,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.04,
            shadowRadius: 20,
            elevation: 4,
          }}
          pointerEvents="none"
        />
      )}
    </View>
  )
}
