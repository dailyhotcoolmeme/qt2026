import React, { useRef } from 'react'
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  onPress?: () => void
  shadow?: boolean
  padding?: number
  borderRadius?: number
}

export function Card({
  children,
  style,
  onPress,
  shadow = true,
  padding = theme.spacing.cardPadding,
  borderRadius = theme.spacing.borderRadius,
}: CardProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start()
  }

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius,
    padding,
  }

  const shadowStyle = shadow ? theme.shadows.card : theme.shadows.none

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.card, cardStyle, shadowStyle, style]}
          accessibilityRole="button"
        >
          {children}
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View style={[styles.card, cardStyle, shadowStyle, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
})
