import { createClient } from "@supabase/supabase-js";
import {
  getCurrentUser,
  login,
  logout,
  registerUser,
  resetPassword,
  startKakaoLogin,
  subscribeAuthChange,
  type AuthUser,
} from "./auth-client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

function toSupabaseLikeUser(user: AuthUser | null) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    app_metadata: {
      provider: user.auth_provider,
    },
    user_metadata: {
      nickname: user.nickname,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      church_name: user.church,
      rank: user.rank,
      username: user.username,
      phone: user.phone,
    },
  };
}

function toSession(user: AuthUser | null) {
  if (!user) return null;
  return {
    access_token: null,
    refresh_token: null,
    user: toSupabaseLikeUser(user),
  };
}

function toAuthError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

const auth = {
  async getUser() {
    const user = await getCurrentUser();
    return {
      data: {
        user: toSupabaseLikeUser(user),
      },
      error: null,
    };
  },

  async getSession() {
    const user = await getCurrentUser();
    return {
      data: {
        session: toSession(user),
      },
      error: null,
    };
  },

  async signOut() {
    try {
      await logout();
      return { error: null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  },

  async signInWithPassword(payload: { email?: string; username?: string; password: string }) {
    try {
      const user = await login({
        identifier: String(payload.email || payload.username || "").trim(),
        password: payload.password,
      });
      return {
        data: {
          user: toSupabaseLikeUser(user),
          session: toSession(user),
        },
        error: null,
      };
    } catch (error) {
      return {
        data: {
          user: null,
          session: null,
        },
        error: toAuthError(error),
      };
    }
  },

  async signUp(payload: {
    email: string;
    password: string;
    options?: {
      data?: Record<string, unknown>;
    };
  }) {
    try {
      const user = await registerUser({
        username: String(payload.options?.data?.username || "").trim(),
        email: payload.email,
        password: payload.password,
        nickname: String(payload.options?.data?.nickname || "").trim(),
        full_name: String(payload.options?.data?.full_name || "").trim(),
        phone: String(payload.options?.data?.phone || "").trim(),
        church: String(payload.options?.data?.church_name || "").trim(),
        rank: String(payload.options?.data?.rank || "").trim(),
        age_group: String(payload.options?.data?.age_group || "").trim(),
      });
      return {
        data: {
          user: toSupabaseLikeUser(user),
          session: toSession(user),
        },
        error: null,
      };
    } catch (error) {
      return {
        data: {
          user: null,
          session: null,
        },
        error: toAuthError(error),
      };
    }
  },

  async signInWithOAuth(payload: { provider: string; options?: { redirectTo?: string } }) {
    if (payload.provider !== "kakao") {
      return {
        data: {
          provider: payload.provider,
          url: null,
        },
        error: new Error(`Unsupported provider: ${payload.provider}`),
      };
    }

    startKakaoLogin(payload.options?.redirectTo);
    return {
      data: {
        provider: payload.provider,
        url: null,
      },
      error: null,
    };
  },

  async resetPasswordForEmail(email: string) {
    return {
      data: null,
      error: new Error(`Use the custom reset flow for ${email}`),
    };
  },

  async verifyOtp() {
    return {
      data: null,
      error: new Error("OTP verification is not used in the custom auth flow"),
    };
  },

  async updateUser(payload: { password?: string }) {
    if (!payload.password) {
      return { data: { user: null }, error: new Error("password is required") };
    }

    try {
      const current = await getCurrentUser();
      if (!current) {
        return { data: { user: null }, error: new Error("not authenticated") };
      }
      const user = await resetPassword({
        username: current.username,
        email: current.email,
        newPassword: payload.password,
      });
      return {
        data: {
          user: toSupabaseLikeUser(user),
        },
        error: null,
      };
    } catch (error) {
      return {
        data: {
          user: null,
        },
        error: toAuthError(error),
      };
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    let active = true;

    void getCurrentUser().then((user) => {
      if (!active) return;
      callback("INITIAL_SESSION", toSession(user));
    });

    const unsubscribe = subscribeAuthChange(async () => {
      const user = await getCurrentUser().catch(() => null);
      callback(user ? "SIGNED_IN" : "SIGNED_OUT", toSession(user));
    });

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            active = false;
            unsubscribe();
          },
        },
      },
    };
  },
};

export const supabase = rawSupabase as any;
supabase.auth = auth;

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
          content_type: "record" | "prayer";
          is_public: boolean;
          is_anonymous: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          content: string;
          content_type: "record" | "prayer";
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
