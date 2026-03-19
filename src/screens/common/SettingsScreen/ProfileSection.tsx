import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Avatar } from 'src/components/common'
import { Input } from 'src/components/common'
import { Button } from 'src/components/common'
import { theme } from 'src/theme'
import type { ProfileRow } from 'src/lib/types'

interface ProfileSectionProps {
  profile: ProfileRow | null
  isUpdating: boolean
  onUpdate: (data: { full_name?: string; avatar_url?: string }) => Promise<boolean>
}

export function ProfileSection({ profile, isUpdating, onUpdate }: ProfileSectionProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')

  const handleEditPress = () => {
    setFullName(profile?.full_name ?? '')
    setAvatarUrl(profile?.avatar_url ?? '')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    const success = await onUpdate({
      full_name: fullName.trim() || undefined,
      avatar_url: avatarUrl.trim() || undefined,
    })
    if (success) {
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <View style={[styles.editContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.avatarPreview}>
          <Avatar uri={avatarUrl || profile?.avatar_url} name={fullName || profile?.full_name} size={64} />
        </View>
        <Input
          label="이름"
          value={fullName}
          onChangeText={setFullName}
          placeholder="이름을 입력하세요"
          autoCapitalize="words"
          style={styles.input}
        />
        <Input
          label="아바타 URL"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
          style={styles.input}
        />
        <View style={styles.editButtons}>
          <Button
            title="취소"
            onPress={handleCancel}
            variant="outline"
            size="sm"
            style={styles.editBtn}
          />
          <Button
            title="저장"
            onPress={handleSave}
            variant="primary"
            size="sm"
            loading={isUpdating}
            style={styles.editBtn}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.profileContainer, { backgroundColor: colors.surface }]}>
      {isUpdating ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={64} />
      )}
      <View style={styles.profileInfo}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {profile?.full_name ?? '이름 없음'}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
          {profile?.email ?? ''}
        </Text>
      </View>
      <Pressable
        onPress={handleEditPress}
        style={({ pressed }) => [
          styles.editButton,
          { borderColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="프로필 수정"
      >
        <Text style={[styles.editButtonText, { color: colors.primary }]}>수정</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.screenPaddingH,
    gap: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...theme.typography.styles.h4,
  },
  email: {
    ...theme.typography.styles.bodySmall,
  },
  editButton: {
    borderWidth: 1,
    borderRadius: theme.spacing.borderRadiusSm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  editButtonText: {
    ...theme.typography.styles.label,
  },
  editContainer: {
    padding: theme.spacing.screenPaddingH,
    gap: theme.spacing.md,
  },
  avatarPreview: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  input: {
    marginBottom: 0,
  },
  editButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  editBtn: {
    minWidth: 80,
  },
})
