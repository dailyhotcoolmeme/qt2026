import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Switch,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from 'src/theme'
import { Input, Button } from 'src/components/common'

interface AddPrayerModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: { title: string; content: string; isPublic: boolean }) => Promise<void>
  isSubmitting: boolean
}

export function AddPrayerModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: AddPrayerModalProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [titleError, setTitleError] = useState('')

  const handleClose = () => {
    setTitle('')
    setContent('')
    setIsPublic(false)
    setTitleError('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setTitleError('기도 제목을 입력해주세요.')
      return
    }
    setTitleError('')
    await onSubmit({ title: title.trim(), content: content.trim(), isPublic })
    setTitle('')
    setContent('')
    setIsPublic(false)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top + theme.spacing.md,
              paddingBottom: insets.bottom + theme.spacing.md,
            },
          ]}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityLabel="닫기"
              accessibilityRole="button"
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>취소</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              기도 제목 추가
            </Text>
            <View style={styles.headerRight} />
          </View>

          {/* 입력 폼 */}
          <View style={styles.form}>
            <Input
              label="제목 *"
              value={title}
              onChangeText={setTitle}
              placeholder="기도 제목을 입력하세요"
              error={titleError}
              autoFocus
              returnKeyType="next"
            />

            <Input
              label="내용 (선택)"
              value={content}
              onChangeText={setContent}
              placeholder="구체적인 기도 내용을 적어보세요"
              multiline
              numberOfLines={4}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                  공개 기도 제목
                </Text>
                <Text style={[styles.switchDesc, { color: colors.textTertiary }]}>
                  다른 사람들이 함께 기도할 수 있어요
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
                accessibilityLabel="공개 여부"
              />
            </View>
          </View>

          {/* 저장 버튼 */}
          <Button
            title="저장"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenPaddingH,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...theme.typography.styles.h4,
  },
  cancelText: {
    ...theme.typography.styles.body,
  },
  headerRight: {
    width: 32,
  },
  form: {
    gap: theme.spacing.md,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  switchLabel: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    ...theme.typography.styles.body,
    fontWeight: theme.typography.fontWeight.medium,
  },
  switchDesc: {
    ...theme.typography.styles.caption,
  },
})
