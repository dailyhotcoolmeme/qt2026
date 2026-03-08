const BASE = "https://audio.myamen.co.kr/card-backgrounds";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const file = String(req.query.file || "").trim();
  if (!/^bg\d+\.jpg$/i.test(file)) {
    return res.status(400).json({ error: "invalid file" });
  }

  try {
    const upstream = await fetch(`${BASE}/${encodeURIComponent(file)}`);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "upstream fetch failed" });
    }
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const ab = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(Buffer.from(ab));
  } catch (error) {
    res.status(500).json({ error: error?.message || "proxy error" });
  }
}
