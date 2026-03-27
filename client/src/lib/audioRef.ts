import { supabase } from "./supabase";

/**
 * R2 오디오 파일 삭제 가능 여부 판단
 * prayer_records, group_prayer_records, prayer_box_items(voice_prayers) 세 테이블
 * 모두에서 해당 URL이 사라졌을 때만 true 반환
 */
export async function isAudioOrphaned(audioUrl: string): Promise<boolean> {
  if (!audioUrl || !audioUrl.startsWith("http")) return false;

  const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
    supabase
      .from("prayer_records")
      .select("id", { count: "exact", head: true })
      .eq("audio_url", audioUrl),
    supabase
      .from("group_prayer_records")
      .select("id", { count: "exact", head: true })
      .eq("audio_url", audioUrl),
    supabase
      .from("prayer_box_items")
      .select("id", { count: "exact", head: true })
      .filter("voice_prayers", "cs", JSON.stringify([{ audio_url: audioUrl }])),
  ]);

  return (c1 ?? 0) + (c2 ?? 0) + (c3 ?? 0) === 0;
}
