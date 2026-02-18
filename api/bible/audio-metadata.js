import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const bookId = Number(req.query.book_id);
  const chapter = Number(req.query.chapter);
  if (!Number.isFinite(bookId) || !Number.isFinite(chapter)) {
    return res.status(400).json({ error: "book_id and chapter are required" });
  }

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return res.status(500).json({ error: "Missing Supabase env" });

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("bible_audio_metadata")
      .select("audio_url,duration,verse_timings,created_at")
      .eq("book_id", bookId)
      .eq("chapter", chapter)
      .maybeSingle();

    if (error || !data?.audio_url) {
      return res.status(404).json({ error: error?.message || "Not found" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unknown error" });
  }
}
