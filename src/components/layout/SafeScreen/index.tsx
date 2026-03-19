import React from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from 'src/theme'

interface SafeScreenProps {
  children: React.ReactNode
  style?: ViewStyle
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  backgroundColor?: string
  scrollable?: boolean
}

export function SafeScreen({
  children,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor,
  scrollable = false,
}: SafeScreenProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()

  const bg = backgroundColor ?? colors.background

  const paddingStyle: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  }

  if (scrollable) {
    return (
      <ScrollView
        style={[styles.fill, { backgroundColor: bg }]}
        contentContainerStyle={[paddingStyle, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        accessibilityRole="scrollbar"
      >
        {children}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.fill, { backgroundColor: bg }, paddingStyle, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
})
