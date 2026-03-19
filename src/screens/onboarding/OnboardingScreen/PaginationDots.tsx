import React from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

interface PaginationDotsProps {
  count: number
  scrollX: SharedValue<number>
  screenWidth: number
  activeColor: string
}

interface DotProps {
  dotIndex: number
  scrollX: SharedValue<number>
  screenWidth: number
  activeColor: string
}

function Dot({
  dotIndex,
  scrollX,
  screenWidth,
  activeColor,
}: DotProps): React.JSX.Element {
  const inputRange = [
    (dotIndex - 1) * screenWidth,
    dotIndex * screenWidth,
    (dotIndex + 1) * screenWidth,
  ]

  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP,
    )
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1.0, 0.3],
      Extrapolation.CLAMP,
    )
    return { width, opacity }
  })

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: activeColor },
        dotStyle,
      ]}
    />
  )
}

export function PaginationDots({
  count,
  scrollX,
  screenWidth,
  activeColor,
}: PaginationDotsProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <Dot
          key={i}
          dotIndex={i}
          scrollX={scrollX}
          screenWidth={screenWidth}
          activeColor={activeColor}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
})
