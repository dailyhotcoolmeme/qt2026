import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Save, Share2, X } from "lucide-react";

import imageCompression from "browser-image-compression";
import { uploadFileToR2 } from "../utils/upload";
import { supabase } from "../lib/supabase";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  userId?: string | null;
};

type SavedCard = {
  id: string;
  title: string;
  imageDataUrl: string;
  createdAt: string;
};

type ThemeMode = "color" | "image";
type ThemePreset = {
  id: string;
  mode: ThemeMode;
  bg: string;
  textColor: string;
  subColor: string;
};

const COLOR_PRESETS: ThemePreset[] = [
  { id: "c1", mode: "color", bg: "linear-gradient(135deg,#fdf2f8 0%,#fee2e2 100%)", textColor: "#3f3f46", subColor: "#52525b" },
  { id: "c2", mode: "color", bg: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)", textColor: "#1e3a8a", subColor: "#334155" },
  { id: "c3", mode: "color", bg: "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)", textColor: "#065f46", subColor: "#334155" },
  { id: "c4", mode: "color", bg: "linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)", textColor: "#7c2d12", subColor: "#334155" },
  { id: "c5", mode: "color", bg: "linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%)", textColor: "#5b21b6", subColor: "#4c1d95" },
  { id: "c6", mode: "color", bg: "linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%)", textColor: "#115e59", subColor: "#134e4a" },
  { id: "c7", mode: "color", bg: "linear-gradient(135deg,#fefce8 0%,#fef3c7 100%)", textColor: "#854d0e", subColor: "#78350f" },
  { id: "c8", mode: "color", bg: "linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)", textColor: "#3730a3", subColor: "#312e81" },
  { id: "c9", mode: "color", bg: "linear-gradient(135deg,#fef2f2 0%,#ffe4e6 100%)", textColor: "#9f1239", subColor: "#881337" },
  { id: "c10", mode: "color", bg: "linear-gradient(135deg,#ecfeff 0%,#cffafe 100%)", textColor: "#155e75", subColor: "#164e63" },
  { id: "c11", mode: "color", bg: "linear-gradient(135deg,#eef2ff 0%,#e0e7ff 100%)", textColor: "#1e1b4b", subColor: "#312e81" },
  { id: "c12", mode: "color", bg: "linear-gradient(135deg,#f7fee7 0%,#d9f99d 100%)", textColor: "#365314", subColor: "#3f6212" },
];

const DEFAULT_IMAGE_URLS = Array.from({ length: 12 }, (_, idx) => `/api/card-backgrounds/bg${idx + 1}.jpg`);

function resolveImagePresets(): ThemePreset[] {
  // Workaround for Vite env typing issues in some setups
  const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || (globalThis as any).importMetaEnv || {};
  const fromEnv = String(env.VITE_VERSE_CARD_IMAGE_PRESETS || "")
    .split(",")
    .map((v: string) => v.trim())
    .filter(Boolean);
  const urls = fromEnv.length > 0 ? fromEnv : DEFAULT_IMAGE_URLS;
  return urls.map((bg, index) => ({
    id: `i${index + 1}`,
    mode: "image" as const,
    bg,
    textColor: "#ffffff",
    subColor: "#f4f4f5",
  }));
}

function toProxyUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/api/")) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) return parsed.pathname + parsed.search;
    return `/api/proxy-image?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
  }
}

function storageKey(userId?: string | null) {
  return `verse-card-records:${userId || "guest"}`;
}

const VERSE_CARD_DB = "myamen_verse_cards";
const VERSE_CARD_STORE = "cards";

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

async function loadCardsFromStore(key: string): Promise<SavedCard[]> {
  const db = await openVerseCardDB();
  if (!db) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as SavedCard[]) : [];
    } catch {
      return [];
    }
  }

  const cards = await new Promise<SavedCard[]>((resolve) => {
    const tx = db.transaction(VERSE_CARD_STORE, "readonly");
    const store = tx.objectStore(VERSE_CARD_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as SavedCard[]) ?? []);
    req.onerror = () => resolve([]);
  });
  db.close();
  return cards;
}

async function saveCardsToStore(key: string, cards: SavedCard[]) {
  const db = await openVerseCardDB();
  if (!db) {
    try {
      localStorage.setItem(key, JSON.stringify(cards));
    } catch {
      const compact = cards.slice(0, 3);
      localStorage.setItem(key, JSON.stringify(compact));
    }
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

function normalizeVerseText(raw: string): string {
  const lines = String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.?\s*/, "").trim());
  return lines.join("\n");
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

async function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

async function shareDataUrl(dataUrl: string, title: string) {
  const file = await dataUrlToFile(dataUrl, "verse-card.jpg");
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

type UserBg = { url: string; name: string; uploader: string; createdAt: string };

export function VerseCardMakerModal({ open, onClose, title, content, userId }: Props) {
  const [mode, setMode] = useState<ThemeMode>("color");
  const [selectedId, setSelectedId] = useState<string>(COLOR_PRESETS[0].id);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [activeRecord, setActiveRecord] = useState<SavedCard | null>(null);
  const [userBgTab, setUserBgTab] = useState(false);
  const [userBgs, setUserBgs] = useState<UserBg[]>([]);
  const [bgPage, setBgPage] = useState(1);
  const [bgHasMore, setBgHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 1125;
  const BODY_FONT_PX = 50;
  const IMAGE_OPACITY = 0.6;
  const REFERENCE_FONT_PX = Math.round(BODY_FONT_PX * 0.8);
  const PREVIEW_WIDTH_PX = 220;

  const imagePresets = useMemo(() => resolveImagePresets(), []);
  const cleanContent = useMemo(() => normalizeVerseText(content), [content]);

  const currentPreset = useMemo(() => {
    if (userBgTab) {
      const found = userBgs.find((bg, idx) => selectedId === `user-${idx}`);
      if (found) {
        return {
          id: selectedId,
          mode: "image" as const,
          bg: found.url,
          textColor: "#ffffff",
          subColor: "#f4f4f5",
        };
      }
    }
    const pool = mode === "color" ? COLOR_PRESETS : imagePresets;
    return pool.find((v) => v.id === selectedId) || pool[0];
  }, [mode, selectedId, imagePresets, userBgTab, userBgs]);
  // Load global backgrounds from Supabase
  useEffect(() => {
    if (!open) return;
    const fetchBgs = async () => {
      const { data, error } = await supabase
        .from("verse_card_backgrounds")
        .select("url, name, uploader, created_at")
        .order("created_at", { ascending: false })
        .limit(12)
        .range((bgPage - 1) * 12, bgPage * 12 - 1);
      if (error) {
        setUserBgs([]);
        setBgHasMore(false);
        return;
      }
      setUserBgs((prev) => bgPage === 1 ? (data ?? []) : [...prev, ...(data ?? [])]);
      setBgHasMore((data?.length ?? 0) === 12);
    };
    fetchBgs();
  }, [open, bgPage]);

  // Handle image upload (no per-user limit, always compress, store in Supabase)
  const handleUserBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      // Compress image (no size limit, just max dimension)
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      // Upload to R2
      const url = await uploadFileToR2(
        new File([compressed], file.name, { type: compressed.type }),
        `user-card-backgrounds/open` // open folder
      );
      // Insert metadata to Supabase
      const { error } = await supabase.from("verse_card_backgrounds").insert({
        url,
        name: file.name,
        uploader: userId,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      // Immediately reload the first page of backgrounds so the UI reflects
      // the newly uploaded image instead of waiting for a page-change.
      try {
        const { data: fresh, error: fetchErr } = await supabase
          .from("verse_card_backgrounds")
          .select("url, name, uploader, created_at")
          .order("created_at", { ascending: false })
          .limit(12)
          .range(0, 11);
        if (!fetchErr && Array.isArray(fresh)) {
          setUserBgs(fresh as UserBg[]);
          setBgHasMore((fresh?.length ?? 0) === 12);
          setSelectedId("user-0");
        }
      } catch (e) {
        // ignore fetch error, upload already succeeded
      }
    } catch (err) {
      alert("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const effectiveTextColor = currentPreset?.mode === "image" ? "#ffffff" : currentPreset?.textColor || "#3f3f46";
  const effectiveSubColor = currentPreset?.mode === "image" ? "#f8fafc" : currentPreset?.subColor || "#52525b";
  const previewBodyFontPx = Math.max(12, Math.round((BODY_FONT_PX * PREVIEW_WIDTH_PX) / CANVAS_WIDTH) + 2);
  const previewRefFontPx = Math.max(10, Math.round((REFERENCE_FONT_PX * PREVIEW_WIDTH_PX) / CANVAS_WIDTH));

  useEffect(() => {
    if (!open) {
      setActiveRecord(null);
      return;
    }
    const pool = mode === "color" ? COLOR_PRESETS : imagePresets;
    const randomized = pool[Math.floor(Math.random() * pool.length)] || pool[0];
    if (randomized) setSelectedId(randomized.id);
    const key = storageKey(userId);
    loadCardsFromStore(key).then(setSavedCards).catch(() => setSavedCards([]));
  }, [open, mode, userId, imagePresets]);

  const drawToCanvas = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx || !currentPreset) return null;

    if (currentPreset.mode === "image") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = toProxyUrl(currentPreset.bg);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
      });
      ctx.globalAlpha = IMAGE_OPACITY;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const colors = currentPreset.bg.match(/#[0-9a-fA-F]{3,8}/g) || ["#ffffff", "#f4f4f5"];
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1] || colors[0]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const x = 450;
    ctx.fillStyle = effectiveTextColor;
    ctx.textAlign = "center";
    ctx.font = `bold ${BODY_FONT_PX}px serif`;
    if (currentPreset.mode === "image") {
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
    }

    const maxWidth = 700;
    const chunks = cleanContent.split("\n");
    const allLines: string[] = [];
    chunks.forEach((chunk, idx) => {
      const words = chunk.split(" ");
      let line = "";
      words.forEach((w) => {
        const next = line ? `${line} ${w}` : w;
        if (ctx.measureText(next).width > maxWidth) {
          if (line) allLines.push(line);
          line = w;
        } else {
          line = next;
        }
      });
      if (line) allLines.push(line);
      if (idx < chunks.length - 1) allLines.push("");
    });

    const lineHeight = Math.max(34, Math.round(BODY_FONT_PX * 1.48));
    const blockHeight = allLines.length * lineHeight;
    let y = Math.max(190, Math.floor((canvas.height - (blockHeight + 64)) / 2));
    allLines.forEach((line) => {
      if (!line) {
        y += 14;
        return;
      }
      ctx.fillText(line, x, y);
      y += lineHeight;
    });

    ctx.fillStyle = effectiveSubColor;
    ctx.font = `bold ${REFERENCE_FONT_PX}px serif`;
    const titleY = Math.min(canvas.height - 80, y + Math.max(24, Math.round(BODY_FONT_PX * 0.8)));
    ctx.fillText(title, x, titleY);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    return canvas;
  };

  const exportImage = async (shareMode = false) => {
    try {
      const canvas = await drawToCanvas();
      if (!canvas) return;
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
      if (!blob) return;

      if (
        shareMode &&
        navigator.canShare &&
        navigator.canShare({ files: [new File([blob], "verse-card.png", { type: "image/png" })] })
      ) {
        await navigator.share({
          title: "말씀 카드",
          text: title,
          files: [new File([blob], "verse-card.png", { type: "image/png" })],
        });
        return;
      }

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "verse-card.png";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error("card export failed:", error);
      alert("이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const saveToRecords = async () => {
    try {
      const canvas = await drawToCanvas();
      if (!canvas) return;
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.78);
      const entry: SavedCard = {
        id: `${Date.now()}`,
        title,
        imageDataUrl,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...savedCards].slice(0, 30);
      setSavedCards(next);
      await saveCardsToStore(storageKey(userId), next);
      alert("기록함에 보관되었습니다.");
    } catch (error) {
      console.error("save card failed:", error);
      alert("기록함 보관에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const saveRecordToPhone = async (record: SavedCard) => {
    try {
      await downloadDataUrl(record.imageDataUrl, `verse-card-${record.id}.jpg`);
    } catch (error) {
      console.error("download saved card failed:", error);
      alert("이미지 저장에 실패했습니다.");
    }
  };

  const shareRecord = async (record: SavedCard) => {
    try {
      const shared = await shareDataUrl(record.imageDataUrl, record.title);
      if (!shared) {
        await downloadDataUrl(record.imageDataUrl, `verse-card-${record.id}.jpg`);
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error("share saved card failed:", error);
        alert("이미지 공유에 실패했습니다.");
      }
    }
  };

  // 삭제 확인 모달 상태
  const [pendingDeleteRecordId, setPendingDeleteRecordId] = useState<string | null>(null);

  const removeRecord = async (recordId: string) => {
    const next = savedCards.filter((card) => card.id !== recordId);
    setSavedCards(next);
    if (activeRecord?.id === recordId) setActiveRecord(null);
    try {
      await saveCardsToStore(storageKey(userId), next);
    } catch (error) {
      console.error("delete saved card failed:", error);
    }
  };

  const previewStyle: React.CSSProperties =
    currentPreset?.mode === "image"
      ? { background: "#ffffff" }
      : { background: currentPreset?.bg || COLOR_PRESETS[0].bg };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/45" />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900">말씀 카드 생성</h3>
              <button onClick={onClose} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex justify-center">
                <div
                  className="relative aspect-[4/5] rounded-[28px] border border-zinc-200 p-5 overflow-hidden"
                  style={{ ...previewStyle, width: `${PREVIEW_WIDTH_PX}px` }}
                >
                  {currentPreset?.mode === "image" ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${toProxyUrl(currentPreset.bg)})`, opacity: IMAGE_OPACITY }}
                    />
                  ) : null}
                  <div className="relative h-full flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <p className="whitespace-pre-wrap break-keep text-center leading-[1.5] font-bold" style={{ color: effectiveTextColor, fontSize: previewBodyFontPx, fontFamily: "serif", textShadow: currentPreset?.mode === "image" ? "0 1px 6px rgba(0,0,0,0.45)" : "none" }}>
                        {cleanContent}
                      </p>
                      <p className="mt-2 text-center font-bold" style={{ color: effectiveSubColor, fontSize: previewRefFontPx, fontFamily: "serif", textShadow: currentPreset?.mode === "image" ? "0 1px 6px rgba(0,0,0,0.45)" : "none" }}>
                        {title}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">

                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setUserBgTab(false); setMode("color"); }} className={`rounded-xl px-3 py-2 text-sm font-bold ${!userBgTab && mode === "color" ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                    배경 색상 프리셋
                  </button>
                  <button onClick={() => { setUserBgTab(false); setMode("image"); }} className={`rounded-xl px-3 py-2 text-sm font-bold ${!userBgTab && mode === "image" ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                    배경 이미지 프리셋
                  </button>
                  <button onClick={() => setUserBgTab(true)} className={`rounded-xl px-3 py-2 text-sm font-bold ${userBgTab ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                    사용자 지정
                  </button>
                </div>

                {!userBgTab ? (
                  <div className="grid grid-cols-4 gap-2">
                    {(mode === "color" ? COLOR_PRESETS : imagePresets).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedId(preset.id)}
                        className={`h-14 rounded-lg border-2 ${selectedId === preset.id ? "border-zinc-900" : "border-zinc-200"}`}
                        style={
                          preset.mode === "image"
                            ? { backgroundImage: `url(${preset.bg})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : { background: preset.bg }
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleUserBgUpload}
                        disabled={uploading}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-emerald-500 text-white px-3 py-2 text-xs font-bold disabled:opacity-60"
                        disabled={uploading}
                      >
                        {uploading ? "업로드 중..." : "배경 이미지 업로드"}
                      </button>
                      <span className="text-xs text-zinc-500">최대 10장, 1장당 0.4MB</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {userBgs.length === 0 ? (
                        <span className="col-span-4 text-xs text-zinc-400 py-6 text-center">등록된 이미지가 없습니다.</span>
                      ) : (
                        userBgs.map((bg, idx) => (
                          <button
                            key={bg.url}
                            onClick={() => setSelectedId(`user-${idx}`)}
                            className={`h-14 rounded-lg border-2 ${selectedId === `user-${idx}` ? "border-zinc-900" : "border-zinc-200"}`}
                            style={{ backgroundImage: `url(${bg.url})`, backgroundSize: "cover", backgroundPosition: "center" }}
                            title={`${bg.name} (by ${bg.uploader})`}
                          />
                        ))
                      )}
                    </div>
                    {bgHasMore && (
                      <button
                        className="mt-2 w-full rounded-lg bg-zinc-100 py-2 text-xs font-bold text-zinc-700"
                        onClick={() => setBgPage((p) => p + 1)}
                      >
                        더보기
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button onClick={() => exportImage(false)} className="rounded-xl bg-[#4A6741] px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Download size={15} />
                    핸드폰 저장
                  </button>
                  <button onClick={() => exportImage(true)} className="rounded-xl bg-[#4A6741] px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Share2 size={15} />
                    공유
                  </button>
                  <button onClick={saveToRecords} className="rounded-xl bg-[#4A6741] px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Save size={15} />
                    기록함 보관
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-800">기록함</p>
                    <p className="text-xs text-zinc-500">{savedCards.length}개</p>
                  </div>

                  {savedCards.length === 0 ? (
                    <p className="py-6 text-center text-xs text-zinc-500">보관된 카드가 없습니다.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {savedCards.map((record) => (
                        <div key={record.id} className="relative">
                          <button
                            onClick={() => setActiveRecord(record)}
                            className="w-full overflow-hidden rounded-lg border border-zinc-200 bg-white"
                          >
                            <img src={record.imageDataUrl} alt={record.title} className="aspect-[4/5] w-full object-cover" />
                          </button>
                          <button
                            onClick={() => setPendingDeleteRecordId(record.id)}
                            className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                            aria-label="삭제"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {activeRecord && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[230] flex items-center justify-center bg-black/75 p-4"
              >
                <button onClick={() => setActiveRecord(null)} className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white">
                  <X size={18} />
                </button>
                <div className="w-full max-w-sm rounded-2xl bg-white p-3 shadow-2xl">
                  <img src={activeRecord.imageDataUrl} alt={activeRecord.title} className="mx-auto aspect-[4/5] w-full rounded-xl object-cover" />
                  <p className="mt-2 text-center text-sm font-bold text-zinc-800">{activeRecord.title}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => void saveRecordToPhone(activeRecord)}
                      className="rounded-xl bg-[#4A6741] px-3 py-2 text-sm font-bold text-white"
                    >
                      핸드폰 저장
                    </button>
                    <button
                      onClick={() => void shareRecord(activeRecord)}
                      className="rounded-xl bg-[#4A6741] px-3 py-2 text-sm font-bold text-white"
                    >
                      공유
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    {/* 카드 삭제 확인 모달 */}
    <AnimatePresence>
      {pendingDeleteRecordId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPendingDeleteRecordId(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-[280px] rounded-[28px] bg-white p-8 text-center shadow-2xl"
          >
            <h4 className="mb-2 text-base font-bold text-zinc-900">
              카드를 삭제할까요?
            </h4>
            <p className="mb-6 text-sm text-zinc-500">
              삭제한 이미지는 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDeleteRecordId(null)}
                className="flex-1 rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-600 transition-active active:scale-95"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (pendingDeleteRecordId) {
                    removeRecord(pendingDeleteRecordId);
                    setPendingDeleteRecordId(null);
                  }
                }}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition-active active:scale-95"
              >
                삭제
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </AnimatePresence>
  );
}
