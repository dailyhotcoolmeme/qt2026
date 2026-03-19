import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import * as Haptics from 'expo-haptics'
import { theme } from 'src/theme'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
  fullWidth?: boolean
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  const handlePress = () => {
    if (variant === 'primary' || variant === 'destructive') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    onPress()
  }

  const containerStyle: ViewStyle = {
    backgroundColor:
      variant === 'primary'
        ? colors.primary
        : variant === 'secondary'
        ? colors.primaryLight
        : variant === 'destructive'
        ? colors.error
        : 'transparent',
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: variant === 'outline' ? colors.border : undefined,
    height:
      size === 'sm'
        ? theme.spacing.buttonHeightSm
        : size === 'lg'
        ? 60
        : theme.spacing.buttonHeight,
    paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.lg,
    alignSelf: fullWidth ? 'stretch' : 'auto',
  }

  const labelColor =
    variant === 'primary' || variant === 'destructive'
      ? colors.textInverse
      : variant === 'secondary'
      ? colors.primary
      : variant === 'ghost'
      ? colors.primary
      : colors.textPrimary

  const fontSize =
    size === 'sm'
      ? theme.typography.fontSize.sm
      : size === 'lg'
      ? theme.typography.fontSize.lg
      : theme.typography.fontSize.base

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        disabled || loading ? styles.disabled : undefined,
        pressed && !disabled && !loading ? styles.pressed : undefined,
        style,
      ]}
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={labelColor}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.label, { color: labelColor, fontSize }, textStyle]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: theme.typography.fontWeight.semiBold,
    lineHeight: 20,
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
})
