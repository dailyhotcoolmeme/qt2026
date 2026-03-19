import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface BadgeProps {
  label: string
  variant?: 'default' | 'primary' | 'success' | 'error' | 'warning'
  size?: 'sm' | 'md'
  style?: ViewStyle
}

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  style,
}: BadgeProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const getBgColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primaryLight
      case 'success':
        return colorScheme === 'dark' ? '#14532D' : '#DCFCE7'
      case 'error':
        return colorScheme === 'dark' ? '#450A0A' : '#FEE2E2'
      case 'warning':
        return colorScheme === 'dark' ? '#451A03' : '#FEF3C7'
      default:
        return colors.divider
    }
  }

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary
      case 'success':
        return colors.success
      case 'error':
        return colors.error
      case 'warning':
        return colors.warning
      default:
        return colors.textSecondary
    }
  }

  const isSm = size === 'sm'

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getBgColor(),
          paddingHorizontal: isSm ? 6 : 10,
          paddingVertical: isSm ? 2 : 4,
          borderRadius: isSm ? 4 : 6,
        },
        style,
      ]}
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      <Text
        style={[
          styles.label,
          {
            color: getTextColor(),
            fontSize: isSm ? theme.typography.fontSize.xs : theme.typography.fontSize.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: 16,
  },
})
