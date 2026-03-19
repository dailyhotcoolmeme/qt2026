import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { SharingPost } from './communityTypes'

const PAGE_SIZE = 15

export interface UsePostFeedResult {
  posts: SharingPost[]
  isLoading: boolean
  isRefreshing: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  toggleLike: (postId: string) => Promise<void>
  createPost: (content: string, groupId?: string) => Promise<void>
}

export function usePostFeed(): UsePostFeedResult {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState<SharingPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const isFetchingRef = useRef(false)

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!user) { setIsLoading(false); setIsRefreshing(false); return }
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      if (reset) setIsRefreshing(true)
      else setIsLoading(true)

      const page = reset ? 0 : pageRef.current
      try {
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data, error } = await supabase
          .from('sharing_posts')
          .select('*, profile:profiles(full_name, avatar_url, username)')
          .order('created_at', { ascending: false })
          .range(from, to)

        if (error) throw error

        const fetched = (data ?? []) as unknown as SharingPost[]

        if (fetched.length > 0) {
          const postIds = fetched.map((p) => p.id)
          const { data: likeData } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds)

          const likedSet = new Set(
            ((likeData ?? []) as { post_id: string }[]).map((l) => l.post_id),
          )
          fetched.forEach((p) => {
            p.is_liked = likedSet.has(p.id)
          })
        }

        if (reset) {
          setPosts(fetched)
          pageRef.current = 1
        } else {
          setPosts((prev) => [...prev, ...fetched])
          pageRef.current = page + 1
        }
        setHasMore(fetched.length === PAGE_SIZE)
      } catch (e) {
        console.error('[usePostFeed] fetchPage error:', e)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
        isFetchingRef.current = false
      }
    },
    [user],
  )

  const refresh = useCallback(() => fetchPage(true), [fetchPage])
  const loadMore = useCallback(() => {
    if (!hasMore) return Promise.resolve()
    return fetchPage(false)
  }, [hasMore, fetchPage])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) return
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      const wasLiked = post.is_liked
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
            : p,
        ),
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
        console.error('[usePostFeed] toggleLike error:', e)
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, is_liked: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }
              : p,
          ),
        )
      }
    },
    [user, posts],
  )

  const createPost = useCallback(
    async (content: string, groupId?: string) => {
      if (!user) throw new Error('로그인이 필요합니다.')

      // 그룹 게시글인 경우 멤버십 확인
      if (groupId) {
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (memberError || !memberData) {
          throw new Error('해당 그룹의 멤버가 아닙니다.')
        }
      }

      const { error } = await supabase.from('sharing_posts').insert({
        user_id: user.id,
        content,
        group_id: groupId ?? null,
        image_url: null,
        like_count: 0,
        comment_count: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      if (error) throw error
      await refresh()
    },
    [user, refresh],
  )

  return { posts, isLoading, isRefreshing, hasMore, loadMore, refresh, toggleLike, createPost }
}
