interface Env {
  DB?: D1Database;
  R2_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;
  CARD_BACKGROUND_BASE_URL?: string;
  CORS_ALLOW_ORIGIN?: string;
  FRONTEND_BASE_URL?: string;
  SESSION_COOKIE_DOMAIN?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  KAKAO_CLIENT_ID?: string;
  KAKAO_CLIENT_SECRET?: string;
  KAKAO_REDIRECT_URI?: string;
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  NAVER_TTS_SPEAKER?: string;
  NAVER_TTS_SPEED?: string;
  NAVER_TTS_PITCH?: string;
  NAVER_TTS_VOLUME?: string;
  OPENAI_API_KEY?: string;
  PUSH_SERVER_KEY?: string;
}

type JsonRecord = Record<string, unknown>;

type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type CurrentUser = {
  id: string;
  email: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  church: string | null;
  rank: string | null;
  age_group: string | null;
  bible_complete_count: number;
  created_at: string;
  auth_provider: string;
  kakao_id: string | null;
  full_name: string | null;
  phone: string | null;
};

const DEFAULT_CARD_BACKGROUND_BASE_URL = "https://audio.myamen.co.kr/card-backgrounds";
const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const NAVER_TTS_URL = "https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts";
const SESSION_COOKIE_NAME = "qt_session";
const KAKAO_STATE_COOKIE_NAME = "qt_kakao_oauth";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const OAUTH_STATE_TTL_MS = 1000 * 60 * 10;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseInteger(value: string | null, fallback = NaN): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonSafely<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function jsonResponse(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

function withCorsHeaders(request: Request, env: Env, response: Response): Response {
  const headers = new Headers(response.headers);
  const requestOrigin = request.headers.get("Origin");
  const allowOrigin = String(env.CORS_ALLOW_ORIGIN || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  let originToSet = "*";
  if (requestOrigin) {
    if (allowOrigin.length === 0 || allowOrigin.includes("*")) {
      originToSet = requestOrigin;
    } else if (allowOrigin.includes(requestOrigin)) {
      originToSet = requestOrigin;
    } else {
      originToSet = allowOrigin[0] || requestOrigin;
    }
  } else if (allowOrigin.length > 0 && !allowOrigin.includes("*")) {
    originToSet = allowOrigin[0];
  }

  headers.set("Access-Control-Allow-Origin", originToSet);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-user-id, x-push-server-key",
  );
  headers.set("Access-Control-Max-Age", "86400");
  if (originToSet !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function ok(
  request: Request,
  env: Env,
  payload: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  return withCorsHeaders(request, env, jsonResponse(payload, status, extraHeaders));
}

function fail(
  request: Request,
  env: Env,
  status: number,
  message: string,
  details?: unknown,
  extraHeaders?: HeadersInit,
): Response {
  return withCorsHeaders(
    request,
    env,
    jsonResponse(
      details === undefined
        ? { success: false, error: message }
        : { success: false, error: message, details },
      status,
      extraHeaders,
    ),
  );
}

function noContent(request: Request, env: Env): Response {
  return withCorsHeaders(request, env, new Response(null, { status: 204 }));
}

function redirectResponse(request: Request, env: Env, location: string, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders || {});
  headers.set("Location", location);
  return withCorsHeaders(request, env, new Response(null, { status: 302, headers }));
}

async function readJsonBody(request: Request): Promise<JsonRecord | null> {
  try {
    return (await request.json()) as JsonRecord;
  } catch {
    return null;
  }
}

function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

function requireD1(env: Env): D1Database {
  if (!env.DB) {
    throw new Error("Missing D1 binding: DB");
  }
  return env.DB;
}

async function dbAll<T>(statement: D1PreparedStatement): Promise<T[]> {
  const result = await statement.all<T>();
  return Array.isArray((result as { results?: T[] }).results)
    ? ((result as { results?: T[] }).results as T[])
    : [];
}

async function dbFirst<T>(statement: D1PreparedStatement): Promise<T | null> {
  return (await statement.first<T>()) ?? null;
}

function requireR2(env: Env): R2Bucket {
  if (!env.R2_BUCKET) {
    throw new Error("Missing R2 bucket binding: R2_BUCKET");
  }
  return env.R2_BUCKET;
}

function getR2PublicUrlBase(env: Env): string {
  const raw = String(env.R2_PUBLIC_URL || "").trim();
  if (!raw) {
    throw new Error("Missing env R2_PUBLIC_URL");
  }
  return trimTrailingSlash(raw);
}

function joinPublicUrl(baseUrl: string, key: string): string {
  const encodedPath = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${trimTrailingSlash(baseUrl)}/${encodedPath}`;
}

function normalizeFileKey(input: string): string {
  return input.replace(/^\/+/, "").trim();
}

function decodeBase64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function extractR2KeyFromUrl(fileUrl: string, env: Env): string | null {
  if (!fileUrl) return null;

  try {
    const parsed = new URL(fileUrl);
    const publicBaseRaw = String(env.R2_PUBLIC_URL || "").trim();
    if (publicBaseRaw) {
      const publicBase = new URL(publicBaseRaw);
      if (parsed.origin !== publicBase.origin) return null;
      const basePath = publicBase.pathname.replace(/\/+$/, "");
      if (!parsed.pathname.startsWith(`${basePath}/`)) return null;
      return normalizeFileKey(decodeURIComponent(parsed.pathname.slice(basePath.length + 1)));
    }
    return normalizeFileKey(decodeURIComponent(parsed.pathname));
  } catch {
    return null;
  }
}

function parsePushSubscription(raw: unknown): PushSubscriptionPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const endpoint = typeof obj.endpoint === "string" ? obj.endpoint.trim() : "";
  const keysObj = obj.keys && typeof obj.keys === "object" ? (obj.keys as Record<string, unknown>) : null;
  const p256dh = typeof keysObj?.p256dh === "string" ? keysObj.p256dh : "";
  const auth = typeof keysObj?.auth === "string" ? keysObj.auth : "";
  if (!endpoint || !p256dh || !auth) return null;

  return {
    endpoint,
    expirationTime:
      typeof obj.expirationTime === "number" || obj.expirationTime === null
        ? (obj.expirationTime as number | null)
        : null,
    keys: { p256dh, auth },
  };
}

function normalizeNotificationTargetPath(input: unknown): string {
  const value = String(input || "/").trim() || "/";
  if (value.startsWith("/#/")) return value.slice(2);
  if (value.startsWith("#/")) return value.slice(1);
  return value;
}

function toUniqueStrings(values: unknown[]): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) set.add(normalized);
  }
  return Array.from(set);
}

function parseCookies(headerValue: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of headerValue.split(";")) {
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const key = decodeURIComponent(pair.slice(0, index).trim());
    const value = decodeURIComponent(pair.slice(index + 1).trim());
    if (key) cookies[key] = value;
  }
  return cookies;
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  domain?: string | null;
  expires?: Date;
  maxAge?: number;
};

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  segments.push(`Path=${options.path || "/"}`);
  if (options.domain) segments.push(`Domain=${options.domain}`);
  if (typeof options.maxAge === "number") segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.expires) segments.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly !== false) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  return segments.join("; ");
}

function buildSessionCookie(request: Request, env: Env, value: string, expiresAt: Date): string {
  const hostname = new URL(request.url).hostname;
  const local = isLocalHost(hostname);
  const domain = local ? null : String(env.SESSION_COOKIE_DOMAIN || "").trim() || null;
  return serializeCookie(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: !local,
    sameSite: local ? "Lax" : "None",
    path: "/",
    domain,
    expires: expiresAt,
  });
}

function clearSessionCookie(request: Request, env: Env): string {
  return buildSessionCookie(request, env, "", new Date(0));
}

function buildOauthStateCookie(request: Request, env: Env, value: string, expiresAt: Date): string {
  const hostname = new URL(request.url).hostname;
  const local = isLocalHost(hostname);
  const domain = local ? null : String(env.SESSION_COOKIE_DOMAIN || "").trim() || null;
  return serializeCookie(KAKAO_STATE_COOKIE_NAME, value, {
    httpOnly: true,
    secure: !local,
    sameSite: local ? "Lax" : "None",
    path: "/",
    domain,
    expires: expiresAt,
  });
}

function clearOauthStateCookie(request: Request, env: Env): string {
  return buildOauthStateCookie(request, env, "", new Date(0));
}

function getSessionTokenFromRequest(request: Request): string | null {
  const cookies = parseCookies(String(request.headers.get("Cookie") || ""));
  const token = String(cookies[SESSION_COOKIE_NAME] || "").trim();
  return token || null;
}

function getOauthStatePayloadFromRequest(request: Request): { state: string; returnTo: string } | null {
  const cookies = parseCookies(String(request.headers.get("Cookie") || ""));
  const raw = String(cookies[KAKAO_STATE_COOKIE_NAME] || "").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: string; returnTo?: string };
    const state = String(parsed.state || "").trim();
    const returnTo = String(parsed.returnTo || "").trim();
    if (!state) return null;
    return { state, returnTo };
  } catch {
    return null;
  }
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
}

function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function generateRandomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 120000,
    },
    keyMaterial,
    256,
  );
  return bytesToHex(bits);
}

async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed === expectedHash;
}

function normalizeUsername(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeEmail(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeNickname(value: unknown): string {
  return String(value || "").trim();
}

function normalizeOptional(value: unknown): string | null {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function validateUsername(username: string): void {
  if (!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(username)) {
    throw new Error("username must be 4-32 chars and use lowercase letters, numbers, dot, underscore, or hyphen");
  }
}

function validateEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("invalid email address");
  }
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }
}

function validateNickname(nickname: string): void {
  if (nickname.length < 2 || nickname.length > 40) {
    throw new Error("nickname must be between 2 and 40 characters");
  }
}

function sanitizeUsernameSeed(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
  return normalized.replace(/^[^a-z0-9]+/, "").slice(0, 20) || "myamen";
}

const USER_SELECT_COLUMNS = `
  u.id,
  u.email,
  u.username,
  u.auth_provider,
  u.kakao_id,
  u.full_name,
  u.phone,
  u.created_at,
  p.nickname,
  p.avatar_url,
  p.church,
  p.rank,
  p.age_group,
  p.bible_complete_count
`;

function mapCurrentUser(row: Record<string, unknown>): CurrentUser {
  return {
    id: String(row.id || ""),
    email: String(row.email || ""),
    username: String(row.username || ""),
    nickname: row.nickname === null || row.nickname === undefined ? null : String(row.nickname),
    avatar_url: row.avatar_url === null || row.avatar_url === undefined ? null : String(row.avatar_url),
    church: row.church === null || row.church === undefined ? null : String(row.church),
    rank: row.rank === null || row.rank === undefined ? null : String(row.rank),
    age_group: row.age_group === null || row.age_group === undefined ? null : String(row.age_group),
    bible_complete_count: Number(row.bible_complete_count || 0),
    created_at: String(row.created_at || nowIso()),
    auth_provider: String(row.auth_provider || "local"),
    kakao_id: row.kakao_id === null || row.kakao_id === undefined ? null : String(row.kakao_id),
    full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
    phone: row.phone === null || row.phone === undefined ? null : String(row.phone),
  };
}

async function getUserById(env: Env, userId: string): Promise<CurrentUser | null> {
  const db = requireD1(env);
  const row = await dbFirst<Record<string, unknown>>(
    db
      .prepare(
        `SELECT ${USER_SELECT_COLUMNS}
         FROM auth_users u
         LEFT JOIN profiles p ON p.id = u.id
         WHERE u.id = ?1
         LIMIT 1`,
      )
      .bind(userId),
  );
  return row ? mapCurrentUser(row) : null;
}

async function isUsernameTaken(env: Env, username: string, excludeUserId?: string | null): Promise<boolean> {
  const row = await dbFirst<{ id: string }>(
    requireD1(env).prepare("SELECT id FROM auth_users WHERE username = ?1 LIMIT 1").bind(username),
  );
  return Boolean(row && row.id !== excludeUserId);
}

async function isEmailTaken(env: Env, email: string, excludeUserId?: string | null): Promise<boolean> {
  const row = await dbFirst<{ id: string }>(
    requireD1(env).prepare("SELECT id FROM auth_users WHERE email = ?1 LIMIT 1").bind(email),
  );
  return Boolean(row && row.id !== excludeUserId);
}

async function isNicknameTaken(env: Env, nickname: string, excludeUserId?: string | null): Promise<boolean> {
  const row = await dbFirst<{ id: string }>(
    requireD1(env).prepare("SELECT id FROM profiles WHERE nickname = ?1 LIMIT 1").bind(nickname),
  );
  return Boolean(row && row.id !== excludeUserId);
}

async function generateUniqueUsername(env: Env, seed: string): Promise<string> {
  const base = sanitizeUsernameSeed(seed);
  for (let index = 0; index < 25; index += 1) {
    const suffix = index === 0 ? "" : `${Math.floor(1000 + Math.random() * 9000)}`;
    const candidate = `${base}${suffix}`.slice(0, 32);
    if (!(await isUsernameTaken(env, candidate))) {
      return candidate;
    }
  }
  return `myamen${Math.floor(Date.now() / 1000).toString(36)}`.slice(0, 32);
}

async function generateUniqueNickname(env: Env, seed: string): Promise<string> {
  const base = normalizeNickname(seed) || `카카오${Math.floor(Math.random() * 9000 + 1000)}`;
  for (let index = 0; index < 25; index += 1) {
    const candidate = index === 0 ? base : `${base}${Math.floor(10 + Math.random() * 90)}`;
    if (!(await isNicknameTaken(env, candidate))) {
      return candidate;
    }
  }
  return `${base}${Math.floor(Date.now() / 1000).toString(36)}`;
}

async function getUserByIdentifier(
  env: Env,
  identifier: string,
): Promise<(CurrentUser & { password_hash: string | null; password_salt: string | null }) | null> {
  const normalized = normalizeEmail(identifier).includes("@")
    ? normalizeEmail(identifier)
    : normalizeUsername(identifier);
  const field = normalized.includes("@") ? "email" : "username";
  const row = await dbFirst<Record<string, unknown>>(
    requireD1(env)
      .prepare(
        `SELECT ${USER_SELECT_COLUMNS}, u.password_hash, u.password_salt
         FROM auth_users u
         LEFT JOIN profiles p ON p.id = u.id
         WHERE u.${field} = ?1
         LIMIT 1`,
      )
      .bind(normalized),
  );
  if (!row) return null;
  return {
    ...mapCurrentUser(row),
    password_hash: row.password_hash === null || row.password_hash === undefined ? null : String(row.password_hash),
    password_salt: row.password_salt === null || row.password_salt === undefined ? null : String(row.password_salt),
  };
}

async function getUserByKakaoId(env: Env, kakaoId: string): Promise<CurrentUser | null> {
  const row = await dbFirst<Record<string, unknown>>(
    requireD1(env)
      .prepare(
        `SELECT ${USER_SELECT_COLUMNS}
         FROM auth_users u
         LEFT JOIN profiles p ON p.id = u.id
         WHERE u.kakao_id = ?1
         LIMIT 1`,
      )
      .bind(kakaoId),
  );
  return row ? mapCurrentUser(row) : null;
}

async function createSession(env: Env, request: Request, userId: string): Promise<{ setCookie: string; expiresAt: string }> {
  const token = generateRandomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await requireD1(env)
    .prepare(
      `INSERT INTO auth_sessions (
        id,
        user_id,
        token_hash,
        created_at,
        updated_at,
        expires_at,
        user_agent
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      crypto.randomUUID(),
      userId,
      tokenHash,
      nowIso(),
      nowIso(),
      expiresAt.toISOString(),
      String(request.headers.get("user-agent") || "").slice(0, 500),
    )
    .run();

  return {
    setCookie: buildSessionCookie(request, env, token, expiresAt),
    expiresAt: expiresAt.toISOString(),
  };
}

async function destroySession(env: Env, request: Request): Promise<void> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await requireD1(env).prepare("DELETE FROM auth_sessions WHERE token_hash = ?1").bind(tokenHash).run();
}

async function getCurrentUserFromRequest(env: Env, request: Request): Promise<CurrentUser | null> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await dbFirst<Record<string, unknown>>(
    requireD1(env)
      .prepare(
        `SELECT ${USER_SELECT_COLUMNS}, s.expires_at
         FROM auth_users u
         INNER JOIN auth_sessions s ON s.user_id = u.id
         LEFT JOIN profiles p ON p.id = u.id
         WHERE s.token_hash = ?1
         LIMIT 1`,
      )
      .bind(tokenHash),
  );

  if (!row) return null;
  const expiresAt = String(row.expires_at || "").trim();
  if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
    await requireD1(env).prepare("DELETE FROM auth_sessions WHERE token_hash = ?1").bind(tokenHash).run();
    return null;
  }

  await requireD1(env)
    .prepare("UPDATE auth_sessions SET updated_at = ?2 WHERE token_hash = ?1")
    .bind(tokenHash, nowIso())
    .run();

  return mapCurrentUser(row);
}

