// ================================
// Supabase Database 타입 (v2 SDK 호환)
// ================================
// GenericRelationship 타입 (not exported from supabase-js, inlined)
type _Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

// 테이블별 행 타입 — 먼저 선언 후 Database에서 참조
// (forward reference 방지를 위해 Database를 맨 아래에 위치)

// ================================
// Row 타입들 (Database보다 먼저 선언)
// ================================

export interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  username: string | null
  bio: string | null
  push_token: string | null
  notification_settings: NotificationSettings | null
  created_at: string
  updated_at: string | null
}

export interface DailyWordRow {
  id: string
  date: string
  book: string
  chapter: number
  verse: number
  verse_end: number | null
  content: string
  content_en: string | null
  reference: string
  created_at: string
}

export interface QTRecordRow {
  id: string
  user_id: string
  date: string
  book: string
  chapter: number
  verse_start: number | null
  verse_end: number | null
  reference: string | null
  content: string | null
  voice_url: string | null
  voice_duration: number | null
  group_id: string | null
  is_linked: boolean
  created_at: string
  updated_at: string | null
}

export interface PrayerRow {
  id: string
  user_id: string
  title: string
  content: string | null
  voice_url: string | null
  voice_duration: number | null
  group_id: string | null
  is_public: boolean
  is_answered: boolean
  pray_count: number
  created_at: string
  updated_at: string | null
}

export interface GroupRow {
  id: string
  name: string
  slug: string | null
  description: string | null
  image_url: string | null
  owner_id: string
  is_public: boolean
  password: string | null
  member_count: number
  scope_leader_id: string | null
  menu_config: GroupMenuConfig | null
  menu_settings: GroupMenuConfig | null
  website_url: string | null
  created_at: string
  updated_at: string | null
}

export type GroupRole = 'owner' | 'leader' | 'scope_leader' | 'member' | 'guest'

export interface GroupMemberRow {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  status: 'active' | 'pending' | 'blocked'
  joined_at: string
  created_at: string
}

export interface ReadingRecordRow {
  id: string
  user_id: string
  date: string
  book: string
  chapter: number
  content: string | null
  voice_url: string | null
  group_id: string | null
  created_at: string
}

export interface VerseFavoriteRow {
  id: string
  user_id: string
  book: string
  chapter: number
  verse: number
  verse_end: number | null
  content: string
  reference: string
  favorite_count: number
  created_at: string
}

export interface PrayerBoxRow {
  id: number
  user_id: string
  topic_id: string
  created_at: string
}

export interface NotificationRow {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

// ================================
// Sub-types
// ================================
export interface NotificationSettings {
  daily_word: boolean
  qt_reminder: boolean
  prayer_reminder: boolean
  group_activity: boolean
  prayer_response: boolean
}

export interface GroupMenuConfig {
  faith: boolean
  prayer: boolean
  social: boolean
  schedule: boolean
}

export type NotificationType =
  | 'daily_word'
  | 'qt_reminder'
  | 'prayer_reminder'
  | 'group_activity'
  | 'prayer_response'
  | 'group_invite'
  | 'system'

// ================================
// Insert / Update 편의 타입
// ================================
export type ProfileInsert = Omit<ProfileRow, 'created_at' | 'updated_at'>
export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at'>>

export type QTRecordInsert = Omit<QTRecordRow, 'id' | 'created_at' | 'updated_at'>
export type QTRecordUpdate = Partial<Omit<QTRecordRow, 'id' | 'created_at'>>

export type PrayerInsert = Omit<PrayerRow, 'id' | 'created_at' | 'updated_at'>
export type PrayerUpdate = Partial<Omit<PrayerRow, 'id' | 'created_at'>>

export type GroupInsert = Omit<GroupRow, 'id' | 'created_at' | 'updated_at'>
export type GroupUpdate = Partial<Omit<GroupRow, 'id' | 'created_at'>>

export type GroupMemberInsert = Omit<GroupMemberRow, 'id' | 'created_at'>
export type GroupMemberUpdate = Partial<Omit<GroupMemberRow, 'id' | 'created_at'>>

export type ReadingRecordInsert = Omit<ReadingRecordRow, 'id' | 'created_at'>

export type VerseFavoriteInsert = Omit<VerseFavoriteRow, 'id' | 'created_at'>

// ================================
// Supabase Database 제네릭 타입 (v2 호환)
// ================================
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: _Relationship[]
      }
      daily_words: {
        Row: DailyWordRow
        Insert: Omit<DailyWordRow, 'id' | 'created_at'>
        Update: Partial<Omit<DailyWordRow, 'id' | 'created_at'>>
        Relationships: _Relationship[]
      }
      qt_records: {
        Row: QTRecordRow
        Insert: QTRecordInsert
        Update: QTRecordUpdate
        Relationships: _Relationship[]
      }
      prayers: {
        Row: PrayerRow
        Insert: PrayerInsert
        Update: PrayerUpdate
        Relationships: _Relationship[]
      }
      groups: {
        Row: GroupRow
        Insert: GroupInsert
        Update: GroupUpdate
        Relationships: _Relationship[]
      }
      group_members: {
        Row: GroupMemberRow
        Insert: GroupMemberInsert
        Update: GroupMemberUpdate
        Relationships: _Relationship[]
      }
      reading_records: {
        Row: ReadingRecordRow
        Insert: ReadingRecordInsert
        Update: Partial<ReadingRecordInsert>
        Relationships: _Relationship[]
      }
      verse_favorites: {
        Row: VerseFavoriteRow
        Insert: VerseFavoriteInsert
        Update: Partial<VerseFavoriteInsert>
        Relationships: _Relationship[]
      }
      notifications: {
        Row: NotificationRow
        Insert: Omit<NotificationRow, 'id' | 'created_at'>
        Update: Partial<Omit<NotificationRow, 'id' | 'created_at'>>
        Relationships: _Relationship[]
      }
      prayer_box: {
        Row: PrayerBoxRow
        Insert: Omit<PrayerBoxRow, 'id' | 'created_at'>
        Update: Partial<Omit<PrayerBoxRow, 'id' | 'created_at'>>
        Relationships: _Relationship[]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

