import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type AssetFetcher = { fetch: (request: Request) => Promise<Response> };

interface Env {
  ASSETS: AssetFetcher;
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  KAKAO_ADMIN_KEY?: string;
  FCM_PROJECT_ID?: string;
  FCM_CLIENT_EMAIL?: string;
  FCM_PRIVATE_KEY?: string;
  PUSH_INTERNAL_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SECRET?: string;
}

const ALLOWED_ORIGINS = new Set([
  "https://www.myamen.co.kr",
  "https://myamen.co.kr",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
]);

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://www.myamen.co.kr";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-push-secret",
  };
}

async function verifySupabaseToken(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) return false;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    return res.ok;
  } catch { return false; }
}

function withCorsHeaders(response: Response) {
  return new Response(response.body, response);
}

function json(status: number, body: unknown) {
  return withCorsHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
  );
}

function requireR2Env(env: Env) {
  const rawEndpoint = env.R2_ENDPOINT || "";
  const accessKeyId = env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY || "";
  const bucketName = env.R2_BUCKET_NAME || "";
  const publicUrl = env.R2_PUBLIC_URL || "";
  const endpoint = rawEndpoint.replace(/\/+$/, "").replace(/\/myamen-assets$/i, "");

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw new Error("Missing R2 environment variables");
  }

  return { endpoint, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

function getR2Client(env: Env) {
  const { endpoint, accessKeyId, secretAccessKey } = requireR2Env(env);
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function inferContentType(fileName: string, fallback = "application/octet-stream") {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return fallback;
}

function extractR2Key(fileUrl: string, publicUrl: string) {
  try {
    const url = new URL(fileUrl);
    const publicBase = new URL(publicUrl);
    const basePath = publicBase.pathname.replace(/\/$/, "");
    if (url.origin !== publicBase.origin) {
      return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    }
    if (!url.pathname.startsWith(`${basePath}/`)) {
      return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    }
    return decodeURIComponent(url.pathname.slice(basePath.length + 1));
  } catch {
    return String(fileUrl || "").replace(/^\/+/, "");
  }
}

async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

async function handleCardBackgrounds(request: Request, url: URL) {
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "GET") {
    return json(405, { message: "method not allowed" });
  }

  const file = url.pathname.split("/").pop() || "";
  if (!/^bg\d+\.jpg$/i.test(file)) {
    return json(400, { message: "invalid file" });
  }

  const upstream = `https://audio.myamen.co.kr/card-backgrounds/${encodeURIComponent(file)}`;
  const response = await fetch(upstream, {
    cf: { cacheTtl: 86400, cacheEverything: true },
  });

  if (!response.ok) {
    return json(response.status, { message: "upstream fetch failed" });
  }

  const next = new Response(response.body, response);
  next.headers.set("Cache-Control", "public, max-age=86400");
  return withCorsHeaders(next);
}

const PROXY_IMAGE_ALLOWED_HOSTS = new Set([
  "audio.myamen.co.kr",
  "pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev",
]);

function isAllowedProxyHost(hostname: string): boolean {
  if (PROXY_IMAGE_ALLOWED_HOSTS.has(hostname)) return true;
  // Supabase storage 도메인 허용 (*.supabase.co)
  if (hostname.endsWith(".supabase.co")) return true;
  return false;
}

async function handleProxyImage(request: Request, url: URL) {
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "GET") {
    return json(405, { message: "method not allowed" });
  }

  const raw = url.searchParams.get("url") || "";
  if (!raw) return json(400, { message: "url is required" });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return json(400, { message: "invalid url" });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return json(400, { message: "unsupported protocol" });
  }

  if (!isAllowedProxyHost(target.hostname)) {
    return json(403, { message: "domain not allowed" });
  }

  const response = await fetch(target.toString(), {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!response.ok) {
    return json(response.status, { message: "upstream fetch failed" });
  }

  const next = new Response(response.body, response);
  if (!next.headers.has("Cache-Control")) {
    next.headers.set("Cache-Control", "public, max-age=3600");
  }
  return withCorsHeaders(next);
}

async function handleAudioUpload(request: Request, env: Env) {
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "POST") {
    return json(405, { message: "method not allowed" });
  }
  if (!await verifySupabaseToken(request, env)) {
    return json(401, { success: false, error: "인증이 필요합니다" });
  }

  try {
    const { fileName, audioBase64 } = await parseJson<{ fileName?: string; audioBase64?: string }>(request);
    if (!fileName || !audioBase64) {
      return json(400, { success: false, error: "fileName과 audioBase64가 필요합니다" });
    }

    const { bucketName, publicUrl } = requireR2Env(env);
    const client = getR2Client(env);
    const buffer = Buffer.from(audioBase64, "base64");

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: inferContentType(fileName, "audio/webm"),
      }),
    );

    return json(200, { success: true, publicUrl: `${publicUrl.replace(/\/$/, "")}/${fileName}` });
  } catch (error) {
    console.error("audio upload failed:", error);
    return json(500, { success: false, error: error instanceof Error ? error.message : "업로드 실패" });
  }
}

async function handleAudioDelete(request: Request, env: Env) {
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "DELETE") {
    return json(405, { message: "method not allowed" });
  }
  if (!await verifySupabaseToken(request, env)) {
    return json(401, { success: false, error: "인증이 필요합니다" });
  }

  try {
    const { fileUrl } = await parseJson<{ fileUrl?: string }>(request);
    if (!fileUrl) {
      return json(400, { success: false, error: "fileUrl이 필요합니다" });
    }

    const { bucketName, publicUrl } = requireR2Env(env);
    const client = getR2Client(env);
    const key = extractR2Key(fileUrl, publicUrl);
    if (!key) {
      return json(400, { success: false, error: "invalid fileUrl" });
    }

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );

    return json(200, { success: true });
  } catch (error) {
    console.error("audio delete failed:", error);
    return json(500, { success: false, error: error instanceof Error ? error.message : "삭제 실패" });
  }
}

