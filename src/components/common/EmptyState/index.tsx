import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Button } from 'src/components/common/Button'
import { theme } from 'src/theme'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onPress: () => void
  }
  style?: ViewStyle
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="none"
      accessibilityLabel={`${title}${description ? '. ' + description : ''}`}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}
      {action && (
        <View style={styles.action}>
          <Button
            title={action.label}
            onPress={action.onPress}
            variant="primary"
            size="md"
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing['2xl'],
  },
  icon: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.styles.h3,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.styles.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: {
    marginTop: theme.spacing.lg,
  },
})
