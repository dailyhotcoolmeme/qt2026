import React, { useEffect, useState } from "react";
import { BookmarkCheck, Trash2 } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";

type PrayerBoxItem = {
  topicId: number;
  content: string;
  groupName: string;
  savedAt: string;
};

function getStorageKey(userId: string) {
  return `myamen_prayer_box_${userId}`;
}

function loadItems(userId: string): PrayerBoxItem[] {
  try { return JSON.parse(localStorage.getItem(getStorageKey(userId)) || "[]"); } catch { return []; }
}

function saveItems(userId: string, items: PrayerBoxItem[]) {
  try { localStorage.setItem(getStorageKey(userId), JSON.stringify(items)); } catch {}
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return ""; }
}

export default function MyPrayerBoxPage() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<PrayerBoxItem[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    setItems(loadItems(user.id));
  }, [user?.id, isLoading]);

  const removeItem = (savedAt: string) => {
    if (!user) return;
    const next = items.filter(i => i.savedAt !== savedAt);
    saveItems(user.id, next);
    setItems(next);
  };

  if (!isLoading && !user) {
    return (
      <div className="min-h-[100dvh] bg-[#F5F6F7] pt-[var(--app-page-top)] flex flex-col items-center justify-center gap-4 px-6">
        <BookmarkCheck size={40} className="text-zinc-300" />
        <p className="text-zinc-500 text-sm">로그인이 필요합니다.</p>
        <button onClick={() => setShowLoginModal(true)} className="px-5 py-2.5 rounded-xl bg-[#4A6741] text-white font-bold text-sm">
          로그인
        </button>
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F6F7] pt-[var(--app-page-top)] pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#4A6741] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <BookmarkCheck size={36} className="text-zinc-200" />
            <p className="text-sm">저장된 기도제목이 없습니다.</p>
            <p className="text-xs text-zinc-300 text-center">중보모임 기도제목 옆 북마크 아이콘을 눌러 저장하세요.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={`${item.topicId}_${item.savedAt}`} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookmarkCheck size={13} className={item.groupName === "매일기도" ? "text-[#4A6741] shrink-0" : "text-amber-500 shrink-0"} />
                    <span className={`text-[11px] font-bold truncate ${item.groupName === "매일기도" ? "text-[#4A6741]" : "text-amber-600"}`}>{item.groupName}</span>
                    <span className="text-[11px] text-zinc-400 shrink-0">{formatDate(item.savedAt)}</span>
                  </div>
                  <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed font-medium">{item.content}</p>
                </div>
                <button onClick={() => removeItem(item.savedAt)} className="shrink-0 p-1.5 text-zinc-300 hover:text-rose-400 transition-colors" title="저장 취소">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
