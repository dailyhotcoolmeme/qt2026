import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Save, Share2, X } from "lucide-react";

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
  const fromEnv = String(import.meta.env.VITE_VERSE_CARD_IMAGE_PRESETS || "")
    .split(",")
    .map((v) => v.trim())
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

function normalizeVerseText(raw: string): string {
  const lines = String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.?\s*/, "").trim());
  return lines.join("\n");
}

export function VerseCardMakerModal({ open, onClose, title, content, userId }: Props) {
  const [mode, setMode] = useState<ThemeMode>("color");
  const [selectedId, setSelectedId] = useState<string>(COLOR_PRESETS[0].id);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [fontSize, setFontSize] = useState<number>(30);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [imageOpacity, setImageOpacity] = useState<number>(0.9);

  const imagePresets = useMemo(() => resolveImagePresets(), []);
  const cleanContent = useMemo(() => normalizeVerseText(content), [content]);

  const currentPreset = useMemo(() => {
    const pool = mode === "color" ? COLOR_PRESETS : imagePresets;
    return pool.find((v) => v.id === selectedId) || pool[0];
  }, [mode, selectedId, imagePresets]);

  const effectiveTextColor =
    currentPreset?.mode === "image"
      ? imageOpacity <= 0.62
        ? "#1f2937"
        : "#ffffff"
      : currentPreset?.textColor || "#3f3f46";
  const effectiveSubColor =
    currentPreset?.mode === "image"
      ? imageOpacity <= 0.62
        ? "#334155"
        : "#f4f4f5"
      : currentPreset?.subColor || "#52525b";

  useEffect(() => {
    if (!open) return;
    const pool = mode === "color" ? COLOR_PRESETS : imagePresets;
    const randomized = pool[Math.floor(Math.random() * pool.length)] || pool[0];
    if (randomized) setSelectedId(randomized.id);
    try {
      const raw = localStorage.getItem(storageKey(userId));
      const parsed = raw ? (JSON.parse(raw) as SavedCard[]) : [];
      setSavedCards(parsed);
    } catch {
      setSavedCards([]);
    }
  }, [open, mode, userId, imagePresets]);

  const drawToCanvas = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1125;
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
      ctx.globalAlpha = imageOpacity;
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
    ctx.font = `bold ${Math.round(fontSize * 1.44)}px serif`;

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

    const lineHeight = Math.max(44, Math.round(fontSize * 2.06));
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
    ctx.font = `bold ${Math.round(fontSize * 0.78)}px serif`;
    const titleY = Math.min(canvas.height - 80, y + Math.max(24, Math.round(fontSize * 0.8)));
    ctx.fillText(title, x, titleY);
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
      const imageDataUrl = canvas.toDataURL("image/png");
      const entry: SavedCard = {
        id: `${Date.now()}`,
        title,
        imageDataUrl,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...savedCards].slice(0, 30);
      setSavedCards(next);
      localStorage.setItem(storageKey(userId), JSON.stringify(next));
    } catch (error) {
      console.error("save card failed:", error);
      alert("기록함 보관에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const previewStyle: React.CSSProperties =
    currentPreset?.mode === "image"
      ? { background: "#ffffff" }
      : { background: currentPreset?.bg || COLOR_PRESETS[0].bg };
  const previewWidthPx = Math.round(260 * previewScale);
  const previewBodyFontPx = Math.max(12, Math.round(fontSize * previewScale));
  const previewRefFontPx = Math.max(11, Math.round(fontSize * 0.52 * previewScale));

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
                  style={{ ...previewStyle, width: `${previewWidthPx}px` }}
                >
                  {currentPreset?.mode === "image" ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${toProxyUrl(currentPreset.bg)})`, opacity: imageOpacity }}
                    />
                  ) : null}
                  <div className="relative h-full flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <p className="whitespace-pre-wrap break-keep text-center leading-[1.5] font-bold" style={{ color: effectiveTextColor, fontSize: previewBodyFontPx }}>
                        {cleanContent}
                      </p>
                      <p className="mt-2 text-center font-bold" style={{ color: effectiveSubColor, fontSize: previewRefFontPx }}>
                        {title}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode("color")} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "color" ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                    배경 색상 프리셋
                  </button>
                  <button onClick={() => setMode("image")} className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === "image" ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                    배경 이미지 선택
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">미리보기 배율: {Math.round(previewScale * 100)}%</label>
                  <input
                    type="range"
                    min={0.7}
                    max={1.2}
                    step={0.01}
                    value={previewScale}
                    onChange={(e) => setPreviewScale(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">글자 크기: {fontSize}px</label>
                  <input
                    type="range"
                    min={20}
                    max={38}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {mode === "image" && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">배경 이미지 투명도: {Math.round(imageOpacity * 100)}%</label>
                    <input
                      type="range"
                      min={0.25}
                      max={1}
                      step={0.01}
                      value={imageOpacity}
                      onChange={(e) => setImageOpacity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

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
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
