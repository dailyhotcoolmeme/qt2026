import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface DividerProps {
  label?: string
  style?: ViewStyle
  color?: string
}

export function Divider({ label, style, color }: DividerProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const lineColor = color ?? colors.divider

  if (label) {
    return (
      <View style={[styles.row, style]} accessibilityRole="none">
        <View style={[styles.line, { backgroundColor: lineColor }]} />
        <Text style={[styles.label, { color: colors.textTertiary }]}>
          {label}
        </Text>
        <View style={[styles.line, { backgroundColor: lineColor }]} />
      </View>
    )
  }

  return (
    <View
      style={[styles.solo, { backgroundColor: lineColor }, style]}
      accessibilityRole="none"
      accessible={false}
    />
  )
}

const styles = StyleSheet.create({
  solo: {
    height: 1,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    ...theme.typography.styles.caption,
    flexShrink: 0,
  },
})
