import { supabase } from "./supabase";

export type VerseTiming = {
  verse: number;
  start_ms: number;
  end_ms: number;
};

export type ChapterAudioMetadata = {
  audioUrl: string;
  durationMs: number;
  verses: VerseTiming[];
};

const AUDIO_CACHE_NAME = "bible-audio-v1";

export function parseVerses(content: string): Array<{ verse: number; text: string }> {
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)\.?\s*(.*)$/);
      if (!m) return null;
      return { verse: Number(m[1]), text: m[2] || "" };
    })
    .filter((v): v is { verse: number; text: string } => Boolean(v && Number.isFinite(v.verse)));
}

export function parseVerseRange(label: string | number | null | undefined): { start: number; end: number } | null {
  if (label === null || label === undefined) return null;
  const raw = String(label).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return { start: n, end: n };
  }

  const m = raw.match(/^(\d+)\s*[-:~]\s*(\d+)$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

export function findCurrentVerse(verses: VerseTiming[], currentMs: number): number | null {
  if (!verses.length) return null;
  for (const row of verses) {
    if (currentMs >= row.start_ms && currentMs < row.end_ms) return row.verse;
  }
  if (currentMs >= verses[verses.length - 1].end_ms) return verses[verses.length - 1].verse;
  return verses[0].verse;
}

export async function loadChapterAudioMetadata(bookId: number, chapter: number): Promise<ChapterAudioMetadata | null> {
  const { data, error } = await supabase
    .from("bible_audio_metadata")
    .select("audio_url,duration,verse_timings")
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .maybeSingle();

  if (error || !data?.audio_url) return null;

  const versePayload = (data.verse_timings as any)?.verses;
  const verses: VerseTiming[] = Array.isArray(versePayload)
    ? versePayload
        .map((v: any) => ({
          verse: Number(v?.verse),
          start_ms: Number(v?.start_ms),
          end_ms: Number(v?.end_ms),
        }))
        .filter((v) => Number.isFinite(v.verse) && Number.isFinite(v.start_ms) && Number.isFinite(v.end_ms))
        .sort((a, b) => a.verse - b.verse)
    : [];

  return {
    audioUrl: data.audio_url,
    durationMs: Number(data.duration || 0),
    verses,
  };
}

export async function getCachedAudioObjectUrl(audioUrl: string): Promise<string> {
  if (!("caches" in window)) return audioUrl;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const request = new Request(audioUrl, { mode: "cors" });

    let response = await cache.match(request);
    if (!response) {
      const fetched = await fetch(request);
      if (!fetched.ok) throw new Error(`audio fetch failed (${fetched.status})`);
      await cache.put(request, fetched.clone());
      response = fetched;
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    // Fall back to direct URL playback when Cache API fetch is blocked by CORS or browser policy.
    return audioUrl;
  }
}
