import { CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCorsHeaders(response: Response) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    next.headers.set(key, value);
  }
  next.headers.set("Vary", "Origin");
  return next;
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

  if (request.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }
  return json(404, { message: "not found" });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, url, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    // SPA fallback (extra safety even with not_found_handling)
    const indexUrl = new URL("/index.html", url);
    return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  },
};
