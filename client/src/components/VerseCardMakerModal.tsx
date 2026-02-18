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
];

const IMAGE_PRESETS: ThemePreset[] = [
  { id: "i1", mode: "image", bg: "https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=1200&q=80", textColor: "#ffffff", subColor: "#f4f4f5" },
  { id: "i2", mode: "image", bg: "https://images.unsplash.com/photo-1508261305437-4acc6f5d6d4f?auto=format&fit=crop&w=1200&q=80", textColor: "#ffffff", subColor: "#f4f4f5" },
  { id: "i3", mode: "image", bg: "https://images.unsplash.com/photo-1472148439583-1f47cca7b78a?auto=format&fit=crop&w=1200&q=80", textColor: "#ffffff", subColor: "#f4f4f5" },
  { id: "i4", mode: "image", bg: "https://images.unsplash.com/photo-1437603568260-1950d3ca6eab?auto=format&fit=crop&w=1200&q=80", textColor: "#ffffff", subColor: "#f4f4f5" },
  { id: "i5", mode: "image", bg: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80", textColor: "#ffffff", subColor: "#f4f4f5" },
];

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

  const cleanContent = useMemo(() => normalizeVerseText(content), [content]);
  const currentPreset = useMemo(() => {
    const pool = mode === "color" ? COLOR_PRESETS : IMAGE_PRESETS;
    return pool.find((v) => v.id === selectedId) || pool[0];
  }, [mode, selectedId]);

  useEffect(() => {
    if (!open) return;
    const pool = mode === "color" ? COLOR_PRESETS : IMAGE_PRESETS;
    const randomized = pool[Math.floor(Math.random() * pool.length)];
    setSelectedId(randomized.id);
    try {
      const raw = localStorage.getItem(storageKey(userId));
      const parsed = raw ? (JSON.parse(raw) as SavedCard[]) : [];
      setSavedCards(parsed);
    } catch {
      setSavedCards([]);
    }
  }, [open, mode, userId]);

  const drawToCanvas = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1125; // 4:5
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (currentPreset.mode === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = currentPreset.bg;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.26)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const colors = currentPreset.bg.match(/#[0-9a-fA-F]{3,8}/g) || ["#ffffff", "#f4f4f5"];
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1] || colors[0]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const x = 450;
    ctx.fillStyle = currentPreset.textColor;
    ctx.textAlign = "center";
    ctx.font = "bold 46px serif";

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

    const lineHeight = 66;
    const blockHeight = allLines.length * lineHeight;
    let y = Math.max(210, Math.floor((canvas.height - blockHeight) / 2));
    allLines.forEach((line) => {
      if (!line) {
        y += 16;
        return;
      }
      ctx.fillText(line, x, y);
      y += lineHeight;
    });

    ctx.fillStyle = currentPreset.subColor;
    ctx.font = "bold 30px serif";
    ctx.fillText(title, x, canvas.height - 96);
    return canvas;
  };

  const exportImage = async (shareMode = false) => {
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
  };

  const saveToRecords = async () => {
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
  };

  const previewStyle: React.CSSProperties =
    currentPreset.mode === "image"
      ? { backgroundImage: `url(${currentPreset.bg})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: currentPreset.bg };

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
                <div className="w-[82%] max-w-sm min-h-[450px] rounded-[32px] border border-zinc-200 p-8 flex flex-col justify-between" style={previewStyle}>
                  <div className={currentPreset.mode === "image" ? "bg-black/25 -m-8 p-8 rounded-[32px] min-h-[450px] flex flex-col justify-between" : "min-h-[450px] flex flex-col justify-between"}>
                    <p className="whitespace-pre-wrap break-keep text-center leading-[1.5] font-bold" style={{ color: currentPreset.textColor, fontSize: 32 }}>
                      {cleanContent}
                    </p>
                    <p className="mt-6 text-center font-bold" style={{ color: currentPreset.subColor, fontSize: 18 }}>
                      {title}
                    </p>
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

                <div className="grid grid-cols-4 gap-2">
                  {(mode === "color" ? COLOR_PRESETS : IMAGE_PRESETS).map((preset) => (
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
                  <button onClick={() => exportImage(false)} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Download size={15} />
                    핸드폰에 저장
                  </button>
                  <button onClick={() => exportImage(true)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Share2 size={15} />
                    공유
                  </button>
                  <button onClick={saveToRecords} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
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
