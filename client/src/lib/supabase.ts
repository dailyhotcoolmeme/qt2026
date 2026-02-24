import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'myamen-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',  // PKCE code_verifier 손실 문제 방지
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
