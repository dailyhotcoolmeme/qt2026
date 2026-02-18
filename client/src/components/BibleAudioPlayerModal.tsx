import React from "react";
import { Loader2, Pause, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  loading: boolean;
  title: string;
  subtitle?: string;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (nextTime: number) => void;
};

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function BibleAudioPlayerModal({
  open,
  loading,
  title,
  subtitle,
  isPlaying,
  progress,
  duration,
  onClose,
  onTogglePlay,
  onSeek,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-20 left-4 right-4 z-[120] rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,0.18)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-zinc-900">{title}</p>
              {subtitle ? <p className="text-xs text-zinc-500 mt-1">{subtitle}</p> : null}
            </div>
            <button onClick={onClose} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100">
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              <Loader2 size={16} className="animate-spin" />
              <span>오디오를 준비하는 중입니다. 잠시만 기다려주세요.</span>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-3">
                <button onClick={onTogglePlay} className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  {isPlaying ? <Pause size={17} fill="white" /> : <Play size={17} fill="white" />}
                </button>
                <div className="text-xs text-zinc-500">
                  {fmt(progress)} / {fmt(duration)}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(1, duration)}
                step={0.01}
                value={Math.min(progress, Math.max(1, duration))}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
