import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasLegacySupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function signInLegacySupabase(email: string, password: string): Promise<void> {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) return;

  const { error } = await rawSupabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw error;
  }
}

export async function signOutLegacySupabase(): Promise<void> {
  await rawSupabase.auth.signOut().catch(() => undefined);
}