function frontendBaseUrl(env: Env): string {
  const value = trimTrailingSlash(String(env.FRONTEND_BASE_URL || "").trim());
  if (!value) {
    throw new Error("Missing env FRONTEND_BASE_URL");
  }
  return value;
}

function normalizeReturnTo(raw: string, env: Env): string {
  const baseUrl = frontendBaseUrl(env);
  if (!raw) return `${baseUrl}/#/`;

  if (raw.startsWith("#/")) {
    return `${baseUrl}/${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${baseUrl}${raw}`;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.origin === new URL(baseUrl).origin) {
      return parsed.toString();
    }
  } catch {
    // ignore invalid returnTo
  }

  return `${baseUrl}/#/`;
}

function getKakaoRedirectUri(request: Request, env: Env): string {
  const explicit = String(env.KAKAO_REDIRECT_URI || "").trim();
  if (explicit) return explicit;
  return `${new URL(request.url).origin}/api/auth/oauth/kakao/callback`;
}

async function createAuthUser(
  env: Env,
  input: {
    id?: string | null;
    username: string;
    email: string;
    password?: string | null;
    nickname: string;
    church?: string | null;
    rank?: string | null;
    age_group?: string | null;
    avatar_url?: string | null;
    auth_provider: string;
    kakao_id?: string | null;
    full_name?: string | null;
    phone?: string | null;
  },
): Promise<CurrentUser> {
  const userId = String(input.id || "").trim() || crypto.randomUUID();
  const createdAt = nowIso();
  const salt = input.password ? generateSalt() : null;
  const passwordHash = input.password && salt ? await hashPassword(input.password, salt) : null;

  await requireD1(env)
    .prepare(
      `INSERT INTO auth_users (
        id,
        username,
        email,
        password_hash,
        password_salt,
        auth_provider,
        kakao_id,
        full_name,
        phone,
        created_at,
        updated_at,
        last_login_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?10)`,
    )
    .bind(
      userId,
      input.username,
      input.email,
      passwordHash,
      salt,
      input.auth_provider,
      input.kakao_id ?? null,
      input.full_name ?? null,
      input.phone ?? null,
      createdAt,
    )
    .run();

  try {
    await requireD1(env)
      .prepare(
        `INSERT INTO profiles (
          id,
          username,
          email,
          nickname,
          avatar_url,
          church,
          rank,
          age_group,
          bible_complete_count,
          created_at,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, ?9)`,
      )
      .bind(
        userId,
        input.username,
        input.email,
        input.nickname,
        input.avatar_url ?? null,
        input.church ?? null,
        input.rank ?? null,
        input.age_group ?? null,
        createdAt,
      )
      .run();

    await requireD1(env).batch([
      requireD1(env)
        .prepare(
          `INSERT OR IGNORE INTO user_terms_agreements (
            user_id,
            term_type,
            term_version,
            agreed_at
          ) VALUES (?1, ?2, ?3, ?4)`,
        )
        .bind(userId, "service", "v1.0", createdAt),
      requireD1(env)
        .prepare(
          `INSERT OR IGNORE INTO user_terms_agreements (
            user_id,
            term_type,
            term_version,
            agreed_at
          ) VALUES (?1, ?2, ?3, ?4)`,
        )
        .bind(userId, "privacy", "v1.0", createdAt),
    ]);
  } catch (error) {
    await requireD1(env).prepare("DELETE FROM auth_users WHERE id = ?1").bind(userId).run();
    throw error;
  }

  const user = await getUserById(env, userId);
  if (!user) {
    throw new Error("failed to create user profile");
  }
  return user;
}

