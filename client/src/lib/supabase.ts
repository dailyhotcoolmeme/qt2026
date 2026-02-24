import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// PKCE 디버그: 카카오 콜백으로 돌아왔을 때 localStorage 상태 확인
if (typeof window !== 'undefined') {
  const urlCode = new URLSearchParams(window.location.search).get('code');
  if (urlCode) {
    const keys = Object.keys(localStorage).filter(k => k.includes('auth') || k.includes('pkce') || k.includes('verifier') || k.includes('code'));
    console.log('[PKCE-DEBUG] 콜백 URL 감지, code:', urlCode.substring(0, 10) + '...');
    console.log('[PKCE-DEBUG] localStorage auth 관련 키들:', keys);
    keys.forEach(k => console.log(`[PKCE-DEBUG] ${k}:`, localStorage.getItem(k)?.substring(0, 50)));
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'myamen-auth',
    storage: window.localStorage,
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
