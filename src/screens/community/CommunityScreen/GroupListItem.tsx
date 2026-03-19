import React from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import type { GroupRow } from 'src/lib/types'

interface GroupListItemProps {
  group: GroupRow
  isMyGroup: boolean
  isJoining: boolean
  onJoin: () => void
  onPress: () => void
}

export function GroupListItem({
  group,
  isMyGroup,
  isJoining,
  onJoin,
  onPress,
}: GroupListItemProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${group.name} 그룹`}
    >
      {group.image_url ? (
        <Image
          source={{ uri: group.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="people" size={24} color={colors.primary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {group.name}
        </Text>
        {group.description ? (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {group.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {group.member_count}명
          </Text>
          {!group.is_public && (
            <Ionicons
              name="lock-closed-outline"
              size={12}
              color={colors.textTertiary}
              style={styles.lockIcon}
            />
          )}
        </View>
      </View>
      {!isMyGroup && (
        <Pressable
          onPress={onJoin}
          disabled={isJoining}
          style={({ pressed }) => [
            styles.joinButton,
            { backgroundColor: colors.primary },
            pressed && styles.joinPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="신청하러 가기"
        >
          {isJoining ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={[styles.joinText, { color: colors.textInverse }]}>신청하러 가기</Text>
          )}
        </Pressable>
      )}
      {isMyGroup && (
        <View style={[styles.joinedBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.joinedText, { color: colors.primary }]}>참여 중</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.screenPaddingH,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  imagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    gap: 2,
  },
  name: {
    ...theme.typography.styles.h4,
  },
  description: {
    ...theme.typography.styles.bodySmall,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  metaText: {
    ...theme.typography.styles.caption,
  },
  lockIcon: {
    marginLeft: 4,
  },
  joinButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.spacing.borderRadiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinPressed: {
    opacity: 0.8,
  },
  joinText: {
    ...theme.typography.styles.label,
  },
  joinedBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.spacing.borderRadiusSm,
  },
  joinedText: {
    ...theme.typography.styles.caption,
    fontWeight: theme.typography.fontWeight.medium,
  },
})
