import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface SkeletonPulseProps {
  width: number | `${number}%`
  height?: number
}

export function SkeletonPulse({ width, height = 14 }: SkeletonPulseProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[styles.base, { width, height, backgroundColor: colors.shimmer, opacity }]}
    />
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 6,
    marginBottom: 10,
  },
})
