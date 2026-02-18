import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share2, Upload, Save, X } from "lucide-react";

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

const BG_PRESETS = [
  "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  "linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)",
  "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
  "linear-gradient(135deg, #fde68a 0%, #fca5a5 100%)",
  "linear-gradient(135deg, #dbeafe 0%, #c4b5fd 100%)",
];

function storageKey(userId?: string | null) {
  return `verse-card-records:${userId || "guest"}`;
}

export function VerseCardMakerModal({ open, onClose, title, content, userId }: Props) {
  const [bg, setBg] = useState(BG_PRESETS[0]);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(42);
  const [textColor, setTextColor] = useState("#1f2937");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans-serif" | "monospace">("serif");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [paddingY, setPaddingY] = useState(70);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);

  const cleanContent = useMemo(() => content.replace(/\s+/g, " ").trim(), [content]);
  const previewStyle: React.CSSProperties = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: bgColor === "#ffffff" ? bg : bgColor };

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(storageKey(userId));
      const parsed = raw ? (JSON.parse(raw) as SavedCard[]) : [];
      setSavedCards(parsed);
    } catch {
      setSavedCards([]);
    }
  }, [open, userId]);

  const drawToCanvas = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1125; // 4:5
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (bgImage) {
      const img = new Image();
      img.src = bgImage;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else if (bgColor !== "#ffffff") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const colors = bg.match(/#[0-9a-fA-F]{3,8}/g) || ["#f8fafc", "#e2e8f0"];
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1] || colors[0]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const x = align === "left" ? 95 : align === "right" ? 805 : 450;
    ctx.fillStyle = textColor;
    ctx.textAlign = align;
    ctx.font = `${fontSize}px ${fontFamily}`;

    const maxWidth = 740;
    const words = cleanContent.split(" ");
    const lines: string[] = [];
    let line = "";
    words.forEach((w) => {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);

    const lineHeight = fontSize * 1.45;
    let y = paddingY + 80;
    lines.forEach((l) => {
      ctx.fillText(l, x, y);
      y += lineHeight;
    });

    ctx.font = `${Math.max(24, fontSize * 0.6)}px ${fontFamily}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(title, x, canvas.height - 85);
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
    const next = [entry, ...savedCards].slice(0, 20);
    setSavedCards(next);
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40" />
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

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex justify-center">
                <div
                  className="w-[82%] max-w-sm min-h-[450px] rounded-[32px] border border-zinc-200 p-8 flex flex-col justify-between"
                  style={previewStyle}
                >
                  <p style={{ fontSize, color: textColor, fontFamily, textAlign: align as any, lineHeight: 1.45 }} className="font-medium whitespace-pre-wrap break-keep">
                    {cleanContent}
                  </p>
                  <p className="mt-6 text-sm font-bold text-zinc-700">{title}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-zinc-500 mb-2">배경 프리셋</p>
                  <div className="grid grid-cols-5 gap-2">
                    {BG_PRESETS.map((v) => (
                      <button key={v} onClick={() => { setBgImage(null); setBgColor("#ffffff"); setBg(v); }} className={`h-8 rounded-md border ${bg === v ? "border-zinc-900" : "border-zinc-200"}`} style={{ background: v }} />
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-bold text-zinc-500">
                  배경 색상 직접 지정
                  <input type="color" value={bgColor} onChange={(e) => { setBgImage(null); setBgColor(e.target.value); }} className="mt-2 h-10 w-full rounded border border-zinc-200" />
                </label>

                <label className="block text-xs font-bold text-zinc-500">
                  배경 이미지 업로드
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setBgImage(String(reader.result || ""));
                      reader.readAsDataURL(file);
                    }}
                    className="mt-2 block w-full text-xs"
                  />
                </label>

                <label className="block text-xs font-bold text-zinc-500">
                  글자 크기
                  <input type="range" min={24} max={64} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="mt-2 w-full" />
                </label>

                <label className="block text-xs font-bold text-zinc-500">
                  글자 위치(위 여백)
                  <input type="range" min={20} max={190} value={paddingY} onChange={(e) => setPaddingY(Number(e.target.value))} className="mt-2 w-full" />
                </label>

                <label className="block text-xs font-bold text-zinc-500">
                  글자 색상
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="mt-2 h-10 w-full rounded border border-zinc-200" />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as any)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                    <option value="serif">명조체</option>
                    <option value="sans-serif">고딕체</option>
                    <option value="monospace">모노체</option>
                  </select>
                  <select value={align} onChange={(e) => setAlign(e.target.value as any)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                    <option value="left">왼쪽</option>
                    <option value="center">가운데</option>
                    <option value="right">오른쪽</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button onClick={() => exportImage(false)} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Download size={15} />
                    저장
                  </button>
                  <button onClick={() => exportImage(true)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Share2 size={15} />
                    공유
                  </button>
                  <button onClick={saveToRecords} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Save size={15} />
                    기록함
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold text-zinc-700 mb-2">내 기록함 미리보기</p>
              {savedCards.length === 0 ? (
                <p className="text-xs text-zinc-500">저장된 카드가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {savedCards.map((card) => (
                    <img key={card.id} src={card.imageDataUrl} alt={card.title} className="w-full aspect-[4/5] object-cover rounded-lg border border-zinc-200" />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
