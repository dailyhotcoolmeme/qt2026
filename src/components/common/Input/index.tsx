import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'

interface InputProps {
  value: string
  onChangeText: (text: string) => void
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  secure?: boolean
  multiline?: boolean
  numberOfLines?: number
  disabled?: boolean
  style?: ViewStyle
  inputStyle?: TextStyle
  autoCapitalize?: TextInputProps['autoCapitalize']
  keyboardType?: TextInputProps['keyboardType']
  returnKeyType?: TextInputProps['returnKeyType']
  onSubmitEditing?: () => void
  autoFocus?: boolean
}

export function Input({
  value,
  onChangeText,
  label,
  placeholder,
  error,
  hint,
  leftIcon,
  rightIcon,
  secure = false,
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  style,
  inputStyle,
  autoCapitalize,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  autoFocus = false,
}: InputProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const [focused, setFocused] = useState(false)
  const [secureVisible, setSecureVisible] = useState(false)
  const borderAnim = useRef(new Animated.Value(0)).current

  const handleFocus = () => {
    setFocused(true)
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start()
  }

  const handleBlur = () => {
    setFocused(false)
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start()
  }

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.error : colors.inputBorder,
      error ? colors.error : colors.primary,
    ],
  })

  const showRightIcon = secure || rightIcon

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text
          style={[styles.label, { color: colors.textSecondary }]}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.inputBackground,
            borderColor,
          },
          disabled && styles.containerDisabled,
          multiline && styles.containerMultiline,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          secureTextEntry={secure && !secureVisible}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          editable={!disabled}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            { color: colors.inputText },
            leftIcon ? styles.inputWithLeft : undefined,
            showRightIcon ? styles.inputWithRight : undefined,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          accessibilityLabel={label ?? placeholder}
          accessibilityState={{ disabled }}
        />
        {showRightIcon && (
          <View style={styles.rightIcon}>
            {secure ? (
              <Pressable
                onPress={() => setSecureVisible((v) => !v)}
                accessibilityLabel={secureVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons
                  name={secureVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            ) : (
              rightIcon
            )}
          </View>
        )}
      </Animated.View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]} accessibilityRole="text">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.textTertiary }]} accessibilityRole="text">
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    ...theme.typography.styles.label,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.spacing.borderRadiusSm,
    height: theme.spacing.inputHeight,
    paddingHorizontal: theme.spacing.md,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  containerMultiline: {
    height: 'auto',
    minHeight: theme.spacing.inputHeight,
    paddingVertical: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    ...theme.typography.styles.body,
    padding: 0,
  },
  inputWithLeft: {
    marginLeft: theme.spacing.sm,
  },
  inputWithRight: {
    marginRight: theme.spacing.sm,
  },
  inputMultiline: {
    textAlignVertical: 'top',
  },
  leftIcon: {
    marginRight: 0,
  },
  rightIcon: {
    marginLeft: 0,
  },
  errorText: {
    ...theme.typography.styles.caption,
  },
  hintText: {
    ...theme.typography.styles.caption,
  },
})