async function handleAudioMove(request: Request, env: Env) {
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "POST") {
    return json(405, { message: "method not allowed" });
  }
  if (!await verifySupabaseToken(request, env)) {
    return json(401, { success: false, error: "인증이 필요합니다" });
  }

  try {
    const { sourceUrl, targetPath } = await parseJson<{ sourceUrl?: string; targetPath?: string }>(request);
    if (!sourceUrl || !targetPath) {
      return json(400, { success: false, error: "sourceUrl과 targetPath가 필요합니다" });
    }

    const { bucketName, publicUrl } = requireR2Env(env);
    const client = getR2Client(env);
    const sourceKey = extractR2Key(sourceUrl, publicUrl);
    if (!sourceKey) {
      return json(400, { success: false, error: "invalid sourceUrl" });
    }

    await client.send(
      new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${sourceKey}`,
        Key: targetPath,
      }),
    );

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: sourceKey,
      }),
    );

    return json(200, { success: true, publicUrl: `${publicUrl.replace(/\/$/, "")}/${targetPath}` });
  } catch (error) {
    console.error("audio move failed:", error);
    return json(500, { success: false, error: error instanceof Error ? error.message : "파일 이동 실패" });
  }
}

async function handleFileUpload(request: Request, env: Env) {
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "POST") {
    return json(405, { message: "method not allowed" });
  }
  if (!await verifySupabaseToken(request, env)) {
    return json(401, { success: false, error: "인증이 필요합니다" });
  }

  try {
    const { fileName, fileBase64, contentType } = await parseJson<{ fileName?: string; fileBase64?: string; contentType?: string }>(request);
    if (!fileName || !fileBase64) {
      return json(400, { success: false, error: "fileName과 fileBase64가 필요합니다" });
    }

    const { bucketName, publicUrl } = requireR2Env(env);
    const client = getR2Client(env);
    const buffer = Buffer.from(fileBase64, "base64");

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: contentType || inferContentType(fileName),
      }),
    );

    return json(200, { success: true, publicUrl: `${publicUrl.replace(/\/$/, "")}/${fileName}` });
  } catch (error) {
    console.error("file upload failed:", error);
    return json(500, { success: false, error: error instanceof Error ? error.message : "업로드 실패" });
  }
}

async function handleFileDelete(request: Request, env: Env) {
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "DELETE") {
    return json(405, { message: "method not allowed" });
  }
  if (!await verifySupabaseToken(request, env)) {
    return json(401, { success: false, error: "인증이 필요합니다" });
  }

  try {
    const { fileUrl } = await parseJson<{ fileUrl?: string }>(request);
    if (!fileUrl) {
      return json(400, { success: false, error: "fileUrl이 필요합니다" });
    }

    const { bucketName, publicUrl } = requireR2Env(env);
    const client = getR2Client(env);
    const key = extractR2Key(fileUrl, publicUrl);
    if (!key) {
      return json(400, { success: false, error: "invalid fileUrl" });
    }

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );

    return json(200, { success: true, key });
  } catch (error) {
    console.error("file delete failed:", error);
    return json(500, { success: false, error: error instanceof Error ? error.message : "삭제 실패" });
  }
}

async function handleUserDelete(request: Request, env: Env) {
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "DELETE") {
    return json(405, { message: "method not allowed" });
  }

  const supabaseUrl = env.SUPABASE_URL || "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    return json(503, {
      message: "서버 설정 오류",
      detail: !supabaseUrl && !serviceKey
        ? "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 없습니다"
        : !supabaseUrl
          ? "SUPABASE_URL이 없습니다"
          : "SUPABASE_SERVICE_ROLE_KEY가 없습니다",
    });
  }

  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { message: "인증이 필요합니다" });
  }
  const token = authHeader.slice(7);

  try {
    // 1. JWT로 유저 확인
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!userRes.ok) {
      return json(401, { message: "유효하지 않은 토큰입니다" });
    }
    const userData = await userRes.json() as { id?: string; identities?: Array<{ provider: string; identity_data?: { sub?: string }; id?: string }> };
    const userId = userData?.id;
    if (!userId) {
      return json(401, { message: "유저 정보를 가져올 수 없습니다" });
    }

    // 2. Kakao 연동 해제 (비치명적)
    const kakaoAdminKey = env.KAKAO_ADMIN_KEY || "";
    const kakaoIdentity = userData.identities?.find((i) => i.provider === "kakao");
    const kakaoUserId = kakaoIdentity?.identity_data?.sub ?? kakaoIdentity?.id;
    if (kakaoUserId && kakaoAdminKey) {
      try {
        await fetch("https://kapi.kakao.com/v1/user/unlink", {
          method: "POST",
          headers: {
            Authorization: `KakaoAK ${kakaoAdminKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `target_id_type=user_id&target_id=${kakaoUserId}`,
        });
      } catch (e) {
        console.warn("[UserDelete] Kakao unlink 오류 (비치명적):", e);
      }
    }

    // 3. R2 파일 삭제 (비치명적) - profiles.avatar_url, user_meditation_records.audio_url, prayer_records.audio_url
    const publicUrl = env.R2_PUBLIC_URL || "";
    let r2Client: S3Client | null = null;
    try {
      r2Client = getR2Client(env);
    } catch (e) {
      console.warn("[UserDelete] R2 클라이언트 초기화 실패 (비치명적):", e);
    }

    if (r2Client && publicUrl) {
      const { bucketName } = requireR2Env(env);

      // 3-a. 프로필 이미지 삭제
      try {
        const profileRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?select=avatar_url&id=eq.${userId}`,
          { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
        );
        if (profileRes.ok) {
          const profiles = await profileRes.json() as Array<{ avatar_url?: string | null }>;
          const avatarUrl = profiles[0]?.avatar_url;
          if (avatarUrl) {
            const key = extractR2Key(avatarUrl, publicUrl);
            if (key) {
              await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
              console.log("[UserDelete] 프로필 이미지 R2 삭제 완료:", key);
            }
          }
        }
      } catch (e) {
        console.warn("[UserDelete] 프로필 이미지 R2 삭제 실패 (비치명적):", e);
      }

      // 3-b. 묵상 음성 파일 삭제 (user_meditation_records)
      try {
        const meditationRes = await fetch(
          `${supabaseUrl}/rest/v1/user_meditation_records?select=audio_url&user_id=eq.${userId}&audio_url=not.is.null`,
          { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
        );
        if (meditationRes.ok) {
          const records = await meditationRes.json() as Array<{ audio_url?: string | null }>;
          for (const rec of records) {
            if (!rec.audio_url) continue;
            const key = extractR2Key(rec.audio_url, publicUrl);
            if (!key) continue;
            try {
              await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
            } catch (e) {
              console.warn("[UserDelete] 묵상 음성 R2 삭제 실패:", key, e);
            }
          }
          console.log(`[UserDelete] 묵상 음성 ${records.length}개 R2 삭제 처리 완료`);
        }
      } catch (e) {
        console.warn("[UserDelete] 묵상 음성 R2 삭제 실패 (비치명적):", e);
      }

      // 3-c. 기도 음성 파일 삭제 (prayer_records)
      try {
        const prayerRes = await fetch(
          `${supabaseUrl}/rest/v1/prayer_records?select=audio_url&user_id=eq.${userId}&audio_url=not.is.null`,
          { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
        );
        if (prayerRes.ok) {
          const records = await prayerRes.json() as Array<{ audio_url?: string | null }>;
          for (const rec of records) {
            if (!rec.audio_url || rec.audio_url === "amen") continue;
            const key = extractR2Key(rec.audio_url, publicUrl);
            if (!key) continue;
            try {
              await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
            } catch (e) {
              console.warn("[UserDelete] 기도 음성 R2 삭제 실패:", key, e);
            }
          }
          console.log(`[UserDelete] 기도 음성 ${records.length}개 R2 삭제 처리 완료`);
        }
      } catch (e) {
        console.warn("[UserDelete] 기도 음성 R2 삭제 실패 (비치명적):", e);
      }
    }

    // 4. 소유한 그룹 및 관련 데이터 삭제
    const ownedGroupsRes = await fetch(
      `${supabaseUrl}/rest/v1/groups?select=id&owner_id=eq.${userId}`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    );
    if (ownedGroupsRes.ok) {
      const ownedGroups = await ownedGroupsRes.json() as Array<{ id: string }>;
      if (ownedGroups.length > 0) {
        const groupIds = ownedGroups.map((g) => g.id);
        const inFilter = groupIds.map((id) => `"${id}"`).join(",");
        const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" };
        const tables = [
          "activity_group_links", "group_faith_records", "group_faith_items",
          "group_prayer_records", "group_prayer_topics",
          "group_posts", "group_join_requests", "group_members",
        ];
        for (const table of tables) {
          await fetch(`${supabaseUrl}/rest/v1/${table}?group_id=in.(${inFilter})`, { method: "DELETE", headers }).catch(() => {});
        }
        await fetch(`${supabaseUrl}/rest/v1/group_members?user_id=eq.${userId}`, { method: "DELETE", headers }).catch(() => {});
        await fetch(`${supabaseUrl}/rest/v1/groups?id=in.(${inFilter})`, { method: "DELETE", headers }).catch(() => {});
        console.log(`[UserDelete] 소유 그룹 ${groupIds.length}개 삭제 완료`);
      }
    }
    // 다른 그룹 멤버 레코드 제거
    await fetch(
      `${supabaseUrl}/rest/v1/group_members?user_id=eq.${userId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    ).catch(() => {});

    // 5. Supabase Auth 유저 삭제
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    });

    if (!deleteRes.ok) {
      const errBody = await deleteRes.text();
      console.error("[UserDelete] Supabase auth 삭제 실패:", deleteRes.status, errBody);
      return json(500, { message: "회원탈퇴에 실패했습니다", detail: `${deleteRes.status}: ${errBody}` });
    }

    return json(200, { success: true });
  } catch (error) {
    console.error("[UserDelete] 오류:", error);
    return json(500, { message: `서버 오류: ${error instanceof Error ? error.message : String(error)}` });
  }
}

