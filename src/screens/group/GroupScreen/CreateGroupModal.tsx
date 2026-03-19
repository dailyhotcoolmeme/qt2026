import React, { useState, useCallback } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import type { GroupRow } from 'src/lib/types'

interface CreateGroupModalProps {
  visible: boolean
  onClose: () => void
  onCreate: (data: { name: string; description: string | null; is_public: boolean }) => Promise<GroupRow>
}

export function CreateGroupModal({ visible, onClose, onCreate }: CreateGroupModalProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    setName(''); setDescription(''); setIsPublic(true); setError(null)
    onClose()
  }, [onClose])

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { setError('그룹 이름을 입력해주세요.'); return }
    setError(null)
    setIsSaving(true)
    try {
      await onCreate({ name: name.trim(), description: description.trim() || null, is_public: isPublic })
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '그룹 생성에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }, [name, description, isPublic, onCreate, handleClose])

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>새 그룹 만들기</Text>
            <Pressable onPress={handleClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: error && !name.trim() ? colors.error : colors.inputBorder }]}
              placeholder="그룹 이름 *"
              placeholderTextColor={colors.inputPlaceholder}
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={50}
            />
            <TextInput
              style={[styles.inputDesc, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
              placeholder="그룹 소개 (선택)"
              placeholderTextColor={colors.inputPlaceholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
            />
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>공개 그룹</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: colors.divider, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>
            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            ) : null}
            <Pressable
              style={[styles.createButton, { backgroundColor: isSaving ? colors.textTertiary : colors.primary }]}
              onPress={handleCreate}
              disabled={isSaving}
              accessibilityRole="button"
            >
              {isSaving
                ? <ActivityIndicator color={colors.textInverse} />
                : <Text style={[styles.createButtonText, { color: colors.textInverse }]}>그룹 만들기</Text>
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { ...theme.typography.styles.h4 },
  body: { padding: theme.spacing.screenPaddingH, gap: theme.spacing.sm },
  input: {
    height: theme.spacing.inputHeight,
    borderRadius: theme.spacing.borderRadiusSm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.styles.body,
  },
  inputDesc: {
    borderRadius: theme.spacing.borderRadiusSm,
    borderWidth: 1,
    padding: theme.spacing.md,
    height: 80,
    ...theme.typography.styles.body,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  switchLabel: { ...theme.typography.styles.body },
  errorText: { ...theme.typography.styles.bodySmall },
  createButton: {
    height: theme.spacing.buttonHeight,
    borderRadius: theme.spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  createButtonText: { ...theme.typography.styles.button },
})