async function syncKakaoUser(
  env: Env,
  existingUser: CurrentUser,
  input: { email: string; nickname: string; avatar_url?: string | null; full_name?: string | null; phone?: string | null },
): Promise<CurrentUser> {
  const updatedAt = nowIso();
  const userSets: string[] = [];
  const userValues: unknown[] = [];
  const profileSets: string[] = [];
  const profileValues: unknown[] = [];

  if (input.email && input.email !== existingUser.email && !(await isEmailTaken(env, input.email, existingUser.id))) {
    userSets.push("email = ?");
    userValues.push(input.email);
    profileSets.push("email = ?");
    profileValues.push(input.email);
  }

  if (input.full_name !== undefined) {
    userSets.push("full_name = ?");
    userValues.push(input.full_name ?? null);
  }

  if (input.phone !== undefined) {
    userSets.push("phone = ?");
    userValues.push(input.phone ?? null);
  }

  if (input.avatar_url !== undefined) {
    profileSets.push("avatar_url = ?");
    profileValues.push(input.avatar_url ?? null);
  }

  if (input.nickname && input.nickname !== existingUser.nickname && !(await isNicknameTaken(env, input.nickname, existingUser.id))) {
    profileSets.push("nickname = ?");
    profileValues.push(input.nickname);
  }

  if (userSets.length > 0) {
    userValues.push(updatedAt, existingUser.id);
    await requireD1(env)
      .prepare(`UPDATE auth_users SET ${userSets.join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...userValues)
      .run();
  }

  if (profileSets.length > 0) {
    profileValues.push(updatedAt, existingUser.id);
    await requireD1(env)
      .prepare(`UPDATE profiles SET ${profileSets.join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...profileValues)
      .run();
  }

  return (await getUserById(env, existingUser.id)) || existingUser;
}

async function upsertKakaoUser(env: Env, kakaoProfile: JsonRecord): Promise<CurrentUser> {
  const kakaoId = String(kakaoProfile.id || "").trim();
  if (!kakaoId) {
    throw new Error("missing kakao user id");
  }

  const kakaoAccount =
    kakaoProfile.kakao_account && typeof kakaoProfile.kakao_account === "object"
      ? (kakaoProfile.kakao_account as JsonRecord)
      : {};
  const kakaoAccountProfile =
    kakaoAccount.profile && typeof kakaoAccount.profile === "object"
      ? (kakaoAccount.profile as JsonRecord)
      : {};
  const properties =
    kakaoProfile.properties && typeof kakaoProfile.properties === "object"
      ? (kakaoProfile.properties as JsonRecord)
      : {};

  const email = normalizeEmail(kakaoAccount.email || `kakao_${kakaoId}@kakao.local`);
  const nicknameBase = normalizeNickname(
    properties.nickname || kakaoAccountProfile.nickname || `카카오${kakaoId.slice(-4)}`,
  );
  const avatarUrl = normalizeOptional(properties.profile_image || kakaoAccountProfile.profile_image_url);
  const fullName = normalizeOptional(kakaoAccount.name || nicknameBase);
  const phone = normalizeOptional(kakaoAccount.phone_number);
  const existing = await getUserByKakaoId(env, kakaoId);
  const nickname = await generateUniqueNickname(env, nicknameBase || `카카오${kakaoId.slice(-4)}`);

  if (existing) {
    return syncKakaoUser(env, existing, {
      email,
      nickname,
      avatar_url: avatarUrl,
      full_name: fullName,
      phone,
    });
  }

  const username = await generateUniqueUsername(env, `myamen_${kakaoId.slice(-6)}`);
  return createAuthUser(env, {
    username,
    email,
    nickname,
    avatar_url: avatarUrl,
    auth_provider: "kakao",
    kakao_id: kakaoId,
    full_name: fullName,
    phone,
  });
}

async function tableExists(env: Env, tableName: string): Promise<boolean> {
  const row = await dbFirst<{ name: string }>(
    requireD1(env)
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?1 LIMIT 1")
      .bind(tableName),
  );
  return Boolean(row?.name);
}

async function deleteFromTableIfExists(
  env: Env,
  tableName: string,
  whereSql: string,
  bindValues: unknown[],
): Promise<void> {
  if (!(await tableExists(env, tableName))) return;
  await requireD1(env)
    .prepare(`DELETE FROM ${tableName} WHERE ${whereSql}`)
    .bind(...bindValues)
    .run();
}

function ensureSupabaseBaseUrl(env: Env): string {
  const baseUrl = String(env.SUPABASE_URL || "").trim();
  if (!baseUrl) throw new Error("Missing env SUPABASE_URL");
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function getSupabaseServiceKey(env: Env): string {
  const service = String(env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!service) throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY");
  return service;
}

function hasSupabaseAdminSync(env: Env): boolean {
  return Boolean(String(env.SUPABASE_URL || "").trim() && String(env.SUPABASE_SERVICE_ROLE_KEY || "").trim());
}

async function createSupabaseShadowUser(
  env: Env,
  input: {
    email: string;
    password: string;
    user_metadata?: JsonRecord | null;
  },
): Promise<string | null> {
  if (!hasSupabaseAdminSync(env)) return null;

  const response = await supabaseServiceFetch(env, "auth/v1/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: input.user_metadata ?? {},
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`legacy auth create failed (${response.status}): ${raw.slice(0, 300)}`);
  }

  const payload = (await response.json()) as JsonRecord;
  const nestedUser =
    payload.user && typeof payload.user === "object" ? (payload.user as JsonRecord) : null;
  const userId = String(nestedUser?.id || payload.id || "").trim();
  if (!userId) {
    throw new Error("legacy auth create failed: missing user id");
  }
  return userId;
}

async function updateSupabaseShadowUser(
  env: Env,
  userId: string,
  updates: {
    email?: string;
    password?: string;
    user_metadata?: JsonRecord | null;
  },
): Promise<void> {
  if (!hasSupabaseAdminSync(env) || !userId) return;

  const payload: JsonRecord = {};
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.password !== undefined) payload.password = updates.password;
  if (updates.user_metadata !== undefined) payload.user_metadata = updates.user_metadata;
  if (Object.keys(payload).length === 0) return;

  const response = await supabaseServiceFetch(env, `auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`legacy auth update failed (${response.status}): ${raw.slice(0, 300)}`);
  }
}

async function deleteSupabaseShadowUser(env: Env, userId: string): Promise<void> {
  if (!hasSupabaseAdminSync(env) || !userId) return;

  const response = await supabaseServiceFetch(env, `auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    const raw = await response.text();
    throw new Error(`legacy auth delete failed (${response.status}): ${raw.slice(0, 300)}`);
  }
}

