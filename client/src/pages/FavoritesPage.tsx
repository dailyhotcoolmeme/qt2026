import React, { useEffect, useState } from "react";
import { Copy, Share2, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { LoginModal } from "../components/LoginModal";
import { shareContent } from "../lib/nativeShare";
import { getPublicWebOrigin } from "../lib/appUrl";
import { useRefresh } from "../lib/refreshContext";

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

async function shareText(title: string | null | undefined, text: string, url?: string) {
  return shareContent({
    title: title || undefined,
    text,
    url,
    dialogTitle: "공유",
  });
}

function formatContentWithVerseNumbers(source: string | null, content: string): string {
  const raw = String(content || "");
  if (!raw) return "";

  const s = String(source || "");
  const shouldNumber = s === "qt" || s === "reading";
  if (!shouldNumber) return raw;

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return "";

  const alreadyNumbered = lines.some((line) => /^\d+\.\s+/.test(line));
  if (alreadyNumbered) return lines.join("\n");

  // In QT/Reading content, original verse numbers were stripped when saving.
  // Re-add simple 1..N numbering per line so users can read/share verse numbers.
  return lines.map((line, idx) => `${idx + 1}. ${line}`).join("\n");
}

export default function FavoritesPage() {
  const { user, isLoading } = useAuth();
  const { refreshKey } = useRefresh();
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
  }, [user?.id, refreshKey]);

  return (
    <div className="w-full px-5 pb-24 pt-[var(--app-page-top)] sm:px-6 lg:px-10">
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
            // Masonry (Pinterest-like): CSS columns + break-inside avoids equal heights.
            <div className="[column-gap:16px] columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6">
              {rows.map((row) => {
                const verseRef = row.verse_ref || "";
                const content = row.content || "";
                const displayContent = formatContentWithVerseNumbers(row.source, content);
                const shareTextOnly = [verseRef, displayContent].filter(Boolean).join("\n\n").trim();
                const brandedShareText = `${shareTextOnly}\n\n마이아멘(myAmen)`.trim();
                const count = typeof row.favorite_count === "number" ? row.favorite_count : 1;

                return (
                  <div
                    key={row.id}
                    className="group relative mb-3 inline-block w-full overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] ring-1 ring-zinc-100 [break-inside:avoid]"
                  >
                    <div className="p-4">
                      <div className="absolute right-3 top-3 flex items-center gap-1">
                        <button
                          onClick={async () => {
                            try {
                              await copyToClipboard(shareTextOnly || content || verseRef);
                              alert("복사되었습니다.");
                            } catch {
                              alert("복사에 실패했습니다.");
                            }
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 opacity-80 transition-active active:scale-95 hover:opacity-100"
                          aria-label="복사"
                          title="복사"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              // 카톡 공유 시 title + text가 함께 노출되며, title을 절(제목)로 넣으면
                              // text에도 절이 있어 중복 표시되는 경우가 있어 title은 고정값으로 둔다.
                              const shareUrl =
                                window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                                  ? getPublicWebOrigin()
                                  : window.location.origin;
                              const shared = await shareText(null, brandedShareText || shareTextOnly || content || verseRef, shareUrl);
                              if (!shared) {
                                await copyToClipboard(`${brandedShareText || shareTextOnly || content || verseRef}\n\n${shareUrl}`);
                                alert("공유 기능이 없어 복사로 대체했습니다.");
                              }
                            } catch (e) {
                              if (!(e instanceof Error && e.name === "AbortError")) {
                                alert("공유에 실패했습니다.");
                              }
                            }
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#4A6741] opacity-80 transition-active active:scale-95 hover:opacity-100"
                          aria-label="공유"
                          title="공유"
                        >
                          <Share2 size={14} />
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
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-rose-500 opacity-80 transition-active active:scale-95 hover:opacity-100"
                          aria-label="삭제"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div
                          className="inline-flex h-6 items-center justify-center rounded-full bg-emerald-50 px-2 text-[12px] font-black text-emerald-700"
                          aria-label={`즐겨찾기 횟수 ${count}`}
                        >
                          {count}
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <p className="pr-[160px] font-extrabold text-zinc-900" style={{ fontSize: `${fontSize * 0.95}px` }}>
                          {verseRef || "말씀"}
                        </p>
                      </div>

                      <p
                        className="mt-3 whitespace-pre-line text-zinc-700"
                        style={{ fontSize: `${fontSize * 0.9}px`, lineHeight: 1.65 }}
                      >
                        {displayContent || ""}
                      </p>
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
