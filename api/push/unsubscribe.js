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
    throw new Error("Missing Supabase env for push unsubscribe API");
  }
  return { url, serviceKey, anonKey };
}

function parseBearerToken(req) {
  const raw = String(req.headers.authorization || "");
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim() || null;
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

    const endpoint = String(req.body?.endpoint || "").trim();
    if (!endpoint) {
      return res.status(400).json({ success: false, error: "endpoint is required" });
    }

    const admin = createClient(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || "Failed to delete subscription" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "Unexpected error" });
  }
}