// ── Web Push (VAPID) ────────────────────────────────────────────

function base64urlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const raw = atob(padded);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

async function makeVapidJWT(subject: string, audience: string, publicKeyB64u: string, privateKeyB64u: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: subject })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const signingInput = `${header}.${payload}`;

  // VAPID 개인키(32바이트 스칼라)는 Web Crypto에서 'raw' import 불가 → JWK 포맷 필요
  // 공개키(65바이트 비압축점: 0x04 || x || y)에서 x, y 좌표 추출
  const pubKeyBytes = base64urlToBuffer(publicKeyB64u);
  const xB64u = btoa(String.fromCharCode(...Array.from(pubKeyBytes.slice(1, 33)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const yB64u = btoa(String.fromCharCode(...Array.from(pubKeyBytes.slice(33, 65)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKeyB64u, x: xB64u, y: yB64u },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sigB64u = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${signingInput}.${sigB64u}`;
}

/** RFC 5869 HKDF helpers using HMAC directly (Web Crypto doesn't expose Extract/Expand separately) */
async function hmacSha256(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

/**
 * RFC 8291 + RFC 8188 aes128gcm Web Push encryption.
 * Replaces the legacy aesgcm method which Chrome dropped support for.
 */
async function encryptWebPushPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
): Promise<Uint8Array> {
  const uaPublic = base64urlToBuffer(subscription.keys.p256dh);   // 65 bytes (P-256 uncompressed)
  const authSecret = base64urlToBuffer(subscription.keys.auth);    // 16 bytes

  // Generate application server (sender) key pair
  const asKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKP.publicKey));

  // ECDH shared secret
  const uaCK = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaCK }, asKP.privateKey, 256));

  // Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291 §3.3: IKM derivation
  // PRK = HKDF-Extract(auth_secret, ecdh_secret) = HMAC-SHA-256(auth_secret, ecdh_secret)
  const prk = await hmacSha256(authSecret, ecdhSecret);
  // key_info = "WebPush: info\x00" || ua_public || as_public
  // IKM = HKDF-Expand(prk, key_info, 32) = HMAC-SHA-256(prk, key_info || 0x01)[:32]
  const keyInfo = concatBytes(new TextEncoder().encode('WebPush: info\x00'), uaPublic, asPublic, new Uint8Array([1]));
  const ikm = (await hmacSha256(prk, keyInfo)).slice(0, 32);

  // RFC 8188 §2.2: CEK and Nonce derivation
  // PRK2 = HKDF-Extract(salt, IKM) = HMAC-SHA-256(salt, IKM)
  const prk2 = await hmacSha256(salt, ikm);
  // CEK (16 bytes) = HKDF-Expand(prk2, "Content-Encoding: aes128gcm\x00", 16)
  const cek = (await hmacSha256(prk2, concatBytes(new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), new Uint8Array([1])))).slice(0, 16);
  // Nonce (12 bytes) = HKDF-Expand(prk2, "Content-Encoding: nonce\x00", 12)
  const nonce = (await hmacSha256(prk2, concatBytes(new TextEncoder().encode('Content-Encoding: nonce\x00'), new Uint8Array([1])))).slice(0, 12);

  // Encrypt: AES-128-GCM(cek, nonce, payload || 0x02)  [0x02 = last-record delimiter]
  const plaintext = concatBytes(new TextEncoder().encode(payload), new Uint8Array([2]));
  const cekCK = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekCK, plaintext));

  // RFC 8188 §2.1 header: salt(16) || rs(4 BE) || idlen(1) || id(65 = as_public)
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false); // rs = 4096 (standard)
  header[20] = 65; // idlen
  header.set(asPublic, 21);

  return concatBytes(header, ciphertext);
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  title: string,
  body: string,
  data: Record<string, string>,
  env: Env
): Promise<boolean> {
  try {
    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const subject = env.VAPID_SUBJECT || 'mailto:admin@myamen.co.kr';
    if (!vapidPublicKey || !vapidPrivateKey) return false;

    const audience = new URL(subscription.endpoint).origin;
    const jwt = await makeVapidJWT(subject, audience, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({ title, body, data });
    const encryptedBody = await encryptWebPushPayload(subscription, payload);

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: encryptedBody,
    });
    if (!res.ok && res.status !== 201) {
      const body = await res.text().catch(() => '');
      console.error(`WebPush delivery failed: status=${res.status} endpoint=${subscription.endpoint.slice(0, 60)} body=${body}`);
    }
    return res.status === 201 || res.ok;
  } catch (e) {
    console.error('WebPush send error:', e);
    return false;
  }
}

// ── FCM 푸시 알림 ──────────────────────────────────────────────

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function objToBase64url(obj: object): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function makeFCMJWT(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = objToBase64url({ alg: 'RS256', typ: 'JWT' });
  const payload = objToBase64url({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const signingInput = `${header}.${payload}`;
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBuffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64urlEncode(signature)}`;
}

let _fcmAccessToken: string | null = null;
let _fcmTokenExpiry = 0;

async function getFCMAccessToken(env: Env): Promise<string> {
  if (_fcmAccessToken && Date.now() < _fcmTokenExpiry) return _fcmAccessToken;
  const pem = (env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const jwt = await makeFCMJWT(env.FCM_CLIENT_EMAIL!, pem);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('FCM 액세스 토큰 획득 실패');
  _fcmAccessToken = data.access_token;
  _fcmTokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
  return _fcmAccessToken;
}

async function sendFCMMessage(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  env: Env
): Promise<boolean> {
  try {
    const accessToken = await getFCMAccessToken(env);
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data,
            android: { priority: 'high', notification: { channel_id: 'myamen_alert_v2', sound: 'default', default_sound: true, default_vibrate_timings: true } },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error('FCM send error:', e);
    return false;
  }
}

async function getSupabaseUserId(token: string, env: Env): Promise<string | null> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
    },
  });
  if (!res.ok) return null;
  const user = await res.json() as { id?: string };
  return user.id || null;
}

async function handleNaverTTS(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (request.method !== 'POST') return json(405, { message: 'method not allowed' });
  if (!await verifySupabaseToken(request, env)) return json(401, { error: '인증이 필요합니다' });

  const { text, cacheKey } = await request.json() as { text: string; cacheKey: string };
  if (!text || !cacheKey) return json(400, { message: 'text and cacheKey required' });

  const { publicUrl: publicBase, bucketName } = requireR2Env(env);
  const s3 = getR2Client(env);
  const r2Key = `tts/qt/${cacheKey}.mp3`;
  const publicUrl = `${publicBase}/${r2Key}`;

  // R2에 캐시된 파일이 있으면 바로 반환
  try {
    const headRes = await fetch(publicUrl, { method: 'HEAD' });
    if (headRes.ok) {
      return json(200, { audio_url: publicUrl, cached: true });
    }
  } catch (_) {}

  // Naver Clova Voice API — Application 키 인증
  const naverRes = await fetch('https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-NCP-APIGW-API-KEY-ID': env.NAVER_CLIENT_ID || '',
      'X-NCP-APIGW-API-KEY': env.NAVER_CLIENT_SECRET || '',
    },
    body: new URLSearchParams({
      speaker: 'nsunkyung',
      volume: '0',
      speed: '1',
      pitch: '0',
      format: 'mp3',
      text: text.slice(0, 5000),
    }),
  });

  if (!naverRes.ok) {
    const errText = await naverRes.text();
    return json(500, { message: `naver tts error: ${naverRes.status}`, detail: errText });
  }

  const audioBuffer = await naverRes.arrayBuffer();

  // R2에 저장
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: r2Key,
    Body: new Uint8Array(audioBuffer),
    ContentType: 'audio/mpeg',
  }));

  return json(200, { audio_url: publicUrl, cached: false });
}

