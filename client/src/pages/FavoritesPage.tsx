import React, { useEffect, useState } from "react";
import { Copy, Share2, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { LoginModal } from "../components/LoginModal";

type VerseBookmarkRow = {
  id: string;
  verse_ref: string | null;
  content: string | null;
  source: string | null;
  created_at: string | null;
  favorite_count?: number | null;
};

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

async function shareText(title: string, text: string) {
  if (navigator.share) {
    await navigator.share({ title, text });
    return true;
  }
  return false;
}

function resolveBentoSpan(count: number, contentLen: number, idx: number): string {
  const importance = count * 10 + Math.min(30, Math.floor(contentLen / 40));
  if (importance >= 70) return "col-span-2 row-span-2";
  if (importance >= 45) return idx % 2 === 0 ? "row-span-2" : "col-span-2";
  if (idx % 9 === 0) return "col-span-2";
  if (idx % 7 === 0) return "row-span-2";
  return "col-span-1 row-span-1";
}

export default function FavoritesPage() {
  const { user, isLoading } = useAuth();
  const { fontSize } = useDisplaySettings();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [rows, setRows] = useState<VerseBookmarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id) {
        setRows([]);
        setErrorText(null);
        return;
      }
      setLoading(true);
      setErrorText(null);

      try {
        // Preferred query (supports counting + ordering by importance)
        const preferred = await supabase
          .from("verse_bookmarks")
          .select("id, verse_ref, content, source, created_at, favorite_count")
          .eq("user_id", user.id)
          .order("favorite_count", { ascending: false })
          .order("created_at", { ascending: false });

        if (!alive) return;
        if (!preferred.error) {
          setRows((preferred.data as VerseBookmarkRow[]) || []);
          return;
        }

        // Fallback query for older schema (no favorite_count yet)
        const msg = String(preferred.error.message || "");
        const maybeMissingColumns = msg.includes("favorite_count");
        if (!maybeMissingColumns) {
          setErrorText(preferred.error.message || "즐겨찾기를 불러오지 못했습니다.");
          setRows([]);
          return;
        }

        const fallback = await supabase
          .from("verse_bookmarks")
          .select("id, verse_ref, content, source, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!alive) return;
        if (fallback.error) {
          setErrorText(fallback.error.message || "즐겨찾기를 불러오지 못했습니다.");
          setRows([]);
          return;
        }

        setRows(((fallback.data as VerseBookmarkRow[]) || []).map((r) => ({ ...r, favorite_count: 1 })));
      } catch (e) {
        if (!alive) return;
        setErrorText("즐겨찾기를 불러오지 못했습니다.");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-24">
      {isLoading && (
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-10 text-center text-sm text-zinc-400">
          불러오는 중...
        </div>
      )}

      {!isLoading && !user?.id && (
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-10 text-center">
          <p className="text-zinc-500" style={{ fontSize: `${fontSize * 0.9}px` }}>
            즐겨찾기를 보려면 로그인이 필요합니다.
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="mt-4 rounded-xl bg-[#4A6741] px-5 py-3 font-bold text-white transition-active active:scale-95"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            로그인
          </button>
        </div>
      )}

      {!isLoading && user?.id && (
        <div>
          {loading && (
            <div className="rounded-xl border border-zinc-100 bg-white px-4 py-10 text-center text-sm text-zinc-400">
              불러오는 중...
            </div>
          )}

          {!loading && errorText && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-600">
              {errorText}
            </div>
          )}

          {!loading && !errorText && rows.length === 0 && (
            <div className="rounded-xl border border-zinc-100 bg-white px-4 py-10 text-center text-sm text-zinc-500">
              저장한 즐겨찾기가 없습니다.
            </div>
          )}

          {!loading && !errorText && rows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 [grid-auto-flow:dense] auto-rows-[10.5rem] sm:auto-rows-[11.5rem]">
              {rows.map((row, idx) => {
                const verseRef = row.verse_ref || "";
                const content = row.content || "";
                const shareTextOnly = [verseRef, content].filter(Boolean).join("\n\n").trim();
                const count = typeof row.favorite_count === "number" ? row.favorite_count : 1;
                const spanClass = resolveBentoSpan(count, content.length, idx);

                return (
                  <div key={row.id} className={`relative flex flex-col rounded-2xl border border-zinc-100 bg-white p-3 ${spanClass}`}>
                    <div className="absolute right-3 top-3 rounded-full bg-emerald-50 px-2 py-1 text-[12px] font-bold text-emerald-700">
                      {count}
                    </div>

                    <div className="shrink-0 pr-10">
                      <p className="font-bold text-zinc-900" style={{ fontSize: `${fontSize * 0.92}px` }}>
                        {verseRef || "말씀"}
                      </p>
                    </div>

                    <div className="mt-2 flex-1 overflow-y-auto pr-1">
                      <p className="whitespace-pre-line text-zinc-700" style={{ fontSize: `${fontSize * 0.88}px`, lineHeight: 1.6 }}>
                        {content || ""}
                      </p>
                    </div>

                    <div className="mt-3 flex shrink-0 items-center justify-end gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await copyToClipboard(shareTextOnly || content || verseRef);
                            alert("복사되었습니다.");
                          } catch {
                            alert("복사에 실패했습니다.");
                          }
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-active active:scale-95"
                        aria-label="복사"
                        title="복사"
                      >
                        <Copy size={16} />
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            // 카톡 공유 시 title + text가 함께 노출되며, title을 절(제목)로 넣으면
                            // text에도 절이 있어 중복 표시되는 경우가 있어 title은 고정값으로 둔다.
                            const shared = await shareText("마이아멘", shareTextOnly || content || verseRef);
                            if (!shared) {
                              await copyToClipboard(shareTextOnly || content || verseRef);
                              alert("공유 기능이 없어 복사로 대체했습니다.");
                            }
                          } catch (e) {
                            if (!(e instanceof Error && e.name === "AbortError")) {
                              alert("공유에 실패했습니다.");
                            }
                          }
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#4A6741] text-white transition-active active:scale-95"
                        aria-label="공유"
                        title="공유"
                      >
                        <Share2 size={16} />
                      </button>

                      <button
                        onClick={async () => {
                          if (!user?.id) return;
                          const ok = window.confirm("즐겨찾기를 삭제할까요?");
                          if (!ok) return;
                          try {
                            const { error } = await supabase
                              .from("verse_bookmarks")
                              .delete()
                              .eq("id", row.id)
                              .eq("user_id", user.id);
                            if (error) {
                              alert("삭제에 실패했습니다.");
                              return;
                            }
                            setRows((prev) => prev.filter((r) => r.id !== row.id));
                          } catch {
                            alert("삭제에 실패했습니다.");
                          }
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-active active:scale-95"
                        aria-label="삭제"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
}
