import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// ===== PKCE 디버그 (항상 실행) =====
if (typeof window !== 'undefined') {
  const href = window.location.href;
  const search = window.location.search;
  const hash = window.location.hash;
  const allKeys = Object.keys(localStorage);
  const authKeys = allKeys.filter(k => k.includes('auth') || k.includes('code') || k.includes('sb-') || k.includes('pkce'));
  console.log('[PKCE-DEBUG] === supabase.ts 초기화 ===');
  console.log('[PKCE-DEBUG] href:', href);
  console.log('[PKCE-DEBUG] search:', search);
  console.log('[PKCE-DEBUG] hash:', hash);
  console.log('[PKCE-DEBUG] 전체 localStorage 키 수:', allKeys.length);
  console.log('[PKCE-DEBUG] auth 관련 키들:', authKeys);
  authKeys.forEach(k => console.log(`[PKCE-DEBUG] ${k} =`, localStorage.getItem(k)?.substring(0, 80)));
}
// ===================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nickname: string | null;
          church: string | null;
          rank: string | null;
          age_group: string | null;
          bible_complete_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          nickname?: string | null;
          church?: string | null;
          rank?: string | null;
          age_group?: string | null;
          bible_complete_count?: number;
        };
        Update: {
          nickname?: string | null;
          church?: string | null;
          rank?: string | null;
          age_group?: string | null;
          bible_complete_count?: number;
        };
      };
      daily_words_comments: {
        Row: {
          id: number;
          user_id: string;
          content: string;
          is_anonymous: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          content: string;
          is_anonymous?: boolean;
        };
        Update: {
          content?: string;
          is_anonymous?: boolean;
        };
      };
      meditations: {
        Row: {
          id: number;
          user_id: string;
          content: string;
          content_type: 'record' | 'prayer';
          is_public: boolean;
          is_anonymous: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          content: string;
          content_type: 'record' | 'prayer';
          is_public?: boolean;
          is_anonymous?: boolean;
        };
        Update: {
          content?: string;
          is_public?: boolean;
          is_anonymous?: boolean;
        };
      };
      bible_progress: {
        Row: {
          id: number;
          user_id: string;
          book_name: string;
          chapter_number: number;
          is_completed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          book_name: string;
          chapter_number: number;
          is_completed?: boolean;
        };
        Update: {
          is_completed?: boolean;
        };
      };
    };
  };
};