async function handleElevenLabsTTS(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (request.method !== 'POST') return json(405, { message: 'method not allowed' });
  if (!await verifySupabaseToken(request, env)) return json(401, { error: '인증이 필요합니다' });

  const { text, cacheKey, verseOffsets } = await request.json() as {
    text: string;
    cacheKey: string;
    verseOffsets?: { verse: number; offset: number }[];
  };
  if (!text || !cacheKey) return json(400, { message: 'text and cacheKey required' });

  const { publicUrl: publicBase, bucketName } = requireR2Env(env);
  const s3 = getR2Client(env);
  const audioKey = `tts/qt/${cacheKey}.mp3`;
  const timingKey = `tts/qt/${cacheKey}.json`;
  const audioUrl = `${publicBase}/${audioKey}`;
  const timingUrl = `${publicBase}/${timingKey}`;

  // R2에 캐시된 파일이 있으면 바로 반환
  try {
    const headRes = await fetch(audioUrl, { method: 'HEAD' });
    if (headRes.ok) {
      return json(200, { audio_url: audioUrl, timing_url: timingUrl, cached: true });
    }
  } catch (_) {}

  // ElevenLabs TTS with-timestamps API
  const apiKey = env.ELEVENLABS_API_KEY || '';
  const voiceId = env.ELEVENLABS_VOICE_ID || 'cgSgspJ2msm6clMCkdW9';
  const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.slice(0, 5000),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!elevenRes.ok) {
    const errText = await elevenRes.text();
    return json(500, { message: `elevenlabs tts error: ${elevenRes.status}`, detail: errText });
  }

  const payload = await elevenRes.json() as {
    audio_base64: string;
    alignment: {
      characters: string[];
      character_start_times_seconds: number[];
      character_end_times_seconds: number[];
    };
  };

  // base64 오디오 디코딩
  const binaryStr = atob(payload.audio_base64);
  const audioBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    audioBytes[i] = binaryStr.charCodeAt(i);
  }

  // 절별 타이밍 계산
  const startTimes = payload.alignment?.character_start_times_seconds ?? [];
  let verseTiming: { verse: number; start_ms: number }[] = [];
  if (verseOffsets && verseOffsets.length > 0 && startTimes.length > 0) {
    verseTiming = verseOffsets.map(({ verse, offset }) => {
      const sec = startTimes[Math.min(offset, startTimes.length - 1)] ?? 0;
      return { verse, start_ms: Math.round(sec * 1000) };
    });
  }

  // R2에 오디오 + 타이밍 JSON 저장
  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: audioKey,
      Body: audioBytes,
      ContentType: 'audio/mpeg',
    })),
    s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: timingKey,
      Body: JSON.stringify(verseTiming),
      ContentType: 'application/json',
    })),
  ]);

  return json(200, { audio_url: audioUrl, timing_url: timingUrl, cached: false });
}

async function handlePushSubscribe(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (request.method !== 'POST') return json(405, { message: 'method not allowed' });

  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { message: '인증이 필요합니다' });

  const userId = await getSupabaseUserId(authHeader.slice(7), env);
  if (!userId) return json(401, { message: '유효하지 않은 토큰입니다' });

  const body = await parseJson<{ channel: string; token?: string; platform?: string; subscription?: object }>(request);
  const supaUrl = env.SUPABASE_URL!;
  const svcKey = env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = {
    Authorization: `Bearer ${svcKey}`,
    apikey: svcKey,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  };

  if (body.channel === 'fcm' && body.token) {
    // 기존 구독 삭제 후 새로 등록 (중복 방지)
    await fetch(`${supaUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&channel=eq.fcm`, {
      method: 'DELETE', headers,
    });
    await fetch(`${supaUrl}/rest/v1/push_subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id: userId, channel: 'fcm', platform: body.platform || 'android', device_token: body.token }),
    });
  } else if (body.channel === 'webpush' && body.subscription) {
    // 기존 webpush 구독 삭제 후 새로 등록 (중복 방지)
    await fetch(`${supaUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&channel=eq.webpush`, {
      method: 'DELETE', headers,
    });
    await fetch(`${supaUrl}/rest/v1/push_subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id: userId, channel: 'webpush', platform: 'web', subscription: body.subscription }),
    });
  }
  return json(200, { success: true });
}

async function handlePushUnsubscribe(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (request.method !== 'POST') return json(405, { message: 'method not allowed' });

  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { message: '인증이 필요합니다' });

  const userId = await getSupabaseUserId(authHeader.slice(7), env);
  if (!userId) return json(401, { message: '유효하지 않은 토큰입니다' });

  const body = await parseJson<{ channel: string; token?: string; endpoint?: string }>(request);
  const supaUrl = env.SUPABASE_URL!;
  const svcKey = env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = { Authorization: `Bearer ${svcKey}`, apikey: svcKey };

  if (body.channel === 'fcm' && body.token) {
    await fetch(`${supaUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&channel=eq.fcm&device_token=eq.${encodeURIComponent(body.token)}`, {
      method: 'DELETE', headers,
    });
  } else if (body.channel === 'webpush') {
    await fetch(`${supaUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&channel=eq.webpush`, {
      method: 'DELETE', headers,
    });
  }
  return json(200, { success: true });
}

