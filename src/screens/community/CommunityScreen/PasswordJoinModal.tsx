import React from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { theme } from 'src/theme'

interface PasswordJoinModalProps {
  visible: boolean
  groupName: string | null
  password: string
  isJoining: boolean
  onChangePassword: (v: string) => void
  onConfirm: () => void
  onClose: () => void
}

export function PasswordJoinModal({
  visible,
  groupName,
  password,
  isJoining,
  onChangePassword,
  onConfirm,
  onClose,
}: PasswordJoinModalProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>비공개 모임</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              {groupName} 모임에 참여하려면 비밀번호를 입력하세요.
            </Text>
            <TextInput
              value={password}
              onChangeText={onChangePassword}
              placeholder="비밀번호"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={onConfirm}
              autoFocus
            />
            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.actionButton,
                  { borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>취소</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={isJoining || !password.trim()}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.confirmButton,
                  { backgroundColor: colors.primary },
                  (isJoining || !password.trim()) && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="참여"
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[styles.confirmText, { color: colors.textInverse }]}>참여</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.screenPaddingH,
  },
  card: {
    width: '100%',
    borderRadius: theme.spacing.borderRadius,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.styles.h3,
  },
  desc: {
    ...theme.typography.styles.bodySmall,
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.spacing.borderRadiusSm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    ...theme.typography.styles.body,
    marginTop: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.spacing.borderRadiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  confirmButton: {
    borderWidth: 0,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  cancelText: {
    ...theme.typography.styles.label,
  },
  confirmText: {
    ...theme.typography.styles.label,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
})
