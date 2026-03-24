import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase 클라이언트 생성 전에 손상된 localStorage 세션 정리
// 삼성 인터넷 등에서 OAuth 실패 후 잔류한 깨진 토큰 데이터를 제거해
// SDK 초기화 시 무한 refresh loop 또는 hang을 방지한다.
if (typeof window !== 'undefined') {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith('sb-')) continue;
      if (key.endsWith('-auth-token')) {
        try {
          const raw = window.localStorage.getItem(key);
          if (!raw) { window.localStorage.removeItem(key); continue; }
          const parsed = JSON.parse(raw);
          // access_token / refresh_token 중 하나라도 없으면 손상된 세션
          if (!parsed?.access_token || !parsed?.refresh_token) {
            window.localStorage.removeItem(key);
          }
        } catch {
          // JSON 파싱 실패 = 완전히 손상된 데이터
          window.localStorage.removeItem(key);
        }
      }
    }
  } catch { /* localStorage 접근 불가 환경 무시 */ }
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // SDK 자동 URL 처리 비활성화 — App.tsx의 handleSupabaseHash가 단독 처리
    // (두 곳에서 동시에 code를 소비하면 한쪽이 실패해 세션 null → 무한 로그인 루프)
    detectSessionInUrl: false,
    // code_verifier를 localStorage에 저장 (sessionStorage는 카카오 앱 전환 시 소실됨)
    storage: window.localStorage,
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