async function handlePushSend(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (request.method !== 'POST') return json(405, { message: 'method not allowed' });

  const secret = request.headers.get('x-push-secret') || '';
  if (!env.PUSH_INTERNAL_SECRET || secret !== env.PUSH_INTERNAL_SECRET) {
    return json(401, { message: '인증 실패' });
  }

  const body = await parseJson<{
    userId: string;
    title: string;
    body: string;
    targetPath?: string;
    notificationType?: "groupActivity" | "system";
  }>(request);


  const supaUrl = env.SUPABASE_URL!;
  const svcKey = env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = { Authorization: `Bearer ${svcKey}`, apikey: svcKey };

  // 수신자 알림 설정 확인
  if (body.notificationType) {
    const settingsRes = await fetch(
      `${supaUrl}/rest/v1/user_notification_settings?user_id=eq.${body.userId}&select=push_enabled,group_activity_enabled,system_enabled`,
      { headers }
    );
    const settingsRows = await settingsRes.json() as Array<{
      push_enabled: boolean;
      group_activity_enabled: boolean;
      system_enabled: boolean;
    }>;
    if (settingsRows.length > 0) {
      const s = settingsRows[0];
      if (!s.push_enabled) return json(200, { success: true, sent: 0, total: 0 });
      if (body.notificationType === "groupActivity" && !s.group_activity_enabled)
        return json(200, { success: true, sent: 0, total: 0 });
      if (body.notificationType === "system" && !s.system_enabled)
        return json(200, { success: true, sent: 0, total: 0 });
    }
  }

  const data: Record<string, string> = {};
  if (body.targetPath) data.targetPath = body.targetPath;

  // FCM 구독 발송
  const fcmRes = await fetch(
    `${supaUrl}/rest/v1/push_subscriptions?user_id=eq.${body.userId}&channel=eq.fcm`,
    { headers }
  );
  const fcmSubs = await fcmRes.json() as Array<{ device_token: string }>;
  const fcmResults = await Promise.allSettled(
    fcmSubs.map(s => sendFCMMessage(s.device_token, body.title, body.body, data, env))
  );

  // WebPush 구독 발송
  const webRes = await fetch(
    `${supaUrl}/rest/v1/push_subscriptions?user_id=eq.${body.userId}&channel=eq.webpush`,
    { headers }
  );
  const webSubs = await webRes.json() as Array<{ subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }>;
  const webResults = await Promise.allSettled(
    webSubs.filter(s => s.subscription?.endpoint && s.subscription?.keys).map(s =>
      sendWebPush(s.subscription, body.title, body.body, data, env)
    )
  );

  const sent = [...fcmResults, ...webResults].filter(r => r.status === 'fulfilled' && r.value).length;
  const total = fcmSubs.length + webSubs.length;
  return json(200, { success: true, sent, total });
}

// ── 그룹 멤버 전체 푸시 (JWT 인증, 서버에서 멤버십 검증) ──────────────
async function handlePushSendGroup(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (request.method !== 'POST') return json(405, { message: 'method not allowed' });

  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { message: '인증이 필요합니다' });

  const senderId = await getSupabaseUserId(authHeader.slice(7), env);
  if (!senderId) return json(401, { message: '유효하지 않은 토큰입니다' });

  const body = await parseJson<{
    groupId: string;
    title: string;
    body: string;
    targetPath?: string;
    targetUserIds?: string[];  // 지정 시 해당 유저들에게만 발송
    notificationType?: "groupActivity" | "system";
  }>(request);

  if (!body.groupId) return json(400, { message: 'groupId가 필요합니다' });

  const supaUrl = env.SUPABASE_URL!;
  const svcKey = env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = { Authorization: `Bearer ${svcKey}`, apikey: svcKey };

  // 발신자가 그룹 멤버 또는 오너인지 검증
  const groupRes = await fetch(
    `${supaUrl}/rest/v1/groups?id=eq.${body.groupId}&select=owner_id`,
    { headers }
  );
  const groups = await groupRes.json() as Array<{ owner_id: string }>;
  if (!groups.length) return json(404, { message: '그룹을 찾을 수 없습니다' });
  const isOwner = groups[0].owner_id === senderId;

  if (!isOwner) {
    const memberRes = await fetch(
      `${supaUrl}/rest/v1/group_members?group_id=eq.${body.groupId}&user_id=eq.${senderId}&select=user_id`,
      { headers }
    );
    const memberRows = await memberRes.json() as Array<{ user_id: string }>;
    if (!memberRows.length) {
      // 일반 멤버가 아닌 경우 상위 리더인지 확인
      const scopeRes = await fetch(
        `${supaUrl}/rest/v1/group_scope_leaders?root_group_id=eq.${body.groupId}&user_id=eq.${senderId}&select=id`,
        { headers }
      );
      const scopeRows = await scopeRes.json() as Array<{ id: string }>;
      if (!scopeRows.length) return json(403, { message: '그룹 멤버가 아닙니다' });
    }
  }

  // 수신 대상 결정
  let targetIds: string[];
  if (body.targetUserIds && body.targetUserIds.length > 0) {
    targetIds = body.targetUserIds.filter(id => id !== senderId);
  } else {
    // 그룹 전체 멤버 (발신자 제외)
    const allMembersRes = await fetch(
      `${supaUrl}/rest/v1/group_members?group_id=eq.${body.groupId}&select=user_id`,
      { headers }
    );
    const allMembers = await allMembersRes.json() as Array<{ user_id: string }>;
    const ownerRes = await fetch(
      `${supaUrl}/rest/v1/groups?id=eq.${body.groupId}&select=owner_id`,
      { headers }
    );
    const ownerRows = await ownerRes.json() as Array<{ owner_id: string }>;
    const allIds = new Set([
      ...allMembers.map(m => m.user_id),
      ...ownerRows.map(o => o.owner_id),
    ]);
    allIds.delete(senderId);
    targetIds = Array.from(allIds);
  }

  const data: Record<string, string> = {};
  if (body.targetPath) data.targetPath = body.targetPath;

  // 수신자별 알림 설정 일괄 조회
  const notifType = body.notificationType || "groupActivity";
  if (targetIds.length > 0) {
    const settingsRes = await fetch(
      `${supaUrl}/rest/v1/user_notification_settings?user_id=in.(${targetIds.join(",")})&select=user_id,push_enabled,group_activity_enabled,system_enabled`,
      { headers }
    );
    const settingsRows = await settingsRes.json() as Array<{
      user_id: string;
      push_enabled: boolean;
      group_activity_enabled: boolean;
      system_enabled: boolean;
    }>;
    const settingsMap = new Map(settingsRows.map(s => [s.user_id, s]));
    targetIds = targetIds.filter(userId => {
      const s = settingsMap.get(userId);
      if (!s) return true; // 설정 없으면 기본값(허용)
      if (!s.push_enabled) return false;
      if (notifType === "groupActivity" && !s.group_activity_enabled) return false;
      if (notifType === "system" && !s.system_enabled) return false;
      return true;
    });
  }

  let sent = 0;
  for (const userId of targetIds) {
    // app_notifications 기록
    await fetch(`${supaUrl}/rest/v1/app_notifications`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        notification_type: notifType,
        title: body.title,
        message: body.body,
        target_path: body.targetPath || '/',
        payload: data,
      }),
    });

    // FCM
    const fcmRes = await fetch(
      `${supaUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&channel=eq.fcm`,
      { headers }
    );
    const fcmSubs = await fcmRes.json() as Array<{ device_token: string }>;
    const fcmResults = await Promise.allSettled(
      fcmSubs.map(s => sendFCMMessage(s.device_token, body.title, body.body, data, env))
    );

    // WebPush
    const webRes = await fetch(
      `${supaUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&channel=eq.webpush`,
      { headers }
    );
    const webSubs = await webRes.json() as Array<{ subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }>;
    const webResults = await Promise.allSettled(
      webSubs.filter(s => s.subscription?.endpoint && s.subscription?.keys).map(s =>
        sendWebPush(s.subscription, body.title, body.body, data, env)
      )
    );

    sent += [...fcmResults, ...webResults].filter(r => r.status === 'fulfilled' && r.value).length;
  }

  return json(200, { success: true, sent, total: targetIds.length });
}

