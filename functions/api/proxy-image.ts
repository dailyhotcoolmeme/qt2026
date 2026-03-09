const CORS_HEADERS: Record<string, string> = {
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

export const onRequestOptions: PagesFunction = async () => {
  return withCorsHeaders(new Response(null, { status: 204 }));
};

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
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
};

