import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from 'src/lib/supabase'
import { Avatar, Loading, EmptyState } from 'src/components/common'
import { theme } from 'src/theme'
import { useAuthStore } from 'src/stores/authStore'
import type { ProfileRow } from 'src/lib/types'

interface SocialTabProps {
  groupId: string
}

interface GroupPostRow {
  id: string
  group_id: string
  user_id: string
  content: string
  image_url: string | null
  like_count: number
  comment_count: number
  created_at: string
}

type PostItem = GroupPostRow & { profile: ProfileRow | null; liked: boolean }

export function SocialTab({ groupId }: SocialTabProps) {
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)

  const [posts, setPosts] = useState<PostItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchPosts = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('group_posts')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
      if (error) throw error

      const rows = (data ?? []) as GroupPostRow[]
      if (rows.length === 0) {
        setPosts([])
        return
      }

      const userIds = [...new Set(rows.map((r) => r.user_id))]
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
      const profileMap = new Map<string, ProfileRow>(
        ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]),
      )

      let likedIds = new Set<string>()
      if (user) {
        const postIds = rows.map((r) => r.id)
        const { data: likes } = await supabase
          .from('group_post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds)
        likedIds = new Set(((likes ?? []) as { post_id: string }[]).map((l) => l.post_id))
      }

      setPosts(
        rows.map((r) => ({
          ...r,
          profile: profileMap.get(r.user_id) ?? null,
          liked: likedIds.has(r.id),
        })),
      )
    } catch (e) {
      console.error('[SocialTab]', e)
    } finally {
      setIsLoading(false)
    }
  }, [groupId, user])

  useEffect(() => {
    void fetchPosts()
    const channel = supabase
      .channel(`social-tab-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_posts', filter: `group_id=eq.${groupId}` }, () => void fetchPosts())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [groupId, fetchPosts])

  const handleLike = async (post: PostItem) => {
    if (!user) return
    try {
      if (post.liked) {
        await supabase
          .from('group_post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, liked: false, like_count: Math.max(0, p.like_count - 1) } : p)),
        )
      } else {
        await supabase.from('group_post_likes').insert({ post_id: post.id, user_id: user.id } as never)
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, liked: true, like_count: p.like_count + 1 } : p)),
        )
      }
    } catch (e) {
      console.error('[SocialTab like]', e)
    }
  }

  const handlePost = async () => {
    if (!user || !postContent.trim()) {
      Alert.alert('필수 항목', '내용을 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      const { error } = await supabase.from('group_posts').insert({
        group_id: groupId,
        user_id: user.id,
        content: postContent.trim(),
        image_url: null,
        like_count: 0,
        comment_count: 0,
      } as never)
      if (error) throw error
      setPostContent('')
      setModalVisible(false)
    } catch (e) {
      console.error('[SocialTab post]', e)
      Alert.alert('오류', '게시에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const renderItem = ({ item }: ListRenderItemInfo<PostItem>) => (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.itemHeader}>
        <Avatar uri={item.profile?.avatar_url} name={item.profile?.full_name} size={36} />
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: colors.textPrimary }]}>
            {item.profile?.full_name ?? '알 수 없음'}
          </Text>
          <Text style={[styles.itemDate, { color: colors.textTertiary }]}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      <Text style={[styles.itemContent, { color: colors.textPrimary }]}>{item.content}</Text>
      <View style={styles.itemFooter}>
        <Pressable style={styles.footerAction} onPress={() => void handleLike(item)}>
          <Ionicons
            name={item.liked ? 'heart' : 'heart-outline'}
            size={18}
            color={item.liked ? colors.error : colors.textTertiary}
          />
          <Text style={[styles.actionCount, { color: colors.textTertiary }]}>{item.like_count}</Text>
        </Pressable>
        <View style={styles.footerAction}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.actionCount, { color: colors.textTertiary }]}>{item.comment_count}</Text>
        </View>
      </View>
    </View>
  )

  if (isLoading) return <Loading />

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="newspaper-outline" size={40} color={colors.textTertiary} />}
            title="게시글이 없습니다"
            description="그룹 소식을 나눠보세요"
          />
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="게시글 작성"
      >
        <Ionicons name="create-outline" size={24} color={colors.textInverse} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>게시글 작성</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.inputContent, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.inputBorder }]}
                placeholder="그룹과 나눌 이야기를 적어보세요..."
                placeholderTextColor={colors.inputPlaceholder}
                value={postContent}
                onChangeText={setPostContent}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                autoFocus
              />
              <Pressable
                style={[styles.saveButton, { backgroundColor: isSaving ? colors.textTertiary : colors.primary }]}
                onPress={handlePost}
                disabled={isSaving}
              >
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  {isSaving ? '게시 중...' : '게시하기'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: theme.spacing.screenPaddingH, gap: theme.spacing.sm, flexGrow: 1 },
  item: { borderRadius: theme.spacing.borderRadius, borderWidth: 1, padding: theme.spacing.md, gap: theme.spacing.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  authorInfo: { flex: 1 },
  authorName: { ...theme.typography.styles.label, fontWeight: theme.typography.fontWeight.semiBold },
  itemDate: { ...theme.typography.styles.caption },
  itemContent: { ...theme.typography.styles.body },
  itemFooter: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xs },
  footerAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { ...theme.typography.styles.caption },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.screenPaddingH, paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { ...theme.typography.styles.h4 },
  modalBody: { padding: theme.spacing.screenPaddingH, gap: theme.spacing.sm },
  inputContent: { borderRadius: theme.spacing.borderRadiusSm, borderWidth: 1, padding: theme.spacing.md, height: 120, ...theme.typography.styles.body },
  saveButton: { height: theme.spacing.buttonHeight, borderRadius: theme.spacing.borderRadius, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xs },
  saveButtonText: { ...theme.typography.styles.button },
})
