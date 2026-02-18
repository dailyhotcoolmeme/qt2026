import React from "react";
import { Loader2, Pause, Play, SkipBack, SkipForward, StepBack, StepForward, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  loading: boolean;
  subtitle?: string;
  fontSize?: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (nextTime: number) => void;
  onPrevVerse?: () => void;
  onNextVerse?: () => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  canPrevChapter?: boolean;
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
  fontSize = 16,
  isPlaying,
  progress,
  duration,
  onClose,
  onTogglePlay,
  onSeek,
  onPrevVerse,
  onNextVerse,
  onPrevChapter,
  onNextChapter,
  canPrevChapter = false,
  canNextChapter = false,
}: Props) {
  const scale = Math.max(0.9, Math.min(1.6, fontSize / 16));
  const buttonSize = Math.round(32 * scale);
  const iconSize = Math.round(14 * scale);
  const subtitleSize = Math.round(12 * scale);
  const timeSize = Math.round(11 * scale);
  const gap = Math.max(8, Math.round(8 * scale));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-24 left-6 right-6 z-[120] rounded-[24px] bg-[#4A6741] p-3 text-white shadow-2xl"
          style={{ padding: `${Math.round(12 * scale)}px` }}
        >
          <div className="mb-2 flex items-center justify-between gap-2" style={{ marginBottom: Math.round(8 * scale) }}>
            <p className="min-w-0 truncate text-white/85" style={{ fontSize: subtitleSize }}>{subtitle || ""}</p>
            <button onClick={onClose} className="rounded-full p-1 text-white/90 hover:bg-white/20">
              <X size={Math.round(17 * scale)} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center rounded-xl bg-white/15 px-3 py-2 text-white" style={{ gap, fontSize: Math.max(12, Math.round(12 * scale)) }}>
              <Loader2 size={iconSize} className="animate-spin" />
              <span>Loading audio...</span>
            </div>
          ) : (
            <div className="flex items-center" style={{ gap }}>
              {onPrevChapter ? (
                <button
                  onClick={onPrevChapter}
                  disabled={!canPrevChapter}
                  className={`shrink-0 rounded-full flex items-center justify-center ${
                    canPrevChapter ? "bg-white/20 hover:bg-white/30" : "bg-white/10 text-white/40"
                  }`}
                  style={{ width: buttonSize, height: buttonSize }}
                  title="Previous chapter"
                >
                  <StepBack size={iconSize} />
                </button>
              ) : null}

              <button
                onClick={onPrevVerse}
                className="shrink-0 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                style={{ width: buttonSize, height: buttonSize }}
                title="Previous verse"
              >
                <SkipBack size={iconSize} />
              </button>

              <button
                onClick={onTogglePlay}
                className="shrink-0 rounded-full bg-white text-[#4A6741] flex items-center justify-center"
                style={{ width: buttonSize, height: buttonSize }}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={iconSize} fill="#4A6741" /> : <Play size={iconSize} fill="#4A6741" />}
              </button>

              <button
                onClick={onNextVerse}
                className="shrink-0 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                style={{ width: buttonSize, height: buttonSize }}
                title="Next verse"
              >
                <SkipForward size={iconSize} />
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

              <div className="shrink-0 tabular-nums text-white/90" style={{ fontSize: timeSize }}>
                {fmt(progress)} / {fmt(duration)}
              </div>

              {onNextChapter ? (
                <button
                  onClick={onNextChapter}
                  disabled={!canNextChapter}
                  className={`shrink-0 rounded-full flex items-center justify-center ${
                    canNextChapter ? "bg-white/20 hover:bg-white/30" : "bg-white/10 text-white/40"
                  }`}
                  style={{ width: buttonSize, height: buttonSize }}
                  title="Next chapter"
                >
                  <StepForward size={iconSize} />
                </button>
              ) : null}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
