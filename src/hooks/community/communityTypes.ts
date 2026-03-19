// ================================
// Community 전용 타입 (sharing_posts / post_comments / post_likes)
// ================================

export interface PostProfile {
  full_name: string | null
  avatar_url: string | null
  username: string | null
}

export interface SharingPost {
  id: string
  user_id: string
  group_id: string | null
  content: string
  image_url: string | null
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string | null
  profile?: PostProfile
  is_liked?: boolean
}

export type SharingPostInsert = {
  user_id: string
  group_id: string | null
  content: string
  image_url: string | null
  like_count: number
  comment_count: number
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profile?: PostProfile
}