const ADMIN_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(payload, secret);
  return expected === signature;
}

async function handleAdminLogin(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (request.method !== 'POST') return json(405, { message: 'method not allowed' });

  const { username, password } = await request.json() as { username: string; password: string };
  const expectedUser = env.ADMIN_USERNAME;
  const expectedPass = env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return json(503, { error: 'server config error' });

  if (username !== expectedUser || password !== expectedPass) {
    return json(401, { error: 'unauthorized' });
  }

  const secret = env.ADMIN_SECRET;
  if (!secret) return json(503, { error: 'server config error' });

  const exp = Date.now() + ADMIN_TOKEN_EXPIRY_MS;
  const payload = `${username}:${exp}`;
  const signature = await hmacSign(payload, secret);
  const token = btoa(JSON.stringify({ payload, signature }));
  return json(200, { token });
}

async function handleAdminStats(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (request.method !== 'GET') return json(405, { message: 'method not allowed' });

  if (!await verifyAdminToken(request, env)) return json(401, { error: 'unauthorized' });

  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) {
    return json(503, { error: 'server config error' });
  }

  const sbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  // KST 기준 날짜 계산
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + kstOffset);
  const todayStr = kstNow.toISOString().slice(0, 10);
  const weekAgoStr = new Date(kstNow.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgoStr = new Date(kstNow.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    dauRes, wauRes, totalUsersRes,
    menuStatsRes, recentEventsRes, platformRes, dailyTrendRes,
  ] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/user_event_logs?select=user_id&created_at=gte.${todayStr}T00:00:00%2B09:00&user_id=not.is.null`, { headers: sbHeaders }),
    fetch(`${supabaseUrl}/rest/v1/user_event_logs?select=user_id&created_at=gte.${weekAgoStr}T00:00:00%2B09:00&user_id=not.is.null`, { headers: sbHeaders }),
    fetch(`${supabaseUrl}/rest/v1/profiles?select=id`, { headers: sbHeaders }),
    fetch(`${supabaseUrl}/rest/v1/user_event_logs?select=menu,action&created_at=gte.${monthAgoStr}T00:00:00%2B09:00`, { headers: sbHeaders }),
    fetch(`${supabaseUrl}/rest/v1/user_event_logs?select=menu,action,metadata,platform,created_at,user_id&order=created_at.desc&limit=50`, { headers: sbHeaders }),
    fetch(`${supabaseUrl}/rest/v1/user_event_logs?select=platform&created_at=gte.${monthAgoStr}T00:00:00%2B09:00`, { headers: sbHeaders }),
    fetch(`${supabaseUrl}/rest/v1/user_event_logs?select=created_at,user_id&created_at=gte.${monthAgoStr}T00:00:00%2B09:00&order=created_at.asc`, { headers: sbHeaders }),
  ]);

  const [
    dauData, wauData, totalUsersData,
    menuStatsData, recentEventsData, platformData, dailyTrendData,
  ] = await Promise.all([
    dauRes.json(),
    wauRes.json(),
    totalUsersRes.json(),
    menuStatsRes.json(),
    recentEventsRes.json(),
    platformRes.json(),
    dailyTrendRes.json(),
  ]) as any[];

  // DAU / WAU 계산
  const dau = new Set((dauData as any[]).map((r: any) => r.user_id)).size;
  const wau = new Set((wauData as any[]).map((r: any) => r.user_id)).size;
  const totalUsers = Array.isArray(totalUsersData) ? totalUsersData.length : 0;

  // 메뉴별 이벤트 카운트 및 액션 카운트 (30일)
  const menuCounts: Record<string, number> = {};
  const actionCounts: Record<string, Record<string, number>> = {};
  for (const row of (menuStatsData as any[])) {
    const menu = row.menu || 'unknown';
    menuCounts[menu] = (menuCounts[menu] || 0) + 1;
    if (!actionCounts[menu]) actionCounts[menu] = {};
    const action = row.action || 'unknown';
    actionCounts[menu][action] = (actionCounts[menu][action] || 0) + 1;
  }

  // 플랫폼 분포
  const platformCounts: Record<string, number> = {};
  for (const row of (platformData as any[])) {
    const p = row.platform || 'web';
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  }

  // 일별 트렌드 (30일)
  const dailyCounts: Record<string, { events: number; users: Set<string> }> = {};
  for (const row of (dailyTrendData as any[])) {
    const day = new Date(new Date(row.created_at).getTime() + kstOffset).toISOString().slice(0, 10);
    if (!dailyCounts[day]) dailyCounts[day] = { events: 0, users: new Set() };
    dailyCounts[day].events++;
    if (row.user_id) dailyCounts[day].users.add(row.user_id);
  }
  const dailyTrend = Object.entries(dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, events: v.events, dau: v.users.size }));

  return json(200, {
    dau,
    wau,
    totalUsers,
    todayEvents: (dauData as any[]).length,
    menuCounts,
    actionCounts,
    platformCounts,
    recentEvents: recentEventsData,
    dailyTrend,
  });
}

async function verifyAdminToken(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;
  const secret = env.ADMIN_SECRET;
  if (!secret) return false;
  try {
    const { payload, signature } = JSON.parse(atob(token)) as { payload: string; signature: string };
    if (!payload || !signature) return false;
    // 만료시간 확인
    const parts = payload.split(':');
    const exp = parseInt(parts[parts.length - 1], 10);
    if (isNaN(exp) || Date.now() > exp) return false;
    // HMAC 서명 검증
    return await hmacVerify(payload, signature, secret);
  } catch { return false; }
}

async function handleAdminUsers(request: Request, env: Env) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (!await verifyAdminToken(request, env)) return json(401, { error: 'unauthorized' });

  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  const kstOffset = 9 * 60 * 60 * 1000;
  const monthAgo = new Date(Date.now() + kstOffset - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [profilesRes, eventsRes, groupMembersRes, authUsersRes, prayerTopicsRes, notifSettingsRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/profiles?select=id,username,email,nickname,avatar_url,created_at,is_admin&order=created_at.desc`, { headers: h }),
    fetch(`${supabaseUrl}/rest/v1/user_event_logs?select=user_id,menu,created_at,platform&user_id=not.is.null&created_at=gte.${monthAgo}T00:00:00%2B09:00`, { headers: h }),
    fetch(`${supabaseUrl}/rest/v1/group_members?select=user_id,groups(id,name)`, { headers: h }),
    fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, { headers: h }),
    fetch(`${supabaseUrl}/rest/v1/group_prayer_topics?select=author_id,id&is_active=eq.true`, { headers: h }),
    fetch(`${supabaseUrl}/rest/v1/user_notification_settings?select=user_id,push_enabled`, { headers: h }),
  ]);

  const profilesData = await profilesRes.json() as any;
  const eventsData = await eventsRes.json() as any;
  const groupMembersData = await groupMembersRes.json() as any;
  const authUsersData = await authUsersRes.json() as any;
  const prayerTopicsData = await prayerTopicsRes.json() as any;
  const notifSettingsData = await notifSettingsRes.json() as any;

  // auth provider 매핑 (user_id → provider)
  const providerMap: Record<string, string> = {};
  const authUsers = Array.isArray(authUsersData?.users) ? authUsersData.users : [];
  for (const u of authUsers) {
    const provider = u.app_metadata?.provider || u.identities?.[0]?.provider || null;
    if (u.id && provider) providerMap[u.id] = provider;
  }

  if (!Array.isArray(profilesData)) {
    return json(500, { error: 'profiles_fetch_failed', status: profilesRes.status, detail: profilesData });
  }

  const profiles = profilesData as any[];
  const events = Array.isArray(eventsData) ? eventsData as any[] : [];
  const groupMembers = Array.isArray(groupMembersData) ? groupMembersData as any[] : [];

  // 유저별 알림 설정 매핑 (user_id → push_enabled)
  const pushEnabledMap: Record<string, boolean> = {};
  if (Array.isArray(notifSettingsData)) {
    for (const ns of notifSettingsData as any[]) {
      if (ns.user_id != null) pushEnabledMap[ns.user_id] = ns.push_enabled;
    }
  }

  // 유저별 기도제목 수 집계
  const prayerTopicCountMap: Record<string, number> = {};
  if (Array.isArray(prayerTopicsData)) {
    for (const pt of prayerTopicsData as any[]) {
      if (!pt.author_id) continue;
      prayerTopicCountMap[pt.author_id] = (prayerTopicCountMap[pt.author_id] || 0) + 1;
    }
  }

  // 유저별 그룹 집계
  const userGroups: Record<string, { id: string; name: string }[]> = {};
  for (const m of groupMembers) {
    const uid = m.user_id;
    const g = m.groups;
    if (!uid || !g?.id) continue;
    if (!userGroups[uid]) userGroups[uid] = [];
    if (!userGroups[uid].find((x) => x.id === g.id)) userGroups[uid].push({ id: g.id, name: g.name });
  }

  // 유저별 이벤트 집계
  const todayKST = new Date(Date.now() + kstOffset).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() + kstOffset - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const userStats: Record<string, { total: number; dau: number; wau: number; lastAt: string; lastBrowser: string; menus: Record<string, number> }> = {};
  for (const ev of events) {
    const uid = ev.user_id;
    if (!userStats[uid]) userStats[uid] = { total: 0, dau: 0, wau: 0, lastAt: '', lastBrowser: '', menus: {} };
    userStats[uid].total++;
    if (!userStats[uid].lastAt || ev.created_at > userStats[uid].lastAt) {
      userStats[uid].lastAt = ev.created_at;
      if (ev.platform) userStats[uid].lastBrowser = ev.platform;
    }
    userStats[uid].menus[ev.menu] = (userStats[uid].menus[ev.menu] || 0) + 1;
    const evDateKST = new Date(new Date(ev.created_at).getTime() + kstOffset).toISOString().slice(0, 10);
    if (evDateKST >= todayKST) userStats[uid].dau++;
    if (evDateKST >= weekAgo) userStats[uid].wau++;
  }

  const result = profiles.map((p: any) => {
    const s = userStats[p.id];
    const topMenu = s ? Object.entries(s.menus).sort(([,a],[,b]) => (b as number)-(a as number))[0]?.[0] : null;
    return {
      ...p,
      auth_provider: providerMap[p.id] || null,
      totalEvents: s?.total || 0, dau: s?.dau || 0, wau: s?.wau || 0,
      lastEventAt: s?.lastAt || null,
      last_browser: s?.lastBrowser || null,
      topMenu,
      groups: userGroups[p.id] || [],
      prayerTopicCount: prayerTopicCountMap[p.id] || 0,
      push_enabled: pushEnabledMap[p.id] ?? null,
    };
  });

  return json(200, result);
}

