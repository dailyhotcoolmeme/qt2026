import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Download, Mic, MoreVertical, Pause, Play, Volume2, VolumeX } from "lucide-react";

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
  icon?: React.ReactNode;
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
  icon,
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

    audio.playbackRate = playbackRate;
    audio.muted = isMuted;

    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
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
  }, [isMuted, playbackRate, resolvedSrc]);

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
    <div className={`rounded-xl border border-zinc-100 bg-[#f1f3f4] p-2.5 shadow-sm ${className}`}>
      <audio ref={audioRef} src={resolvedSrc || undefined} preload="metadata" />
      <div className="grid grid-cols-[22px_1fr] gap-x-3 gap-y-1">
        <div className="self-center text-[#4A6741]/90">
          {icon ?? <Mic size={22} strokeWidth={1.5} />}
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight text-[#4A6741]/90">{title}</div>
              {subtitle && <div className="mt-1 text-xs text-zinc-400">{subtitle}</div>}
            </div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="h-7 w-7 shrink-0 rounded-full text-red-300 transition-colors hover:bg-red-50"
                title={deleteTitle}
                type="button"
              >
                <div className="flex h-full w-full items-center justify-center">{deleteIcon}</div>
              </button>
            )}
          </div>
        </div>

        <div aria-hidden="true" />
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void togglePlay()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4A6741] text-white"
            type="button"
          >
            {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
          </button>

          <div className="min-w-0 flex-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
              style={{
                background:
                  duration > 0
                    ? `linear-gradient(to right, #4A6741 0%, #4A6741 ${(currentTime / duration) * 100}%, #c8dfc4 ${(currentTime / duration) * 100}%, #c8dfc4 100%)`
                    : "#c8dfc4",
              }}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#4A6741]/70">
              <span>{formatTimeLabel(currentTime)}</span>
              <span>{formatTimeLabel(duration)}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-white hover:text-zinc-600"
              type="button"
              title={isMuted ? "음소거 해제" : "음소거"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              onClick={cyclePlaybackRate}
              className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-[#4A6741]"
              type="button"
            >
              {playbackRate.toFixed(2).replace(/\.00$/, "")}x
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-white hover:text-zinc-600"
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
      </div>
    </div>
  );
}