async function supabaseServiceFetch(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const baseUrl = ensureSupabaseBaseUrl(env);
  const serviceKey = getSupabaseServiceKey(env);
  const headers = new Headers(init.headers || {});
  headers.set("apikey", serviceKey);
  headers.set("Authorization", `Bearer ${serviceKey}`);
  return fetch(new URL(path, baseUrl).toString(), {
    ...init,
    headers,
  });
}

async function supabaseServiceFetchJson<T>(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await supabaseServiceFetch(env, path, init);
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${raw.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

type AudioMetadataRow = {
  testament: string | null;
  book_id: number;
  chapter: number;
  audio_url: string;
  verse_timings: unknown;
  duration: number | null;
  created_at: string | null;
};

async function queryAudioMetadataFromD1(
  env: Env,
  bookId: number,
  chapter: number,
): Promise<AudioMetadataRow | null> {
  if (!env.DB) return null;
  const statement = env.DB.prepare(
    `SELECT testament, book_id, chapter, audio_url, verse_timings, duration, created_at
     FROM bible_audio_metadata
     WHERE book_id = ?1 AND chapter = ?2
     LIMIT 1`,
  );

  const result = await statement.bind(bookId, chapter).first<Record<string, unknown>>();
  if (!result) return null;

  const verseTimingsRaw = result.verse_timings;
  const verseTimings =
    typeof verseTimingsRaw === "string" ? parseJsonSafely<unknown>(verseTimingsRaw) ?? null : verseTimingsRaw ?? null;

  return {
    testament: (result.testament as string | null) ?? null,
    book_id: Number(result.book_id),
    chapter: Number(result.chapter),
    audio_url: String(result.audio_url || ""),
    verse_timings: verseTimings,
    duration: result.duration === null || result.duration === undefined ? null : Number(result.duration),
    created_at: (result.created_at as string | null) ?? null,
  };
}

async function queryAudioMetadataFromSupabase(
  env: Env,
  bookId: number,
  chapter: number,
): Promise<AudioMetadataRow | null> {
  try {
    const path =
      `rest/v1/bible_audio_metadata?select=testament,book_id,chapter,audio_url,verse_timings,duration,created_at` +
      `&book_id=eq.${bookId}&chapter=eq.${chapter}&limit=1`;
    const rows = await supabaseServiceFetchJson<AudioMetadataRow[]>(env, path);
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function upsertAudioMetadataToD1(env: Env, row: AudioMetadataRow): Promise<void> {
  if (!env.DB) return;
  const verseTimingsSerialized = row.verse_timings === null ? null : JSON.stringify(row.verse_timings);
  await env.DB.prepare(
    `INSERT INTO bible_audio_metadata (
       testament,
       book_id,
       chapter,
       audio_url,
       verse_timings,
       duration,
       created_at,
       updated_at
     )
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, COALESCE(?7, datetime('now')), datetime('now'))
     ON CONFLICT(book_id, chapter) DO UPDATE SET
       testament=excluded.testament,
       audio_url=excluded.audio_url,
       verse_timings=excluded.verse_timings,
       duration=excluded.duration,
       created_at=excluded.created_at,
       updated_at=datetime('now')`,
  )
    .bind(
      row.testament,
      row.book_id,
      row.chapter,
      row.audio_url,
      verseTimingsSerialized,
      row.duration ?? 0,
      row.created_at,
    )
    .run();
}

async function handleBibleAudioMetadata(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const bookId = parseInteger(url.searchParams.get("book_id"));
  const chapter = parseInteger(url.searchParams.get("chapter"));
  if (!Number.isFinite(bookId) || !Number.isFinite(chapter)) {
    return fail(request, env, 400, "book_id and chapter are required");
  }

  try {
    let metadata = await queryAudioMetadataFromD1(env, bookId, chapter);
    if (!metadata) {
      metadata = await queryAudioMetadataFromSupabase(env, bookId, chapter);
      if (metadata) {
        await upsertAudioMetadataToD1(env, metadata);
      }
    }

    if (!metadata || !metadata.audio_url) {
      return fail(request, env, 404, "audio metadata not found");
    }

    return ok(request, env, metadata);
  } catch (error) {
    return fail(request, env, 500, "failed to load audio metadata", normalizeErrorMessage(error));
  }
}

async function handleCardBackgroundProxy(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> {
  const fileName = pathname.split("/").pop() || "";
  if (!/^bg\d+\.jpg$/i.test(fileName)) {
    return fail(request, env, 400, "invalid file");
  }

  const base = String(env.CARD_BACKGROUND_BASE_URL || DEFAULT_CARD_BACKGROUND_BASE_URL).trim();
  try {
    const upstream = await fetch(`${trimTrailingSlash(base)}/${encodeURIComponent(fileName)}`);
    if (!upstream.ok) {
      return fail(request, env, upstream.status, "upstream fetch failed");
    }
    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=86400");
    return withCorsHeaders(request, env, new Response(upstream.body, { status: 200, headers }));
  } catch (error) {
    return fail(request, env, 500, "proxy error", normalizeErrorMessage(error));
  }
}

async function handleGenericImageProxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const targetRaw = String(url.searchParams.get("url") || "").trim();
  if (!targetRaw) {
    return fail(request, env, 400, "url is required");
  }

  let target: URL;
  try {
    target = new URL(targetRaw);
  } catch {
    return fail(request, env, 400, "invalid url");
  }
  if (!/^https?:$/.test(target.protocol)) {
    return fail(request, env, 400, "unsupported protocol");
  }

  try {
    const upstream = await fetch(target.toString());
    if (!upstream.ok) {
      return fail(request, env, upstream.status, "upstream fetch failed");
    }
    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    headers.set(
      "Cache-Control",
      upstream.headers.get("cache-control") || "public, max-age=3600",
    );
    return withCorsHeaders(request, env, new Response(upstream.body, { status: 200, headers }));
  } catch (error) {
    return fail(request, env, 500, "proxy error", normalizeErrorMessage(error));
  }
}

async function handleAudioUpload(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const fileName = normalizeFileKey(String(body?.fileName || ""));
  const audioBase64 = String(body?.audioBase64 || "");
  const contentType = String(body?.contentType || "audio/webm");

  if (!fileName || !audioBase64) {
    return fail(request, env, 400, "fileName and audioBase64 are required");
  }

  try {
    const bytes = decodeBase64ToBytes(audioBase64);
    const bucket = requireR2(env);
    await bucket.put(fileName, bytes, {
      httpMetadata: { contentType },
    });

    const publicUrl = joinPublicUrl(getR2PublicUrlBase(env), fileName);
    return ok(request, env, { success: true, publicUrl });
  } catch (error) {
    return fail(request, env, 500, "audio upload failed", normalizeErrorMessage(error));
  }
}

async function handleAudioCheck(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const fileName = normalizeFileKey(String(body?.fileName || ""));
  if (!fileName) {
    return fail(request, env, 400, "fileName is required");
  }

  try {
    const bucket = requireR2(env);
    const objectMeta = await bucket.head(fileName);
    if (!objectMeta) {
      return fail(request, env, 404, "file not found");
    }
    const publicUrl = joinPublicUrl(getR2PublicUrlBase(env), fileName);
    return ok(request, env, { success: true, publicUrl });
  } catch (error) {
    return fail(request, env, 500, "audio check failed", normalizeErrorMessage(error));
  }
}

async function handleAudioDelete(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const fileUrl = String(body?.fileUrl || "").trim();
  if (!fileUrl) {
    return fail(request, env, 400, "fileUrl is required");
  }

  try {
    const bucket = requireR2(env);
    const key = extractR2KeyFromUrl(fileUrl, env);
    if (!key) {
      return ok(request, env, { success: true, skipped: true });
    }
    await bucket.delete(key);
    return ok(request, env, { success: true });
  } catch (error) {
    return fail(request, env, 500, "audio delete failed", normalizeErrorMessage(error));
  }
}

async function handleAudioMove(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const sourceUrl = String(body?.sourceUrl || "").trim();
  const targetPath = normalizeFileKey(String(body?.targetPath || ""));
  if (!sourceUrl || !targetPath) {
    return fail(request, env, 400, "sourceUrl and targetPath are required");
  }

  try {
    const bucket = requireR2(env);
    let sourceKey = extractR2KeyFromUrl(sourceUrl, env);
    if (!sourceKey) {
      try {
        sourceKey = normalizeFileKey(new URL(sourceUrl).pathname);
      } catch {
        sourceKey = null;
      }
    }
    if (!sourceKey) {
      return fail(request, env, 400, "unable to parse source key");
    }

    const sourceObject = await bucket.get(sourceKey);
    if (!sourceObject || !sourceObject.body) {
      return fail(request, env, 404, "source file not found");
    }

    await bucket.put(targetPath, sourceObject.body, {
      httpMetadata: sourceObject.httpMetadata,
      customMetadata: sourceObject.customMetadata,
    });
    await bucket.delete(sourceKey);

    const publicUrl = joinPublicUrl(getR2PublicUrlBase(env), targetPath);
    return ok(request, env, { success: true, publicUrl });
  } catch (error) {
    return fail(request, env, 500, "audio move failed", normalizeErrorMessage(error));
  }
}

async function handleFileUpload(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const fileName = normalizeFileKey(String(body?.fileName || ""));
  const fileBase64 = String(body?.fileBase64 || "");
  const contentType = String(body?.contentType || "application/octet-stream");

  if (!fileName || !fileBase64) {
    return fail(request, env, 400, "fileName and fileBase64 are required");
  }

  try {
    const bucket = requireR2(env);
    const bytes = decodeBase64ToBytes(fileBase64);
    await bucket.put(fileName, bytes, {
      httpMetadata: { contentType },
    });
    const publicUrl = joinPublicUrl(getR2PublicUrlBase(env), fileName);
    return ok(request, env, { success: true, publicUrl });
  } catch (error) {
    return fail(request, env, 500, "file upload failed", normalizeErrorMessage(error));
  }
}

async function handleFileDelete(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const fileUrl = String(body?.fileUrl || "").trim();
  if (!fileUrl) {
    return fail(request, env, 400, "fileUrl is required");
  }

  try {
    const bucket = requireR2(env);
    const key = extractR2KeyFromUrl(fileUrl, env);
    if (!key) {
      return ok(request, env, { success: true, skipped: true });
    }
    await bucket.delete(key);
    return ok(request, env, { success: true, key });
  } catch (error) {
    return fail(request, env, 500, "file delete failed", normalizeErrorMessage(error));
  }
}

function normalizeTtsText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return parsed;
}

function safeKeyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function handleNaverTts(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const text = normalizeTtsText(String(body?.text || ""));
  if (!text) {
    return fail(request, env, 400, "text is required");
  }

  const clientId = String(env.NAVER_CLIENT_ID || "").trim();
  const clientSecret = String(env.NAVER_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return fail(request, env, 500, "missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET");
  }

  try {
    const speaker = String(env.NAVER_TTS_SPEAKER || "nsunkyung").trim() || "nsunkyung";
    const speed = toInt(env.NAVER_TTS_SPEED, 1);
    const pitch = toInt(env.NAVER_TTS_PITCH, 0);
    const volume = toInt(env.NAVER_TTS_VOLUME, 0);
    const keyBase = safeKeyPart(String(body?.cacheKey || ""));
    const digest = (await sha1Hex(text)).slice(0, 12);
    const objectKey = `audio/qt-cache/v1/${speaker}/${keyBase || digest}-${digest}.mp3`;

    const bucket = requireR2(env);
    const cached = Boolean(await bucket.head(objectKey));

    if (!cached) {
      const naverBody = new URLSearchParams({
        speaker,
        speed: String(speed),
        pitch: String(pitch),
        volume: String(volume),
        format: "mp3",
        text,
      });

      const response = await fetch(NAVER_TTS_URL, {
        method: "POST",
        headers: {
          "X-NCP-APIGW-API-KEY-ID": clientId,
          "X-NCP-APIGW-API-KEY": clientSecret,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: naverBody,
      });

      if (!response.ok) {
        const raw = await response.text();
        return fail(request, env, 500, "Naver TTS failed", raw.slice(0, 300));
      }

      await bucket.put(objectKey, await response.arrayBuffer(), {
        httpMetadata: { contentType: "audio/mpeg" },
      });
    }

    const audioUrl = joinPublicUrl(getR2PublicUrlBase(env), objectKey);
    return ok(request, env, {
      audio_url: audioUrl,
      cached,
      object_key: objectKey,
    });
  } catch (error) {
    return fail(request, env, 500, "tts request failed", normalizeErrorMessage(error));
  }
}

function analyzeKeywords(text: string): Array<{ word: string; count: number }> {
  const normalized = text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'[\]]/g, " ")
    .trim();

  if (!normalized) return [];

  const stopWords = new Set([
    "the",
    "and",
    "that",
    "this",
    "with",
    "from",
    "have",
    "will",
    "into",
    "about",
    "there",
    "their",
    "they",
    "you",
    "your",
    "for",
    "are",
    "was",
    "were",
    "been",
  ]);

  const words = normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !stopWords.has(word) && !/^\d+$/.test(word));

  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  return Array.from(frequency.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

async function handlePrayerTranscribe(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const audioUrl = String(body?.audioUrl || "").trim();
  if (!audioUrl) {
    return fail(request, env, 400, "audioUrl is required");
  }

  const openaiApiKey = String(env.OPENAI_API_KEY || "").trim();
  if (!openaiApiKey) {
    return fail(request, env, 500, "missing OPENAI_API_KEY");
  }

  try {
    const sourceResponse = await fetch(audioUrl);
    if (!sourceResponse.ok) {
      return fail(request, env, 400, "unable to fetch audio file");
    }
    const audioBytes = await sourceResponse.arrayBuffer();

    const formData = new FormData();
    formData.append("file", new Blob([audioBytes], { type: "audio/webm" }), "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "ko");
    formData.append("response_format", "text");

    const whisperResponse = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const raw = await whisperResponse.text();
      return fail(request, env, 500, "transcription failed", raw.slice(0, 400));
    }

    const transcription = await whisperResponse.text();
    return ok(request, env, {
      success: true,
      transcription,
      keywords: analyzeKeywords(transcription),
    });
  } catch (error) {
    return fail(request, env, 500, "transcription failed", normalizeErrorMessage(error));
  }
}

async function handleAuthUserGet(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  return ok(request, env, user);
}

async function handleAuthLogin(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const identifier = String(body?.identifier || body?.username || body?.email || "").trim();
  const password = String(body?.password || "");
  if (!identifier || !password) {
    return fail(request, env, 400, "identifier and password are required");
  }

  try {
    const user = await getUserByIdentifier(env, identifier);
    if (!user || !user.password_hash || !user.password_salt) {
      return fail(request, env, 401, "invalid credentials");
    }

    const matched = await verifyPassword(password, user.password_salt, user.password_hash);
    if (!matched) {
      return fail(request, env, 401, "invalid credentials");
    }

    await requireD1(env)
      .prepare("UPDATE auth_users SET last_login_at = ?2, updated_at = ?2 WHERE id = ?1")
      .bind(user.id, nowIso())
      .run();

    const session = await createSession(env, request, user.id);
    const currentUser = await getUserById(env, user.id);
    return ok(request, env, { success: true, user: currentUser }, 200, {
      "Set-Cookie": session.setCookie,
    });
  } catch (error) {
    return fail(request, env, 500, "login failed", normalizeErrorMessage(error));
  }
}

async function handleAuthRegister(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const username = normalizeUsername(body?.username);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  const nickname = normalizeNickname(body?.nickname);
  const church = normalizeOptional(body?.church);
  const rank = normalizeOptional(body?.rank);
  const ageGroup = normalizeOptional(body?.age_group);
  const fullName = normalizeOptional(body?.full_name);
  const phone = normalizeOptional(body?.phone);
  let shadowUserId: string | null = null;

  try {
    validateUsername(username);
    validateEmail(email);
    validatePassword(password);
    validateNickname(nickname);

    if (await isUsernameTaken(env, username)) {
      return fail(request, env, 409, "username already exists");
    }
    if (await isEmailTaken(env, email)) {
      return fail(request, env, 409, "email already exists");
    }
    if (await isNicknameTaken(env, nickname)) {
      return fail(request, env, 409, "nickname already exists");
    }

    if (hasSupabaseAdminSync(env)) {
      shadowUserId = await createSupabaseShadowUser(env, {
        email,
        password,
        user_metadata: {
          username,
          nickname,
          full_name: fullName,
          church_name: church,
          rank,
          phone,
        },
      });
    }

    const user = await createAuthUser(env, {
      id: shadowUserId,
      username,
      email,
      password,
      nickname,
      church,
      rank,
      age_group: ageGroup,
      auth_provider: "local",
      full_name: fullName,
      phone,
    });

    const session = await createSession(env, request, user.id);
    return ok(request, env, { success: true, user }, 201, {
      "Set-Cookie": session.setCookie,
    });
  } catch (error) {
    if (shadowUserId) {
      try {
        await deleteSupabaseShadowUser(env, shadowUserId);
      } catch {
        // ignore shadow cleanup failures
      }
    }
    return fail(request, env, 400, "register failed", normalizeErrorMessage(error));
  }
}

async function handleAuthLogout(request: Request, env: Env): Promise<Response> {
  await destroySession(env, request);
  return ok(request, env, { success: true }, 200, {
    "Set-Cookie": clearSessionCookie(request, env),
  });
}

async function handleAuthCheckAvailability(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const currentUser = await getCurrentUserFromRequest(env, request);
  const excludeUserId = currentUser?.id ?? null;

  const field = String(body?.field || "").trim();
  const value = String(body?.value || "").trim();
  if (field && value) {
    if (field === "username") {
      return ok(request, env, {
        field,
        available: !(await isUsernameTaken(env, normalizeUsername(value), excludeUserId)),
      });
    }
    if (field === "email") {
      return ok(request, env, {
        field,
        available: !(await isEmailTaken(env, normalizeEmail(value), excludeUserId)),
      });
    }
    if (field === "nickname") {
      return ok(request, env, {
        field,
        available: !(await isNicknameTaken(env, normalizeNickname(value), excludeUserId)),
      });
    }
    return fail(request, env, 400, "unsupported availability field");
  }

  const response: Record<string, boolean> = {};
  if (body?.username !== undefined) {
    response.username = !(await isUsernameTaken(env, normalizeUsername(body.username), excludeUserId));
  }
  if (body?.email !== undefined) {
    response.email = !(await isEmailTaken(env, normalizeEmail(body.email), excludeUserId));
  }
  if (body?.nickname !== undefined) {
    response.nickname = !(await isNicknameTaken(env, normalizeNickname(body.nickname), excludeUserId));
  }
  return ok(request, env, response);
}

async function handleAuthFindId(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const email = normalizeEmail(body?.email);
  if (!email) {
    return fail(request, env, 400, "email is required");
  }

  const row = await dbFirst<{ username: string }>(
    requireD1(env).prepare("SELECT username FROM auth_users WHERE email = ?1 LIMIT 1").bind(email),
  );
  return ok(request, env, {
    success: true,
    found: Boolean(row?.username),
    username: row?.username || null,
  });
}

async function handleAuthResetPassword(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const username = normalizeUsername(body?.username);
  const email = normalizeEmail(body?.email);
  const newPassword = String(body?.newPassword || body?.password || "");

  if (!username || !email || !newPassword) {
    return fail(request, env, 400, "username, email, and newPassword are required");
  }

  try {
    validatePassword(newPassword);
    const row = await dbFirst<{ id: string }>(
      requireD1(env)
        .prepare("SELECT id FROM auth_users WHERE username = ?1 AND email = ?2 LIMIT 1")
        .bind(username, email),
    );
    if (!row?.id) {
      return fail(request, env, 404, "account not found");
    }

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);
    await requireD1(env).batch([
      requireD1(env)
        .prepare("UPDATE auth_users SET password_hash = ?2, password_salt = ?3, updated_at = ?4 WHERE id = ?1")
        .bind(row.id, hash, salt, nowIso()),
      requireD1(env).prepare("DELETE FROM auth_sessions WHERE user_id = ?1").bind(row.id),
    ]);

    try {
      await updateSupabaseShadowUser(env, row.id, {
        password: newPassword,
      });
    } catch (shadowError) {
      console.error("legacy auth password sync failed", shadowError);
    }

    const session = await createSession(env, request, row.id);
    const user = await getUserById(env, row.id);
    return ok(request, env, { success: true, user }, 200, {
      "Set-Cookie": session.setCookie,
    });
  } catch (error) {
    return fail(request, env, 400, "password reset failed", normalizeErrorMessage(error));
  }
}

async function handleKakaoOauthStart(request: Request, env: Env): Promise<Response> {
  const clientId = String(env.KAKAO_CLIENT_ID || "").trim();
  if (!clientId) {
    return fail(request, env, 500, "missing KAKAO_CLIENT_ID");
  }

  const state = generateRandomToken();
  const returnTo = normalizeReturnTo(String(new URL(request.url).searchParams.get("returnTo") || ""), env);
  const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", getKakaoRedirectUri(request, env));
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  return redirectResponse(request, env, authorizeUrl.toString(), {
    "Set-Cookie": buildOauthStateCookie(
      request,
      env,
      JSON.stringify({ state, returnTo }),
      new Date(Date.now() + OAUTH_STATE_TTL_MS),
    ),
  });
}

async function handleKakaoOauthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const error = String(url.searchParams.get("error") || "").trim();
  const state = String(url.searchParams.get("state") || "").trim();
  const code = String(url.searchParams.get("code") || "").trim();
  const oauthState = getOauthStatePayloadFromRequest(request);
  const fallbackReturnTo = normalizeReturnTo("", env);
  const returnTo = normalizeReturnTo(oauthState?.returnTo || "", env);

  if (error) {
    return redirectResponse(request, env, `${fallbackReturnTo}?oauthError=${encodeURIComponent(error)}`, {
      "Set-Cookie": clearOauthStateCookie(request, env),
    });
  }

  if (!state || !code || !oauthState || oauthState.state !== state) {
    return redirectResponse(request, env, `${fallbackReturnTo}?oauthError=state_mismatch`, {
      "Set-Cookie": clearOauthStateCookie(request, env),
    });
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: String(env.KAKAO_CLIENT_ID || "").trim(),
      redirect_uri: getKakaoRedirectUri(request, env),
      code,
    });
    const clientSecret = String(env.KAKAO_CLIENT_SECRET || "").trim();
    if (clientSecret) {
      tokenBody.set("client_secret", clientSecret);
    }

    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: tokenBody,
    });
    if (!tokenResponse.ok) {
      const raw = await tokenResponse.text();
      return redirectResponse(request, env, `${fallbackReturnTo}?oauthError=${encodeURIComponent(raw.slice(0, 80) || "token_failed")}`, {
        "Set-Cookie": clearOauthStateCookie(request, env),
      });
    }

    const tokenPayload = (await tokenResponse.json()) as JsonRecord;
    const accessToken = String(tokenPayload.access_token || "").trim();
    if (!accessToken) {
      return redirectResponse(request, env, `${fallbackReturnTo}?oauthError=missing_access_token`, {
        "Set-Cookie": clearOauthStateCookie(request, env),
      });
    }

    const profileResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!profileResponse.ok) {
      const raw = await profileResponse.text();
      return redirectResponse(request, env, `${fallbackReturnTo}?oauthError=${encodeURIComponent(raw.slice(0, 80) || "profile_failed")}`, {
        "Set-Cookie": clearOauthStateCookie(request, env),
      });
    }

    const user = await upsertKakaoUser(env, (await profileResponse.json()) as JsonRecord);
    await requireD1(env)
      .prepare("UPDATE auth_users SET last_login_at = ?2, updated_at = ?2 WHERE id = ?1")
      .bind(user.id, nowIso())
      .run();

    const session = await createSession(env, request, user.id);
    const headers = new Headers();
    headers.append("Set-Cookie", clearOauthStateCookie(request, env));
    headers.append("Set-Cookie", session.setCookie);
    return redirectResponse(request, env, returnTo, headers);
  } catch (callbackError) {
    return redirectResponse(request, env, `${fallbackReturnTo}?oauthError=${encodeURIComponent(normalizeErrorMessage(callbackError))}`, {
      "Set-Cookie": clearOauthStateCookie(request, env),
    });
  }
}

