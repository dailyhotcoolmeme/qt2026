import { CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type AssetFetcher = { fetch: (request: Request) => Promise<Response> };

interface Env {
  ASSETS: AssetFetcher;
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;
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
