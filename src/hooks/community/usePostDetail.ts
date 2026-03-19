import { useState, useCallback, useEffect } from 'react'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { SharingPost, PostComment } from './communityTypes'

export interface UsePostDetailResult {
  post: SharingPost | null
  comments: PostComment[]
  isLoading: boolean
  isSubmitting: boolean
  toggleLike: () => Promise<void>
  addComment: (content: string) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function usePostDetail(postId: string): UsePostDetailResult {
  const { user } = useAuthStore()
  const [post, setPost] = useState<SharingPost | null>(null)
  const [comments, setComments] = useState<PostComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*, profile:profiles(full_name, avatar_url, username)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (error) throw error
      setComments((data ?? []) as unknown as PostComment[])
    } catch (e) {
      console.error('[usePostDetail] fetchComments error:', e)
    }
  }, [postId])

  const fetchPost = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('sharing_posts')
        .select('*, profile:profiles(full_name, avatar_url, username)')
        .eq('id', postId)
        .single()
      if (error) throw error

      const p = data as unknown as SharingPost
      if (user) {
        const { data: likeRow } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle()
        p.is_liked = !!likeRow
      }
      setPost(p)
    } catch (e) {
      console.error('[usePostDetail] fetchPost error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [postId, user])

  useEffect(() => {
    void fetchPost()
    void fetchComments()
  }, [fetchPost, fetchComments])

  const toggleLike = useCallback(async () => {
    if (!user || !post) return
    const wasLiked = post.is_liked
    setPost((prev) =>
      prev
        ? { ...prev, is_liked: !wasLiked, like_count: prev.like_count + (wasLiked ? -1 : 1) }
        : prev,
    )
    try {
      if (wasLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id } as any)
      }
    } catch (e) {
      console.error('[usePostDetail] toggleLike error:', e)
      setPost((prev) =>
        prev
          ? { ...prev, is_liked: wasLiked, like_count: prev.like_count + (wasLiked ? 1 : -1) }
          : prev,
      )
    }
  }, [user, post, postId])

  const addComment = useCallback(
    async (content: string) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      setIsSubmitting(true)
      try {
        const { error } = await supabase.from('post_comments').insert({
          post_id: postId,
          user_id: user.id,
          content,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        if (error) throw error
        setPost((prev) =>
          prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev,
        )
        await fetchComments()
      } finally {
        setIsSubmitting(false)
      }
    },
    [user, postId, fetchComments],
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      try {
        const { error } = await supabase
          .from('post_comments')
          .delete()
          .eq('id', commentId)
          .eq('user_id', user.id)
        if (error) throw error
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        setPost((prev) =>
          prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : prev,
        )
      } catch (e) {
        console.error('[usePostDetail] deleteComment error:', e)
      }
    },
    [user],
  )

  return {
    post,
    comments,
    isLoading,
    isSubmitting,
    toggleLike,
    addComment,
    deleteComment,
    refresh: fetchPost,
  }
}