async function handleUserProfileGet(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  if (!user) {
    return fail(request, env, 401, "unauthorized");
  }
  return ok(request, env, user);
}

async function handleUserProfileUpdate(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  if (!user) {
    return fail(request, env, 401, "unauthorized");
  }

  const body = await readJsonBody(request);
  const nextUsername = body?.username !== undefined ? normalizeUsername(body.username) : user.username;
  const nextEmail = body?.email !== undefined ? normalizeEmail(body.email) : user.email;
  const nextNickname = body?.nickname !== undefined ? normalizeNickname(body.nickname) : user.nickname || "";
  const nextChurch = body?.church !== undefined ? normalizeOptional(body.church) : user.church;
  const nextRank = body?.rank !== undefined ? normalizeOptional(body.rank) : user.rank;
  const nextAgeGroup = body?.age_group !== undefined ? normalizeOptional(body.age_group) : user.age_group;
  const nextAvatarUrl = body?.avatar_url !== undefined ? normalizeOptional(body.avatar_url) : user.avatar_url;
  const nextFullName = body?.full_name !== undefined ? normalizeOptional(body.full_name) : user.full_name;
  const nextPhone = body?.phone !== undefined ? normalizeOptional(body.phone) : user.phone;

  try {
    validateUsername(nextUsername);
    validateEmail(nextEmail);
    validateNickname(nextNickname);

    if (await isUsernameTaken(env, nextUsername, user.id)) {
      return fail(request, env, 409, "username already exists");
    }
    if (await isEmailTaken(env, nextEmail, user.id)) {
      return fail(request, env, 409, "email already exists");
    }
    if (await isNicknameTaken(env, nextNickname, user.id)) {
      return fail(request, env, 409, "nickname already exists");
    }

    const updatedAt = nowIso();
    await requireD1(env).batch([
      requireD1(env)
        .prepare(
          `UPDATE auth_users
           SET username = ?2,
               email = ?3,
               full_name = ?4,
               phone = ?5,
               updated_at = ?6
           WHERE id = ?1`,
        )
        .bind(user.id, nextUsername, nextEmail, nextFullName, nextPhone, updatedAt),
      requireD1(env)
        .prepare(
          `UPDATE profiles
           SET username = ?2,
               email = ?3,
               nickname = ?4,
               avatar_url = ?5,
               church = ?6,
               rank = ?7,
               age_group = ?8,
               updated_at = ?9
           WHERE id = ?1`,
        )
        .bind(user.id, nextUsername, nextEmail, nextNickname, nextAvatarUrl, nextChurch, nextRank, nextAgeGroup, updatedAt),
    ]);

    try {
      await updateSupabaseShadowUser(env, user.id, {
        email: nextEmail,
        user_metadata: {
          username: nextUsername,
          nickname: nextNickname,
          full_name: nextFullName,
          church_name: nextChurch,
          rank: nextRank,
          phone: nextPhone,
          avatar_url: nextAvatarUrl,
        },
      });
    } catch (shadowError) {
      console.error("legacy auth profile sync failed", shadowError);
    }

    return ok(request, env, await getUserById(env, user.id));
  } catch (error) {
    return fail(request, env, 400, "profile update failed", normalizeErrorMessage(error));
  }
}

