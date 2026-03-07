import React, { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
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
        const { data, error } = await supabase
          .from("verse_bookmarks")
          .select("id, verse_ref, content, source, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!alive) return;
        if (error) {
          setErrorText(error.message || "즐겨찾기를 불러오지 못했습니다.");
          setRows([]);
          return;
        }
        setRows((data as VerseBookmarkRow[]) || []);
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
    <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-6">
      <div className="mb-4">
        <h2 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.15}px` }}>
          즐겨찾기
        </h2>
        <p className="mt-1 text-zinc-500" style={{ fontSize: `${fontSize * 0.85}px` }}>
          저장한 말씀을 복사하거나 공유할 수 있어요.
        </p>
      </div>

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
        <div className="space-y-3">
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

          {!loading &&
            rows.map((row) => {
              const verseRef = row.verse_ref || "";
              const content = row.content || "";
              const text = [verseRef, content].filter(Boolean).join("\n\n").trim();
              const createdLabel = row.created_at
                ? new Date(row.created_at).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
                : "";

              return (
                <div key={row.id} className="rounded-xl border border-zinc-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-900" style={{ fontSize: `${fontSize * 0.95}px` }}>
                        {verseRef || "말씀"}
                      </p>
                      <p
                        className="mt-2 whitespace-pre-line text-zinc-700"
                        style={{ fontSize: `${fontSize * 0.9}px`, lineHeight: 1.6 }}
                      >
                        {content}
                      </p>
                      {createdLabel && (
                        <p className="mt-2 text-zinc-400" style={{ fontSize: `${fontSize * 0.75}px` }}>
                          {createdLabel}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await copyToClipboard(text || content || verseRef);
                            alert("복사되었습니다.");
                          } catch {
                            alert("복사에 실패했습니다.");
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-600 transition-active active:scale-95"
                        style={{ fontSize: `${fontSize * 0.85}px` }}
                      >
                        <Copy size={16} />
                        복사
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const shared = await shareText(verseRef || "즐겨찾기", text || content || verseRef);
                            if (!shared) {
                              await copyToClipboard(text || content || verseRef);
                              alert("공유 기능이 없어 복사로 대체했습니다.");
                            }
                          } catch (e) {
                            if (!(e instanceof Error && e.name === "AbortError")) {
                              alert("공유에 실패했습니다.");
                            }
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#4A6741] px-3 py-2 text-white transition-active active:scale-95"
                        style={{ fontSize: `${fontSize * 0.85}px` }}
                      >
                        <Share2 size={16} />
                        공유
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
}

