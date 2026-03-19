import React from 'react'
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'

interface BaseRowProps {
  label: string
  description?: string
}

interface ToggleRowProps extends BaseRowProps {
  type: 'toggle'
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
}

interface ChevronRowProps extends BaseRowProps {
  type: 'chevron'
  onPress: () => void
  valueLabel?: string
  destructive?: boolean
}

interface ValueRowProps extends BaseRowProps {
  type: 'value'
  value: string
}

export type SettingsRowProps = ToggleRowProps | ChevronRowProps | ValueRowProps

export function SettingsRow(props: SettingsRowProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const labelColor =
    props.type === 'chevron' && props.destructive ? colors.error : colors.textPrimary

  const content = (
    <View style={styles.inner}>
      <View style={styles.labelWrap}>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {props.label}
        </Text>
        {props.description ? (
          <Text style={[styles.description, { color: colors.textTertiary }]} numberOfLines={1}>
            {props.description}
          </Text>
        ) : null}
      </View>
      {props.type === 'toggle' && (
        <Switch
          value={props.value}
          onValueChange={props.onValueChange}
          disabled={props.disabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
      )}
      {props.type === 'chevron' && (
        <View style={styles.chevronRight}>
          {props.valueLabel ? (
            <Text style={[styles.valueLabel, { color: colors.textTertiary }]}>
              {props.valueLabel}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      )}
      {props.type === 'value' && (
        <Text style={[styles.valueLabel, { color: colors.textTertiary }]}>{props.value}</Text>
      )}
    </View>
  )

  if (props.type === 'chevron') {
    return (
      <Pressable
        onPress={props.onPress}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={props.label}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  labelWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...theme.typography.styles.body,
  },
  description: {
    ...theme.typography.styles.caption,
  },
  chevronRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueLabel: {
    ...theme.typography.styles.bodySmall,
  },
})
