import React from 'react'
import {
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native'

interface KeyboardViewProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function KeyboardView({ children, style }: KeyboardViewProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.fill, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        {/* TouchableWithoutFeedback requires a single child */}
        <KeyboardAvoidingView style={styles.fill} pointerEvents="box-none">
          {children}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
})
