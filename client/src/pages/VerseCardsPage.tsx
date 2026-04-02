import React, { useEffect, useState } from "react";
import { Download, Share2, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../hooks/use-auth";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { LoginModal } from "../components/LoginModal";
import { useLogEvent } from "../hooks/useLogEvent";
import { supabase } from "../lib/supabase";

type VerseCardRecord = {
  id: string;
  title?: string | null;
  imageDataUrl: string;
  image_url?: string;
  createdAt?: string | null;
};

const VERSE_CARD_DB = "myamen_verse_cards";
const VERSE_CARD_STORE = "cards";

function storageKey(userId?: string | null) {
  return `verse-card-records:${userId || "guest"}`;
}

function openVerseCardDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(VERSE_CARD_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VERSE_CARD_STORE)) {
        db.createObjectStore(VERSE_CARD_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function loadVerseCards(userId?: string | null): Promise<VerseCardRecord[]> {
  const key = storageKey(userId);
  const db = await openVerseCardDB();
  if (!db) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as VerseCardRecord[]) : [];
    } catch {
      return [];
    }
  }

  const cards = await new Promise<VerseCardRecord[]>((resolve) => {
    const tx = db.transaction(VERSE_CARD_STORE, "readonly");
    const store = tx.objectStore(VERSE_CARD_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as VerseCardRecord[]) ?? []);
    req.onerror = () => resolve([]);
  });
  db.close();
  return cards;
}

async function saveVerseCards(userId: string | null | undefined, cards: VerseCardRecord[]) {
  const key = storageKey(userId);
  const db = await openVerseCardDB();
  if (!db) {
    localStorage.setItem(key, JSON.stringify(cards));
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VERSE_CARD_STORE, "readwrite");
    const store = tx.objectStore(VERSE_CARD_STORE);
    store.put(cards, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

async function shareDataUrl(dataUrl: string, title: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], "verse-card.jpg", { type: blob.type || "image/jpeg" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: "말씀 카드",
      text: title,
      files: [file],
    });
    return true;
  }
  return false;
}

export default function VerseCardsPage() {
  const { user, isLoading } = useAuth();
  const { fontSize } = useDisplaySettings();
  const logEvent = useLogEvent();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [cards, setCards] = useState<VerseCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<VerseCardRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VerseCardRecord | null>(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user?.id) {
        setCards([]);
        setActiveCard(null);
        setPendingDelete(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Supabase 먼저 시도
        const { data, error } = await supabase
          .from("user_verse_cards")
          .select("id, title, image_url, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          if (!alive) return;
          setCards(data.map(row => ({
            id: row.id,
            title: row.title,
            imageDataUrl: row.image_url,
            image_url: row.image_url,
            createdAt: row.created_at,
          })));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Supabase 카드 로드 실패, 로컬 폴백:", e);
      }

      // 로컬 폴백
      try {
        const loaded = await loadVerseCards(user.id);
        if (!alive) return;
        const normalized = (loaded || [])
          .filter((c) => Boolean(c?.id && c?.imageDataUrl))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setCards(normalized);
      } catch {
        if (alive) setCards([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const saveCardToPhone = async (card: VerseCardRecord) => {
    logEvent("hamburger", "card_download", { title: card.title });
    try {
      await downloadDataUrl(card.imageDataUrl, `verse-card-${card.id}.jpg`);
    } catch (error) {
      console.error("download verse card failed:", error);
      alert("이미지 저장에 실패했습니다.");
    }
  };

  const shareCard = async (card: VerseCardRecord) => {
    logEvent("hamburger", "card_share", { title: card.title });
    try {
      const shared = await shareDataUrl(card.imageDataUrl, card.title || "말씀 카드");
      if (!shared) {
        await downloadDataUrl(card.imageDataUrl, `verse-card-${card.id}.jpg`);
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error("share verse card failed:", error);
        alert("이미지 공유에 실패했습니다.");
      }
    }
  };

  const deleteCard = async (card: VerseCardRecord) => {
    logEvent("hamburger", "card_delete", { title: card.title });
    const next = cards.filter((c) => c.id !== card.id);
    setCards(next);
    if (activeCard?.id === card.id) setActiveCard(null);
    setPendingDelete(null);

    if (user?.id && card.image_url) {
      supabase.from("user_verse_cards").delete().eq("id", card.id).eq("user_id", user.id).then();
    }
    try {
      await saveVerseCards(user?.id ?? null, next);
    } catch (error) {
      console.error("delete verse card failed:", error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-[var(--app-page-top)]">
      {isLoading && (
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-10 text-center text-sm text-zinc-400">
          불러오는 중...
        </div>
      )}

      {!isLoading && !user?.id && (
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-10 text-center">
          <p className="text-zinc-500" style={{ fontSize: `${fontSize * 0.9}px` }}>
            말씀카드를 보려면 로그인이 필요합니다.
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

      {!isLoading && user?.id && loading && (
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-10 text-center text-sm text-zinc-400">
          불러오는 중...
        </div>
      )}

      {!isLoading && user?.id && !loading && cards.length === 0 && (
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-10 text-center text-sm text-zinc-500">
          보관한 말씀카드가 없습니다.
        </div>
      )}

      {!isLoading && user?.id && !loading && cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => (
            <div key={card.id} className="relative overflow-hidden rounded-xl border border-zinc-100 bg-white">
              <button onClick={() => setActiveCard(card)} className="block w-full">
                <img
                  src={card.imageDataUrl}
                  alt={card.title || "말씀카드"}
                  className="aspect-[4/5] w-full object-cover"
                />
              </button>
              <div className="p-2">
                <p className="line-clamp-1 font-bold text-zinc-800" style={{ fontSize: `${fontSize * 0.8}px` }}>
                  {card.title || "말씀카드"}
                </p>
              </div>
              <button
                onClick={() => setPendingDelete(card)}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition-active active:scale-95"
                aria-label="삭제"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] bg-black/75 p-4 flex items-center justify-center"
          >
            <div className="relative w-full max-w-sm rounded-none bg-white p-3 shadow-2xl">
              <button
                onClick={() => setActiveCard(null)}
                className="absolute right-2 top-2 z-[240] flex h-7 w-7 items-center justify-center rounded-none bg-zinc-500/40 text-white backdrop-blur-md transition-all hover:bg-zinc-600/60 active:scale-95"
              >
                <X size={18} />
              </button>
              <img
                src={activeCard.imageDataUrl}
                alt={activeCard.title || "말씀카드"}
                className="mx-auto aspect-[4/5] w-full rounded-none object-cover"
              />

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => void saveCardToPhone(activeCard)}
                  className="rounded-none bg-[#4A6741] px-3 py-2 text-sm font-bold text-white inline-flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  핸드폰 저장
                </button>
                <button
                  onClick={() => void shareCard(activeCard)}
                  className="rounded-none bg-[#4A6741] px-3 py-2 text-sm font-bold text-white inline-flex items-center justify-center gap-1.5"
                >
                  <Share2 size={14} />
                  공유
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[280px] rounded-[28px] bg-white p-8 text-center shadow-2xl"
            >
              <h4 className="mb-2 text-base font-bold text-zinc-900">카드를 삭제할까요?</h4>
              <p className="mb-6 text-sm text-zinc-500">삭제한 이미지는 복구할 수 없습니다.</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-600 transition-active active:scale-95"
                >
                  취소
                </button>
                <button
                  onClick={() => void deleteCard(pendingDelete)}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition-active active:scale-95"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
}
