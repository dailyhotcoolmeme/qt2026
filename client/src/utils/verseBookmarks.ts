import { supabase } from "../lib/supabase";

type IncrementInput = {
  userId: string;
  source: string;
  verseRef: string;
  content: string;
  memo?: string | null;
};

export async function incrementVerseBookmark(input: IncrementInput): Promise<{ count: number | null }> {
  const { userId, source, verseRef, content, memo = null } = input;

  // Preferred: single row per (user_id, source, verse_ref) with favorite_count incrementing.
  // This requires `verse_bookmarks.favorite_count` integer column.
  try {
    const { data: existing, error: selErr } = await supabase
      .from("verse_bookmarks")
      .select("id, favorite_count")
      .eq("user_id", userId)
      .eq("source", source)
      .eq("verse_ref", verseRef)
      .maybeSingle();

    if (selErr) throw selErr;

    if (existing?.id) {
      const current = typeof (existing as any).favorite_count === "number" ? (existing as any).favorite_count : 1;
      const nextCount = current + 1;
      const { error: updErr } = await supabase
        .from("verse_bookmarks")
        .update({
          content,
          memo,
          favorite_count: nextCount,
        })
        .eq("id", existing.id)
        .eq("user_id", userId);
      if (updErr) throw updErr;
      return { count: nextCount };
    }

    // Not existing: create with count=1
    const { error: insErr } = await supabase.from("verse_bookmarks").insert({
      user_id: userId,
      source,
      verse_ref: verseRef,
      content,
      memo,
      favorite_count: 1,
    });

    if (insErr) {
      // Race: row could have been created by another request.
      if ((insErr as any).code === "23505") {
        return await incrementVerseBookmark(input);
      }
      throw insErr;
    }

    return { count: 1 };
  } catch (e: any) {
    // Fallback: if DB column isn't ready yet, keep old behavior (insert once).
    // Note: with the old unique constraint, duplicates won't increase count.
    const message = String(e?.message || "");
    const isMissingFavoriteCount = message.includes("favorite_count") && message.includes("does not exist");
    if (!isMissingFavoriteCount) throw e;

    const { error } = await supabase.from("verse_bookmarks").insert({
      user_id: userId,
      source,
      verse_ref: verseRef,
      content,
      memo,
    });

    if (error && (error as any).code !== "23505") {
      throw error;
    }

    return { count: null };
  }
}

