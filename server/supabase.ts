import { createClient } from '@supabase/supabase-js';

function looksLikeSupabaseUrl(value?: string | null) {
  return /^https?:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(value || '').trim());
}

function looksLikeJwt(value?: string | null) {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(String(value || '').trim());
}

function decodeJwtPayload(token?: string | null) {
  if (!looksLikeJwt(token)) return null;
  try {
    const payload = String(token).split('.')[1] || '';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function deriveSupabaseUrlFromKey(token?: string | null) {
  const payload = decodeJwtPayload(token);
  const ref = String(payload?.ref || '').trim();
  return ref ? `https://${ref}.supabase.co` : '';
}

function resolveSupabaseConfig() {
  const rawUrl = String(process.env.SUPABASE_URL || '').trim();
  const rawServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const rawAnonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();

  const keyCandidates = [rawServiceRoleKey, rawAnonKey].filter(Boolean);
  const fallbackUrl = keyCandidates.map(deriveSupabaseUrlFromKey).find(Boolean) || '';

  let supabaseUrl = looksLikeSupabaseUrl(rawUrl) ? rawUrl : fallbackUrl;
  let supabaseServiceRoleKey = rawServiceRoleKey;
  let supabaseAnonKey = rawAnonKey;

  if (!looksLikeSupabaseUrl(rawUrl) && looksLikeSupabaseUrl(rawServiceRoleKey) && looksLikeJwt(rawUrl)) {
    supabaseUrl = rawServiceRoleKey;
    supabaseServiceRoleKey = rawUrl;
  } else if (!looksLikeSupabaseUrl(rawUrl) && looksLikeSupabaseUrl(rawAnonKey) && looksLikeJwt(rawUrl)) {
    supabaseUrl = rawAnonKey;
    supabaseAnonKey = rawUrl;
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseAnonKey,
  };
}

const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = resolveSupabaseConfig();
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// 일반 클라이언트 (anon 또는 service role key)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Admin 전용 클라이언트 (service role key 필수)
// auth.admin.deleteUser() 등 admin API 호출 시 반드시 이 클라이언트 사용
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;
