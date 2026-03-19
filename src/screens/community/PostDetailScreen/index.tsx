import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ListRenderItemInfo,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { Loading } from 'src/components/common'
import { theme } from 'src/theme'
import { usePostDetail } from 'src/hooks/community/usePostDetail'
import { useAuthStore } from 'src/stores/authStore'
import type { PostComment } from 'src/hooks/community/communityTypes'

type PostDetailRouteParams = { postId: string }
type PostDetailRoute = RouteProp<{ PostDetail: PostDetailRouteParams }, 'PostDetail'>

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

export default function PostDetailScreen() {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const route = useRoute<PostDetailRoute>()
  const { user } = useAuthStore()
  const { postId } = route.params

  const { post, comments, isLoading, isSubmitting, toggleLike, addComment, deleteComment } =
    usePostDetail(postId)

  const [commentText, setCommentText] = useState('')
  const inputRef = useRef<TextInput>(null)

  const handleSubmitComment = useCallback(async () => {
    const trimmed = commentText.trim()
    if (!trimmed) return
    try {
      await addComment(trimmed)
      setCommentText('')
      inputRef.current?.blur()
    } catch (e) {
      console.error('[PostDetailScreen] addComment error:', e)
    }
  }, [commentText, addComment])

  const handleDeleteComment = useCallback(
    (comment: PostComment) => {
      if (comment.user_id !== user?.id) return
      Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => void deleteComment(comment.id),
        },
      ])
    },
    [user, deleteComment],
  )

  const renderComment = useCallback(
    ({ item }: ListRenderItemInfo<PostComment>) => {
      const name = item.profile?.full_name ?? item.profile?.username ?? '익명'
      const avatar = item.profile?.avatar_url
      const isMine = item.user_id === user?.id
      return (
        <View style={styles.commentItem}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.commentAvatar}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.commentAvatar,
                styles.avatarFallback,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="person" size={12} color={colors.primary} />
            </View>
          )}
          <View style={styles.commentBody}>
            <View style={styles.commentMeta}>
              <Text style={[styles.commentAuthor, { color: colors.textPrimary }]}>{name}</Text>
              <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
                {timeAgo(item.created_at)}
              </Text>
              {isMine && (
                <Pressable
                  onPress={() => handleDeleteComment(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="댓글 삭제"
                >
                  <Ionicons name="trash-outline" size={13} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
            <Text style={[styles.commentContent, { color: colors.textSecondary }]}>
              {item.content}
            </Text>
          </View>
        </View>
      )
    },
    [user, colors, handleDeleteComment],
  )

  const postAuthorName = post?.profile?.full_name ?? post?.profile?.username ?? '익명'
  const postAvatarUrl = post?.profile?.avatar_url

  const listHeader = post ? (
    <View style={styles.postSection}>
      {/* Back + author */}
      <View style={[styles.navRow, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>나눔</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.postAuthorRow}>
        {postAvatarUrl ? (
          <Image
            source={{ uri: postAvatarUrl }}
            style={styles.postAvatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[styles.postAvatar, styles.avatarFallback, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
        )}
        <View style={styles.postAuthorInfo}>
          <Text style={[styles.postAuthorName, { color: colors.textPrimary }]}>
            {postAuthorName}
          </Text>
          <Text style={[styles.postTime, { color: colors.textTertiary }]}>
            {timeAgo(post.created_at)}
          </Text>
        </View>
      </View>

      <Text style={[styles.postContent, { color: colors.textPrimary }]}>{post.content}</Text>

      {post.image_url ? (
        <Image
          source={{ uri: post.image_url }}
          style={[styles.postImage, { backgroundColor: colors.shimmer }]}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {/* Like row */}
      <View style={[styles.likeRow, { borderColor: colors.border }]}>
        <Pressable
          onPress={() => void toggleLike()}
          style={styles.likeButton}
          accessibilityRole="button"
          accessibilityLabel={post.is_liked ? '좋아요 취소' : '좋아요'}
          hitSlop={8}
        >
          <Ionicons
            name={post.is_liked ? 'heart' : 'heart-outline'}
            size={22}
            color={post.is_liked ? colors.error : colors.textTertiary}
          />
          <Text
            style={[
              styles.likeCount,
              { color: post.is_liked ? colors.error : colors.textTertiary },
            ]}
          >
            {post.like_count > 0 ? `좋아요 ${post.like_count}` : '좋아요'}
          </Text>
        </Pressable>
        <View style={styles.commentCountRow}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
          <Text style={[styles.commentCountText, { color: colors.textTertiary }]}>
            댓글 {post.comment_count}
          </Text>
        </View>
      </View>

      <Text style={[styles.commentSectionLabel, { color: colors.textPrimary }]}>댓글</Text>
    </View>
  ) : null

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text style={[styles.emptyComments, { color: colors.textTertiary }]}>
            첫 번째 댓글을 남겨보세요
          </Text>
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: theme.spacing.sm }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Comment input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="댓글을 입력하세요..."
          placeholderTextColor={colors.inputPlaceholder}
          style={[
            styles.commentInput,
            { backgroundColor: colors.inputBackground, color: colors.inputText },
          ]}
          returnKeyType="send"
          onSubmitEditing={() => void handleSubmitComment()}
          blurOnSubmit={false}
          multiline
        />
        <Pressable
          onPress={() => void handleSubmitComment()}
          disabled={isSubmitting || !commentText.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: colors.primary },
            (isSubmitting || !commentText.trim()) && styles.sendDisabled,
            pressed && styles.sendPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="댓글 전송"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Ionicons name="send" size={18} color={colors.textInverse} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  postSection: {
    paddingHorizontal: theme.spacing.screenPaddingH,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 32,
    alignItems: 'center',
  },
  navTitle: {
    ...theme.typography.styles.h4,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAuthorInfo: {
    flex: 1,
    gap: 2,
  },
  postAuthorName: {
    ...theme.typography.styles.h4,
  },
  postTime: {
    ...theme.typography.styles.caption,
  },
  postContent: {
    ...theme.typography.styles.body,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: theme.spacing.borderRadius,
    marginBottom: theme.spacing.md,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    ...theme.typography.styles.label,
  },
  commentCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentCountText: {
    ...theme.typography.styles.label,
  },
  commentSectionLabel: {
    ...theme.typography.styles.h4,
    marginBottom: theme.spacing.sm,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  commentBody: {
    flex: 1,
    gap: 3,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthor: {
    ...theme.typography.styles.label,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  commentTime: {
    ...theme.typography.styles.caption,
    flex: 1,
  },
  commentContent: {
    ...theme.typography.styles.bodySmall,
    lineHeight: 20,
  },
  emptyComments: {
    ...theme.typography.styles.body,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.screenPaddingH,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.screenPaddingH,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderRadius: theme.spacing.borderRadiusSm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    ...theme.typography.styles.body,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendPressed: {
    opacity: 0.8,
  },
})
