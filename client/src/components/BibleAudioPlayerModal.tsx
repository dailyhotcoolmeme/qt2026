import React from "react";
import { Loader2, Pause, Play, SkipBack, SkipForward, StepForward, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  loading: boolean;
  subtitle?: string;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (nextTime: number) => void;
  onPrevVerse?: () => void;
  onNextVerse?: () => void;
  onNextChapter?: () => void;
  canNextChapter?: boolean;
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
  subtitle,
  isPlaying,
  progress,
  duration,
  onClose,
  onTogglePlay,
  onSeek,
  onPrevVerse,
  onNextVerse,
  onNextChapter,
  canNextChapter = false,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-24 left-6 right-6 z-[120] rounded-[24px] bg-[#4A6741] p-3 text-white shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[12px] text-white/85">{subtitle || ""}</p>
            <button onClick={onClose} className="rounded-full p-1 text-white/90 hover:bg-white/20">
              <X size={17} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs text-white">
              <Loader2 size={14} className="animate-spin" />
              <span>오디오 로딩 중...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevVerse}
                className="h-8 w-8 shrink-0 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
              >
                <SkipBack size={14} />
              </button>
              <button
                onClick={onTogglePlay}
                className="h-8 w-8 shrink-0 rounded-full bg-white text-[#4A6741] flex items-center justify-center"
              >
                {isPlaying ? <Pause size={14} fill="#4A6741" /> : <Play size={14} fill="#4A6741" />}
              </button>
              <button
                onClick={onNextVerse}
                className="h-8 w-8 shrink-0 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
              >
                <SkipForward size={14} />
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(1, duration)}
                step={0.01}
                value={Math.min(progress, Math.max(1, duration))}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="min-w-0 flex-1 accent-white"
              />
              <div className="shrink-0 text-[11px] tabular-nums text-white/90">
                {fmt(progress)} / {fmt(duration)}
              </div>
              {onNextChapter ? (
                <button
                  onClick={onNextChapter}
                  disabled={!canNextChapter}
                  className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                    canNextChapter ? "bg-white/20 hover:bg-white/30" : "bg-white/10 text-white/40"
                  }`}
                >
                  <StepForward size={14} />
                </button>
              ) : null}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
