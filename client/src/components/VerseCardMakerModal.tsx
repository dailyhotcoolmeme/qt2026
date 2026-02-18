import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
};

const BG_PRESETS = [
  "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  "linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)",
  "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
  "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
  "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
];

export function VerseCardMakerModal({ open, onClose, title, content }: Props) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [bg, setBg] = useState(BG_PRESETS[0]);
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState("#1f2937");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans-serif" | "monospace">("serif");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [paddingY, setPaddingY] = useState(64);

  const cleanContent = useMemo(() => content.replace(/\s+/g, " ").trim(), [content]);

  const exportImage = async (shareMode = false) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const colors = bg.match(/#[0-9a-fA-F]{3,8}/g) || ["#f8fafc", "#e2e8f0"];
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1] || colors[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const x = align === "left" ? 120 : align === "right" ? 960 : 540;
    ctx.fillStyle = textColor;
    ctx.textAlign = align;
    ctx.font = `${fontSize}px ${fontFamily}`;

    const maxWidth = 840;
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
    let y = paddingY + 120;
    lines.forEach((l) => {
      ctx.fillText(l, x, y);
      y += lineHeight;
    });

    ctx.font = `${Math.max(24, fontSize * 0.62)}px ${fontFamily}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(title, x, canvas.height - 120);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) return;

    if (shareMode && navigator.canShare && navigator.canShare({ files: [new File([blob], "verse-card.png", { type: "image/png" })] })) {
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40" />
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="relative w-full max-w-3xl rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900">말씀 카드 생성</h3>
              <button onClick={onClose} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[1fr_320px]">
              <div
                ref={previewRef}
                className="aspect-[4/5] w-full rounded-2xl border border-zinc-200 p-8 flex flex-col justify-between"
                style={{ background: bg }}
              >
                <p style={{ fontSize, color: textColor, fontFamily, textAlign: align as any, lineHeight: 1.45 }} className="font-medium whitespace-pre-wrap break-keep">
                  {cleanContent}
                </p>
                <p className="mt-6 text-sm font-bold text-zinc-700">{title}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-zinc-500 mb-2">배경</p>
                  <div className="grid grid-cols-5 gap-2">
                    {BG_PRESETS.map((v) => (
                      <button key={v} onClick={() => setBg(v)} className={`h-8 rounded-md border ${bg === v ? "border-zinc-900" : "border-zinc-200"}`} style={{ background: v }} />
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-bold text-zinc-500">
                  글자 크기
                  <input type="range" min={22} max={52} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="mt-2 w-full" />
                </label>

                <label className="block text-xs font-bold text-zinc-500">
                  위치(위 여백)
                  <input type="range" min={24} max={180} value={paddingY} onChange={(e) => setPaddingY(Number(e.target.value))} className="mt-2 w-full" />
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

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button onClick={() => exportImage(false)} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Download size={16} />
                    저장
                  </button>
                  <button onClick={() => exportImage(true)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Share2 size={16} />
                    공유
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