async function handleAdminUserPrayerTopics(request: Request, env: Env, userId: string) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (!await verifyAdminToken(request, env)) return json(401, { error: 'unauthorized' });

  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/group_prayer_topics?select=id,content,created_at,groups(id,name)&author_id=eq.${userId}&is_active=eq.true&order=created_at.desc`,
    { headers: h }
  );
  const data = await res.json();
  return json(res.ok ? 200 : 400, data);
}

async function handleAdminUserStats(request: Request, env: Env, userId: string) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (!await verifyAdminToken(request, env)) return json(401, { error: 'unauthorized' });

  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  const [profileRes, eventsRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/profiles?select=id,username,nickname,avatar_url,created_at,is_admin&id=eq.${userId}`, { headers: h }),
    fetch(`${supabaseUrl}/rest/v1/user_event_logs?select=menu,action,metadata,platform,created_at&user_id=eq.${userId}&order=created_at.desc&limit=100`, { headers: h }),
  ]);

  const profiles = await profileRes.json() as any[];
  const events = await eventsRes.json() as any[];

  const menuCounts: Record<string, number> = {};
  const actionCounts: Record<string, Record<string, number>> = {};
  for (const ev of events) {
    menuCounts[ev.menu] = (menuCounts[ev.menu] || 0) + 1;
    if (!actionCounts[ev.menu]) actionCounts[ev.menu] = {};
    actionCounts[ev.menu][ev.action] = (actionCounts[ev.menu][ev.action] || 0) + 1;
  }

  return json(200, { profile: profiles[0] || null, menuCounts, actionCounts, recentEvents: events.slice(0, 30) });
}

async function handleAdminUpdateUser(request: Request, env: Env, userId: string) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (!await verifyAdminToken(request, env)) return json(401, { error: 'unauthorized' });

  const body = await request.json() as { nickname?: string; is_admin?: boolean };
  const update: Record<string, unknown> = {};
  if (body.nickname !== undefined) update.nickname = body.nickname;
  if (body.is_admin !== undefined) update.is_admin = body.is_admin;
  if (Object.keys(update).length === 0) return json(400, { error: 'no fields to update' });

  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH', headers: h, body: JSON.stringify(update),
  });
  const data = await res.json();
  return json(res.ok ? 200 : 400, data);
}

async function handleAdminDeleteUser(request: Request, env: Env, userId: string) {
  if (request.method === 'OPTIONS') return withCorsHeaders(new Response(null, { status: 204 }));
  if (!await verifyAdminToken(request, env)) return json(401, { error: 'unauthorized' });

  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  // Supabase auth 유저 삭제 (cascade로 profiles, 관련 데이터 삭제)
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE', headers: h,
  });
  if (!res.ok) {
    const err = await res.text();
    return json(400, { error: err });
  }
  return json(200, { ok: true });
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function handleAppUpdateCheck(request: Request, url: URL, env: Env) {
  const platform = url.searchParams.get("platform") || "android";
  const currentVersion = url.searchParams.get("currentVersion") || "0.0.0";
  console.log(`[OTA-CHECK] platform=${platform} currentVersion=${currentVersion} ua=${request.headers.get("user-agent")?.slice(0,80)}`);

  try {
    const { bucketName } = requireR2Env(env);
    const s3 = getR2Client(env);
    const key = `app-bundles/version-${platform}.json`;
    const cmd = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const result = await s3.send(cmd);
    const body = await (result.Body as any)?.transformToString?.() ?? "";
    if (!body) return json(200, { needsUpdate: false });

    const info = JSON.parse(body) as { latestVersion: string; bundleUrl: string };
    const needsUpdate = compareVersions(info.latestVersion, currentVersion) > 0;

    return json(200, {
      needsUpdate,
      latestVersion: info.latestVersion,
      bundleUrl: needsUpdate ? info.bundleUrl : null,
    });
  } catch {
    return json(200, { needsUpdate: false });
  }
}

