export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const raw = String(req.query.url || "");
  if (!raw) return res.status(400).json({ error: "url is required" });

  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }
  if (!/^https?:$/.test(target.protocol)) {
    return res.status(400).json({ error: "unsupported protocol" });
  }

  try {
    const upstream = await fetch(target.toString());
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "upstream fetch failed" });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const cacheControl = upstream.headers.get("cache-control") || "public, max-age=3600";
    const ab = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", cacheControl);
    res.status(200).send(Buffer.from(ab));
  } catch (error) {
    res.status(500).json({ error: error?.message || "proxy error" });
  }
}

