import { createClient } from "@supabase/supabase-js";

const CORS_ORIGIN = "*";

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getEnv() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    throw new Error("Missing Supabase env for push subscription API");
  }
  return { url, serviceKey, anonKey };
}

function parseBearerToken(req) {
  const raw = String(req.headers.authorization || "");
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim() || null;
}

function normalizeSubscription(raw) {
  if (!raw || typeof raw !== "object") return null;
  const endpoint = typeof raw.endpoint === "string" ? raw.endpoint.trim() : "";
  const expirationTime = raw.expirationTime ?? null;
  const keys = raw.keys && typeof raw.keys === "object" ? raw.keys : {};
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh : "";
  const auth = typeof keys.auth === "string" ? keys.auth : "";

  if (!endpoint || !p256dh || !auth) return null;
  return {
    endpoint,
    expirationTime,
    keys: { p256dh, auth },
  };
}

async function resolveAuthedUser(req, env) {
  const token = parseBearerToken(req);
  if (!token) return { user: null, error: "missing bearer token" };

  const authClient = createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "invalid access token" };
  return { user: data.user, error: null };
}

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const env = getEnv();
    const { user, error: authError } = await resolveAuthedUser(req, env);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const subscription = normalizeSubscription(req.body?.subscription);
    if (!subscription) {
      return res.status(400).json({ success: false, error: "Invalid push subscription payload" });
    }

    const admin = createClient(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const nowIso = new Date().toISOString();
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription,
        user_agent: req.headers["user-agent"] ? String(req.headers["user-agent"]) : null,
        updated_at: nowIso,
        last_error: null,
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      return res.status(500).json({ success: false, error: error.message || "Failed to save subscription" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "Unexpected error" });
  }
}
