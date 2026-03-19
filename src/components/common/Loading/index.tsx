import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface LoadingProps {
  size?: 'small' | 'large'
  fullScreen?: boolean
}

export function Loading({ size = 'large', fullScreen = false }: LoadingProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size={size} color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