async function handleUserDelete(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  if (!user) {
    return fail(request, env, 401, "unauthorized");
  }

  try {
    await deleteFromTableIfExists(env, "app_notifications", "user_id = ?1", [user.id]);
    await deleteFromTableIfExists(env, "push_subscriptions", "user_id = ?1", [user.id]);
    await deleteFromTableIfExists(env, "user_terms_agreements", "user_id = ?1", [user.id]);
    await deleteFromTableIfExists(env, "auth_sessions", "user_id = ?1", [user.id]);
    await deleteFromTableIfExists(env, "profiles", "id = ?1", [user.id]);
    await deleteFromTableIfExists(env, "auth_users", "id = ?1", [user.id]);

    try {
      await deleteSupabaseShadowUser(env, user.id);
    } catch (shadowError) {
      console.error("legacy auth delete sync failed", shadowError);
    }

    return ok(request, env, { success: true }, 200, {
      "Set-Cookie": clearSessionCookie(request, env),
    });
  } catch (error) {
    return fail(request, env, 500, "user delete failed", normalizeErrorMessage(error));
  }
}

async function insertNotifications(
  env: Env,
  rows: Array<{
    user_id: string;
    notification_type: string;
    title: string;
    message: string;
    target_path: string;
    event_key: string | null;
    payload: JsonRecord | null;
    created_at: string;
  }>,
): Promise<void> {
  await requireD1(env).batch(
    rows.map((row) =>
      requireD1(env)
        .prepare(
          `INSERT INTO app_notifications (
            id,
            user_id,
            notification_type,
            title,
            message,
            target_path,
            event_key,
            payload,
            is_read,
            read_at,
            created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, NULL, ?9)
          ON CONFLICT(user_id, event_key) DO UPDATE SET
            notification_type = excluded.notification_type,
            title = excluded.title,
            message = excluded.message,
            target_path = excluded.target_path,
            payload = excluded.payload,
            is_read = 0,
            read_at = NULL,
            created_at = excluded.created_at`,
        )
        .bind(
          crypto.randomUUID(),
          row.user_id,
          row.notification_type,
          row.title,
          row.message,
          row.target_path,
          row.event_key,
          row.payload ? JSON.stringify(row.payload) : null,
          row.created_at,
        ),
    ),
  );
}

