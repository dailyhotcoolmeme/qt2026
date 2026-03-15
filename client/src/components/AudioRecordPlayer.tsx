import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Download, MoreVertical, Pause, Play, Volume2, VolumeX } from "lucide-react";

function formatTimeLabel(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

type AudioRecordPlayerProps = {
  src?: string | null;
  blob?: Blob | null;
  title: string;
  subtitle?: string;
  onDelete?: () => void;
  deleteIcon?: React.ReactNode;
  deleteTitle?: string;
  downloadName?: string;
  className?: string;
};

export function AudioRecordPlayer({
  src,
  blob,
  title,
  subtitle,
  onDelete,
  deleteIcon,
  deleteTitle = "삭제",
  downloadName,
  className = "",
}: AudioRecordPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerId = useId();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showMenu, setShowMenu] = useState(false);

  const resolvedSrc = useMemo(() => {
    if (src) return src;
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [blob, src]);

  useEffect(() => {
    return () => {
      if (blob && resolvedSrc) {
        URL.revokeObjectURL(resolvedSrc);
      }
    };
  }, [blob, resolvedSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const handleExternalPlay = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== playerId && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };

    window.addEventListener("audio-record-player:play", handleExternalPlay as EventListener);
    return () => {
      window.removeEventListener("audio-record-player:play", handleExternalPlay as EventListener);
    };
  }, [playerId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, [resolvedSrc]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !resolvedSrc) return;

    if (audio.paused) {
      window.dispatchEvent(new CustomEvent("audio-record-player:play", { detail: { id: playerId } }));
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const cyclePlaybackRate = () => {
    const nextRate = playbackRate >= 1.5 ? 0.75 : playbackRate >= 1.25 ? 1.5 : playbackRate >= 1 ? 1.25 : 1;
    setPlaybackRate(nextRate);
  };

  const handleDownload = () => {
    if (!resolvedSrc) return;
    const link = document.createElement("a");
    link.href = resolvedSrc;
    link.download = downloadName || `${title}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMenu(false);
  };

  return (
    <div className={`bg-[#4A6741]/5 rounded-xl border border-[#4A6741]/10 p-3 ${className}`}>
      <audio ref={audioRef} src={resolvedSrc || undefined} preload="metadata" />
      <div className="flex items-start gap-3">
        <button
          onClick={() => void togglePlay()}
          className="mt-0.5 w-9 h-9 flex-shrink-0 rounded-full bg-[#4A6741] text-white flex items-center justify-center"
          type="button"
        >
          {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-bold text-[#4A6741]/90 text-sm">{title}</div>
              {subtitle && <div className="mt-0.5 text-xs text-zinc-400">{subtitle}</div>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:bg-white hover:text-zinc-600"
                type="button"
                title={isMuted ? "음소거 해제" : "음소거"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button
                onClick={cyclePlaybackRate}
                className="px-2 py-1 rounded-full text-[11px] font-bold text-[#4A6741] bg-white"
                type="button"
              >
                {playbackRate.toFixed(2).replace(/\.00$/, "")}x
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:bg-white hover:text-zinc-600"
                  type="button"
                  title="더보기"
                >
                  <MoreVertical size={15} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 z-20 rounded-xl border border-zinc-100 bg-white p-1 shadow-lg">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                      type="button"
                    >
                      <Download size={14} />
                      다운로드
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: duration > 0
                  ? `linear-gradient(to right, #4A6741 0%, #4A6741 ${(currentTime / duration) * 100}%, #c8dfc4 ${(currentTime / duration) * 100}%, #c8dfc4 100%)`
                  : "#c8dfc4",
              }}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#4A6741]/70">
              <span>{formatTimeLabel(currentTime)}</span>
              <span>{formatTimeLabel(duration)}</span>
            </div>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-full text-red-300 hover:bg-red-50 transition-colors shrink-0"
            title={deleteTitle}
            type="button"
          >
            {deleteIcon}
          </button>
        )}
      </div>
    </div>
  );
}
