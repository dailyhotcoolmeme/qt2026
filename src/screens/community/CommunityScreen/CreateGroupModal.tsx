import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Switch,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Input } from 'src/components/common'
import { Button } from 'src/components/common'
import { theme } from 'src/theme'
import type { GroupInsert } from 'src/lib/types'

interface CreateGroupModalProps {
  visible: boolean
  isCreating: boolean
  onClose: () => void
  onCreate: (data: GroupInsert) => Promise<void>
}

export function CreateGroupModal({
  visible,
  isCreating,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [nameError, setNameError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) {
      setNameError('그룹 이름을 입력해주세요.')
      return
    }
    setNameError('')
    const data: GroupInsert = {
      name: name.trim(),
      description: description.trim() || null,
      is_public: isPublic,
      password: !isPublic && password.trim() ? password.trim() : null,
      slug: null,
      image_url: null,
      owner_id: '',
      member_count: 1,
      scope_leader_id: null,
      menu_config: null,
      menu_settings: null,
    }
    await onCreate(data)
    setName('')
    setDescription('')
    setIsPublic(true)
    setPassword('')
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'ios' ? insets.top + 8 : insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>새 그룹 만들기</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="그룹 이름 *"
            value={name}
            onChangeText={setName}
            placeholder="그룹 이름을 입력하세요"
            error={nameError}
            autoFocus
            returnKeyType="next"
          />
          <Input
            label="설명"
            value={description}
            onChangeText={setDescription}
            placeholder="그룹 소개를 간략히 입력하세요 (선택)"
            multiline
            numberOfLines={3}
            style={styles.inputGap}
          />
          <View style={[styles.switchRow, styles.inputGap]}>
            <View>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>공개 여부</Text>
              <Text style={[styles.switchHint, { color: colors.textTertiary }]}>
                {isPublic ? '누구나 참여할 수 있습니다' : '비밀번호가 있어야 참여 가능합니다'}
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>
          {!isPublic && (
            <Input
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="그룹 비밀번호를 설정하세요"
              secure
              style={styles.inputGap}
            />
          )}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            title="그룹 만들기"
            onPress={handleCreate}
            loading={isCreating}
            disabled={isCreating}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...theme.typography.styles.h3,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.screenPaddingH,
    padding: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: theme.spacing.screenPaddingH,
  },
  inputGap: {
    marginTop: theme.spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    ...theme.typography.styles.h4,
    marginBottom: 2,
  },
  switchHint: {
    ...theme.typography.styles.caption,
  },
  footer: {
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
  },
})