async function handlePushSubscribe(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  if (!user) {
    return fail(request, env, 401, "unauthorized");
  }

  const body = await readJsonBody(request);
  const subscription = parsePushSubscription(body?.subscription);
  if (!subscription) {
    return fail(request, env, 400, "invalid push subscription payload");
  }

  try {
    await requireD1(env)
      .prepare(
        `INSERT INTO push_subscriptions (
          user_id,
          endpoint,
          subscription,
          user_agent,
          last_error,
          last_success_at,
          created_at,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, NULL, NULL, ?5, ?5)
        ON CONFLICT(endpoint) DO UPDATE SET
          user_id = excluded.user_id,
          subscription = excluded.subscription,
          user_agent = excluded.user_agent,
          last_error = NULL,
          updated_at = excluded.updated_at`,
      )
      .bind(
        user.id,
        subscription.endpoint,
        JSON.stringify(subscription),
        String(request.headers.get("user-agent") || "").slice(0, 500),
        nowIso(),
      )
      .run();
    return ok(request, env, { success: true });
  } catch (error) {
    return fail(request, env, 500, "failed to save subscription", normalizeErrorMessage(error));
  }
}

async function handlePushUnsubscribe(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  if (!user) {
    return fail(request, env, 401, "unauthorized");
  }

  const body = await readJsonBody(request);
  const endpoint = String(body?.endpoint || "").trim();
  if (!endpoint) {
    return fail(request, env, 400, "endpoint is required");
  }

  try {
    await requireD1(env)
      .prepare("DELETE FROM push_subscriptions WHERE user_id = ?1 AND endpoint = ?2")
      .bind(user.id, endpoint)
      .run();
    return ok(request, env, { success: true });
  } catch (error) {
    return fail(request, env, 500, "failed to delete subscription", normalizeErrorMessage(error));
  }
}