async function handleApi(request: Request, url: URL, env: Env) {
  if (url.pathname.startsWith("/api/card-backgrounds/")) {
    return handleCardBackgrounds(request, url);
  }
  if (url.pathname === "/api/proxy-image") {
    return handleProxyImage(request, url);
  }
  if (url.pathname === "/api/audio/upload") {
    return handleAudioUpload(request, env);
  }
  if (url.pathname === "/api/audio/delete") {
    return handleAudioDelete(request, env);
  }
  if (url.pathname === "/api/audio/move") {
    return handleAudioMove(request, env);
  }
  if (url.pathname === "/api/file/upload") {
    return handleFileUpload(request, env);
  }
  if (url.pathname === "/api/file/delete") {
    return handleFileDelete(request, env);
  }
  if (url.pathname === "/api/user/delete") {
    return handleUserDelete(request, env);
  }
  if (url.pathname === '/api/push/subscribe') {
    return handlePushSubscribe(request, env);
  }
  if (url.pathname === '/api/push/unsubscribe') {
    return handlePushUnsubscribe(request, env);
  }
  if (url.pathname === '/api/push/send') {
    return handlePushSend(request, env);
  }
  if (url.pathname === '/api/push/send-group') {
    return handlePushSendGroup(request, env);
  }

  if (url.pathname === '/api/tts/naver') {
    return handleNaverTTS(request, env);
  }
  if (url.pathname === '/api/tts/elevenlabs') {
    return handleElevenLabsTTS(request, env);
  }

  if (url.pathname === '/api/app-update/check') {
    return handleAppUpdateCheck(request, url, env);
  }

  if (url.pathname === '/api/admin/login') {
    return handleAdminLogin(request, env);
  }
  if (url.pathname === '/api/admin/stats') {
    return handleAdminStats(request, env);
  }
  if (url.pathname === '/api/admin/users') {
    return handleAdminUsers(request, env);
  }
  if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/stats$/)) {
    const userId = url.pathname.split('/')[4];
    return handleAdminUserStats(request, env, userId);
  }
  if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/prayer-topics$/)) {
    const userId = url.pathname.split('/')[4];
    return handleAdminUserPrayerTopics(request, env, userId);
  }
  if (url.pathname.match(/^\/api\/admin\/users\/[^/]+$/)) {
    const userId = url.pathname.split('/')[4];
    if (request.method === 'PATCH') return handleAdminUpdateUser(request, env, userId);
    if (request.method === 'DELETE') return handleAdminDeleteUser(request, env, userId);
    return json(405, { error: 'method not allowed' });
  }

  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  return json(404, { message: "not found" });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const apiResponse = await handleApi(request, url, env);
      const origin = request.headers.get("Origin") || "";
      const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://www.myamen.co.kr";
      const patched = new Response(apiResponse.body, apiResponse);
      patched.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      patched.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      patched.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-push-secret");
      patched.headers.set("Vary", "Origin");
      return patched;
    }

    // 약관/개인정보처리방침 정적 페이지
    if (url.pathname === "/terms/service" || url.pathname === "/terms/privacy") {
      const termType = url.pathname === "/terms/service" ? "service" : "privacy";
      const termTitle = termType === "service" ? "이용약관" : "개인정보처리방침";
      let content = "";
      try {
        const supabaseUrl = env.SUPABASE_URL || "";
        const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
        if (supabaseUrl && serviceKey) {
          const resp = await fetch(
            `${supabaseUrl}/rest/v1/terms_metadata?type=eq.${termType}&order=created_at.desc&limit=1&select=title,content`,
            { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
          );
          const rows = await resp.json() as Array<{ title: string; content: string }>;
          if (rows.length > 0) content = rows[0].content || "";
        }
      } catch {}
      // 본문에서 조항 제목(제N조 또는 숫자. 형태) 패턴을 span으로 감싸기
      const formatted = escaped
        .replace(/^(제\d+조[^\n]*)/gm, '<span class="article-title">$1</span>')
        .replace(/^(\d+\.\s)/gm, '<span class="num">$1</span>');
      const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${termTitle} - myAmen</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
    background: #F8F8F8;
    color: #3a3a3a;
    min-height: 100vh;
  }
  .header {
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,0,0,0.05);
    padding: 0 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 56px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .logo {
    font-size: 17px;
    font-weight: 800;
    color: #1a1a1a;
    letter-spacing: -0.5px;
    line-height: 1;
  }
  .logo em { font-style: normal; color: #4A6741; }
  .sep { width: 1px; height: 14px; background: #ddd; margin: 0 6px; }
  .header-sub {
    font-size: 13px;
    font-weight: 600;
    color: #4A6741;
    letter-spacing: -0.2px;
  }
  .wrap {
    max-width: 680px;
    margin: 0 auto;
    padding: 28px 16px 80px;
  }
  .card {
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.05);
    padding: 28px 24px 32px;
    margin-bottom: 16px;
  }
  .card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .card-title-bar {
    width: 4px;
    height: 22px;
    background: #4A6741;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .card-title h1 {
    font-size: 19px;
    font-weight: 800;
    color: #1a1a1a;
    letter-spacing: -0.5px;
  }
  .body-text {
    font-size: 14px;
    line-height: 1.95;
    color: #555;
    white-space: pre-wrap;
    word-break: break-word;
    letter-spacing: -0.1px;
  }
  .body-text .article-title {
    display: block;
    font-weight: 700;
    color: #4A6741;
    margin-top: 20px;
    margin-bottom: 4px;
    font-size: 14px;
  }
  .body-text .num {
    font-weight: 600;
    color: #4A6741;
  }
  .badge {
    display: inline-block;
    background: #4A6741/10;
    background: rgba(74,103,65,0.08);
    color: #4A6741;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 100px;
    letter-spacing: 0.2px;
    margin-bottom: 16px;
  }
  .footer {
    margin-top: 32px;
    padding: 20px 0 0;
    font-size: 11px;
    color: #bbb;
    text-align: center;
    letter-spacing: 0.2px;
  }
</style>
</head>
<body>
  <header class="header">
    <div class="logo">my<em>Amen</em></div>
    <div class="sep"></div>
    <div class="header-sub">${termTitle}</div>
  </header>
  <main class="wrap">
    <div class="card">
      <div class="card-title">
        <div class="card-title-bar"></div>
        <h1>${termTitle}</h1>
      </div>
      <div class="badge">아워마인 서비스</div>
      <div class="body-text">${formatted}</div>
    </div>
    <div class="footer">© 2026 아워마인. All rights reserved.</div>
  </main>
</body>
</html>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      // HTML(index.html)에 대해서는 캐시 완전 차단 — 브라우저가 항상 최신 JS를 로드하게 함
      const ct = assetResponse.headers.get("Content-Type") || "";
      if (ct.includes("text/html")) {
        const noCache = new Response(assetResponse.body, assetResponse);
        noCache.headers.set("Cache-Control", "no-store");
        return noCache;
      }
      return assetResponse;
    }

    // SPA fallback (extra safety even with not_found_handling)
    const indexUrl = new URL("/index.html", url);
    const fallback = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    const noCache = new Response(fallback.body, fallback);
    noCache.headers.set("Cache-Control", "no-store");
    return noCache;
  },
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const supabaseUrl = env.SUPABASE_URL || '';
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) return;
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${supabaseUrl}/rest/v1/user_event_logs?created_at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
    });
  },
};
