import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { theme } from 'src/theme'
import type { SharingPost } from 'src/hooks/community/communityTypes'

interface PostFeedItemProps {
  post: SharingPost
  onPress: () => void
  onLike: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function PostFeedItem({ post, onPress, onLike }: PostFeedItemProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const displayName = post.profile?.full_name ?? post.profile?.username ?? '익명'
  const avatarUrl = post.profile?.avatar_url

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="게시글 보기"
    >
      {/* Author row */}
      <View style={styles.authorRow}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="person" size={16} color={colors.primary} />
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: colors.textPrimary }]}>{displayName}</Text>
          <Text style={[styles.timeText, { color: colors.textTertiary }]}>
            {timeAgo(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[styles.content, { color: colors.textPrimary }]} numberOfLines={4}>
        {post.content}
      </Text>

      {/* Image */}
      {post.image_url ? (
        <Image
          source={{ uri: post.image_url }}
          style={[styles.postImage, { backgroundColor: colors.shimmer }]}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.divider }]}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation()
            onLike()
          }}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={post.is_liked ? '좋아요 취소' : '좋아요'}
          hitSlop={8}
        >
          <Ionicons
            name={post.is_liked ? 'heart' : 'heart-outline'}
            size={18}
            color={post.is_liked ? colors.error : colors.textTertiary}
          />
          {post.like_count > 0 && (
            <Text
              style={[
                styles.actionCount,
                { color: post.is_liked ? colors.error : colors.textTertiary },
              ]}
            >
              {post.like_count}
            </Text>
          )}
        </Pressable>
        <View style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
          {post.comment_count > 0 && (
            <Text style={[styles.actionCount, { color: colors.textTertiary }]}>
              {post.comment_count}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.screenPaddingH,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius,
    borderWidth: 1,
    padding: theme.spacing.cardPadding,
  },
  pressed: {
    opacity: 0.85,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfo: {
    flex: 1,
    gap: 1,
  },
  authorName: {
    ...theme.typography.styles.label,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  timeText: {
    ...theme.typography.styles.caption,
  },
  content: {
    ...theme.typography.styles.body,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.spacing.borderRadiusSm,
    marginBottom: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    ...theme.typography.styles.caption,
  },
})