async function handlePushSend(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const providedServerKey = String(request.headers.get("x-push-server-key") || "").trim();
  const expectedServerKey = String(env.PUSH_SERVER_KEY || "").trim();
  const serverAuthorized = Boolean(expectedServerKey) && providedServerKey === expectedServerKey;

  let actorUserId = "";
  if (!serverAuthorized) {
    const actor = await getCurrentUserFromRequest(env, request);
    if (!actor) return fail(request, env, 401, "unauthorized");
    actorUserId = actor.id;
  }

  const title = String(body?.title || "").trim();
  const message = String(body?.body || body?.message || "").trim();
  if (!title || !message) {
    return fail(request, env, 400, "title and body are required");
  }

  const inputUserIds = Array.isArray(body?.userIds)
    ? body.userIds
    : body?.userId
      ? [body.userId]
      : [];
  let targetUserIds = toUniqueStrings(inputUserIds as unknown[]);

  if (!serverAuthorized) {
    if (targetUserIds.length === 0) {
      targetUserIds = [actorUserId];
    }
    if (targetUserIds.some((id) => id !== actorUserId)) {
      return fail(request, env, 403, "only server key can send to other users");
    }
  }

  if (!targetUserIds.length) {
    return ok(request, env, {
      success: true,
      stored: 0,
      skippedPush: true,
      reason: "no targets",
    });
  }

  const createdAt = nowIso();
  const dataPayload = body?.data && typeof body.data === "object" ? (body.data as JsonRecord) : null;
  const tag = String(body?.tag || "").trim();
  const rows = targetUserIds.map((userId) => ({
    user_id: userId,
    notification_type: String((dataPayload?.type as string | undefined) || body?.type || "system"),
    title,
    message,
    target_path: normalizeNotificationTargetPath(body?.url),
    event_key: tag ? `${tag}:${userId}` : null,
    payload: dataPayload,
    created_at: createdAt,
  }));

  try {
    await insertNotifications(env, rows);
    return ok(request, env, {
      success: true,
      stored: rows.length,
      skippedPush: true,
      reason: "web-push delivery is not enabled in this worker build",
    });
  } catch (error) {
    return fail(request, env, 500, "failed to store app notifications", normalizeErrorMessage(error));
  }
}

async function handleNotificationsList(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  if (!user) {
    return fail(request, env, 401, "unauthorized");
  }

  const limit = Math.min(200, Math.max(1, parseInteger(new URL(request.url).searchParams.get("limit"), 80)));
  const rows = await dbAll<{
    id: string;
    notification_type: string;
    title: string;
    message: string;
    target_path: string;
    payload: string | null;
    is_read: number;
    read_at: string | null;
    created_at: string;
  }>(
    requireD1(env)
      .prepare(
        `SELECT id, notification_type, title, message, target_path, payload, is_read, read_at, created_at
         FROM app_notifications
         WHERE user_id = ?1
         ORDER BY created_at DESC
         LIMIT ?2`,
      )
      .bind(user.id, limit),
  );

  return ok(
    request,
    env,
    rows.map((row) => ({
      ...row,
      payload: typeof row.payload === "string" ? parseJsonSafely<JsonRecord>(row.payload) : null,
      is_read: Boolean(row.is_read),
    })),
  );
}

async function handleNotificationRead(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  if (!user) {
    return fail(request, env, 401, "unauthorized");
  }

  const body = await readJsonBody(request);
  const id = String(body?.id || "").trim();
  if (!id) {
    return fail(request, env, 400, "notification id is required");
  }

  await requireD1(env)
    .prepare(
      `UPDATE app_notifications
       SET is_read = 1,
           read_at = ?3
       WHERE id = ?1 AND user_id = ?2`,
    )
    .bind(id, user.id, nowIso())
    .run();

  return ok(request, env, { success: true });
}

async function handleNotificationsReadAll(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUserFromRequest(env, request);
  if (!user) {
    return fail(request, env, 401, "unauthorized");
  }

  await requireD1(env)
    .prepare(
      `UPDATE app_notifications
       SET is_read = 1,
           read_at = ?2
       WHERE user_id = ?1 AND is_read = 0`,
    )
    .bind(user.id, nowIso())
    .run();

  return ok(request, env, { success: true });
}

async function handlePushAction(request: Request, env: Env, pathname: string): Promise<Response> {
  const action = pathname.split("/").pop()?.toLowerCase() || "";
  if (!action) {
    return fail(request, env, 404, "unknown push action");
  }

  if (action === "subscribe") return handlePushSubscribe(request, env);
  if (action === "unsubscribe") return handlePushUnsubscribe(request, env);
  if (action === "send") return handlePushSend(request, env);
  return fail(request, env, 404, "unknown push action");
}

async function routeRequest(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === "/api/health" && request.method === "GET") {
    return ok(request, env, {
      success: true,
      runtime: "cloudflare-worker",
      auth: "custom-d1-cookie",
      timestamp: nowIso(),
    });
  }

  if (pathname === "/api/bible/audio-metadata") {
    if (request.method !== "GET") return fail(request, env, 405, "method not allowed");
    return handleBibleAudioMetadata(request, env);
  }

  if (pathname.startsWith("/api/card-backgrounds/")) {
    if (request.method !== "GET") return fail(request, env, 405, "method not allowed");
    return handleCardBackgroundProxy(request, env, pathname);
  }

  if (pathname === "/api/proxy-image") {
    if (request.method !== "GET") return fail(request, env, 405, "method not allowed");
    return handleGenericImageProxy(request, env);
  }

  if (pathname === "/api/audio/upload") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAudioUpload(request, env);
  }

  if (pathname === "/api/audio/check") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAudioCheck(request, env);
  }

  if (pathname === "/api/audio/delete") {
    if (request.method !== "DELETE") return fail(request, env, 405, "method not allowed");
    return handleAudioDelete(request, env);
  }

  if (pathname === "/api/audio/move") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAudioMove(request, env);
  }

  if (pathname === "/api/file/upload") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleFileUpload(request, env);
  }

  if (pathname === "/api/file/delete") {
    if (request.method !== "DELETE") return fail(request, env, 405, "method not allowed");
    return handleFileDelete(request, env);
  }

  if (pathname === "/api/tts/naver") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleNaverTts(request, env);
  }

  if (pathname === "/api/prayer/transcribe") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handlePrayerTranscribe(request, env);
  }

  if (pathname === "/api/auth/user" || pathname === "/api/auth/me") {
    if (request.method === "GET") return handleAuthUserGet(request, env);
    return fail(request, env, 405, "method not allowed");
  }

  if (pathname === "/api/auth/login") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAuthLogin(request, env);
  }

  if (pathname === "/api/auth/register") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAuthRegister(request, env);
  }

  if (pathname === "/api/auth/logout") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAuthLogout(request, env);
  }

  if (pathname === "/api/auth/check-availability") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAuthCheckAvailability(request, env);
  }

  if (pathname === "/api/auth/find-id") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAuthFindId(request, env);
  }

  if (pathname === "/api/auth/reset-password") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleAuthResetPassword(request, env);
  }

  if (pathname === "/api/auth/oauth/kakao/start") {
    if (request.method !== "GET") return fail(request, env, 405, "method not allowed");
    return handleKakaoOauthStart(request, env);
  }

  if (pathname === "/api/auth/oauth/kakao/callback") {
    if (request.method !== "GET") return fail(request, env, 405, "method not allowed");
    return handleKakaoOauthCallback(request, env);
  }

  if (pathname === "/api/user/profile") {
    if (request.method === "GET") return handleUserProfileGet(request, env);
    if (request.method === "PUT") return handleUserProfileUpdate(request, env);
    return fail(request, env, 405, "method not allowed");
  }

  if (pathname === "/api/user/delete") {
    if (request.method !== "DELETE") return fail(request, env, 405, "method not allowed");
    return handleUserDelete(request, env);
  }

  if (pathname === "/api/notifications") {
    if (request.method !== "GET") return fail(request, env, 405, "method not allowed");
    return handleNotificationsList(request, env);
  }

  if (pathname === "/api/notifications/read") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleNotificationRead(request, env);
  }

  if (pathname === "/api/notifications/read-all") {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handleNotificationsReadAll(request, env);
  }

  if (pathname.startsWith("/api/push/")) {
    if (request.method !== "POST") return fail(request, env, 405, "method not allowed");
    return handlePushAction(request, env, pathname);
  }

  return fail(request, env, 404, "not found");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return noContent(request, env);
    }

    try {
      const response = await routeRequest(request, env);
      return response;
    } catch (error) {
      return fail(request, env, 500, "unexpected error", normalizeErrorMessage(error));
    }
  },
};
