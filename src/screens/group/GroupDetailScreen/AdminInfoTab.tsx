import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Share,
  Pressable,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Input, Button } from 'src/components/common'
import { theme } from 'src/theme'
import type { GroupRow, GroupUpdate } from 'src/lib/types'

interface AdminInfoTabProps {
  group: GroupRow
  onUpdateGroup: (data: GroupUpdate) => Promise<void>
}

export function AdminInfoTab({ group, onUpdateGroup }: AdminInfoTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()

  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')
  const [isPublic, setIsPublic] = useState(group.is_public)
  const [password, setPassword] = useState(group.password ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    try {
      await onUpdateGroup({
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        password: isPublic ? null : (password.trim() || null),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInvite = async () => {
    const link = `myamen://invite/${group.id}`
    try {
      await Share.share({ message: `'${group.name}' 모임에 초대합니다!\n${link}`, url: link })
    } catch {
      // 사용자 취소 무시
    }
  }

  const inviteLink = `myamen://invite/${group.id}`

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing['2xl'] }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>기본 정보</Text>
      <Input label="모임 이름" value={name} onChangeText={setName} placeholder="모임 이름" />
      <Input
        label="모임 설명"
        value={description}
        onChangeText={setDescription}
        placeholder="모임 소개"
        multiline
        numberOfLines={3}
        style={styles.gap}
      />
      <View style={[styles.switchRow, styles.gap, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>공개 모임</Text>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: colors.divider, true: colors.primary }}
          thumbColor={colors.background}
        />
      </View>
      {!isPublic && (
        <Input
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="비공개 모임 비밀번호"
          secure
          style={styles.gap}
        />
      )}
      <Button title="저장" onPress={handleSave} loading={isSaving} style={styles.gap} />

      <Text style={[styles.sectionTitle, styles.sectionGap, { color: colors.textPrimary }]}>
        초대 링크
      </Text>
      <Pressable
        onPress={handleInvite}
        style={({ pressed }) => [
          styles.linkBox,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="초대 링크 공유"
      >
        <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={1}>
          {inviteLink}
        </Text>
        <Ionicons name="share-outline" size={18} color={colors.primary} />
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: theme.spacing.screenPaddingH },
  sectionTitle: { ...theme.typography.styles.h3, marginBottom: theme.spacing.md },
  sectionGap: { marginTop: theme.spacing.xl },
  gap: { marginTop: theme.spacing.md },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  switchLabel: { ...theme.typography.styles.body },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    gap: theme.spacing.sm,
  },
  linkText: { ...theme.typography.styles.bodySmall, flex: 1, fontFamily: 'monospace' },
})
