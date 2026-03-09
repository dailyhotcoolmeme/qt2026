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

export const onRequestGet: PagesFunction<{ file: string }> = async (context) => {
  const file = String(context.params.file || "").trim();
  if (!/^bg\d+\.jpg$/i.test(file)) {
    return json(400, { message: "invalid file" });
  }

  const upstreamUrl = `https://audio.myamen.co.kr/card-backgrounds/${encodeURIComponent(file)}`;
  const response = await fetch(upstreamUrl, {
    cf: { cacheTtl: 86400, cacheEverything: true },
  });

  if (!response.ok) {
    return json(response.status, { message: "upstream fetch failed" });
  }

  const next = new Response(response.body, response);
  next.headers.set("Cache-Control", "public, max-age=86400");
  return withCorsHeaders(next);
};

