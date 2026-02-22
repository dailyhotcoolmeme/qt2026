import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, Copy, Bookmark, Share2, Heart, ImagePlus as ImageIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import { VerseCardMakerModal } from "../components/VerseCardMakerModal";

function cleanContent(text: string) {
  return String(text || "")
    .replace(/^[.\s]+/, "")
    .replace(/[{}[\]"]/g, "")
    .trim();
}

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DailyWordPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bibleData, setBibleData] = useState<any>(null);
  const [hasAmened, setHasAmened] = useState(false);
  const [amenCount, setAmenCount] = useState(0);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showCardMaker, setShowCardMaker] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const today = useMemo(() => new Date(), []);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { fontSize = 16 } = useDisplaySettings();
  const { user } = useAuth();

  useEffect(() => {
    const fetchVerse = async () => {
      const formattedDate = formatLocalDate(currentDate);

      const { data: verse } = await supabase
        .from("daily_bible_verses")
        .select("*")
        .eq("display_date", formattedDate)
        .maybeSingle();

      if (!verse) {
        setBibleData(null);
        setAmenCount(0);
        setHasAmened(false);
        return;
      }

      const { data: book } = await supabase
        .from("bible_books")
        .select("book_order")
        .eq("book_name", verse.bible_name)
        .maybeSingle();

      setBibleData({ ...verse, bible_books: book });
      setAmenCount(verse.amen_count || 0);
      setHasAmened(false);
    };

    fetchVerse();
  }, [currentDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      if (selectedDate > today) {
        alert("오늘 이후의 말씀은 미리 볼 수 없습니다.");
        return;
      }
      setCurrentDate(selectedDate);
    }
  };

  const onDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 1);
      setCurrentDate(prev);
      return;
    }

    if (info.offset.x < -100) {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 1);
      if (next <= new Date()) setCurrentDate(next);
    }
  };

  const handleAmenClick = async () => {
    if (hasAmened || !bibleData) return;
    if (window.navigator?.vibrate) window.navigator.vibrate(30);

    setHasAmened(true);
    setAmenCount((prev) => prev + 1);

    await supabase
      .from("daily_bible_verses")
      .update({ amen_count: (bibleData.amen_count || 0) + 1 })
      .eq("id", bibleData.id);
  };

  const handleCopy = async () => {
    if (!bibleData) return;
    await navigator.clipboard.writeText(cleanContent(bibleData.content));
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const handleShare = async () => {
    const text = bibleData?.content ? cleanContent(bibleData.content) : "말씀을 공유해 보세요.";
    const shareData = { title: "오늘의 말씀", text, url: window.location.href };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("링크를 클립보드에 복사했습니다.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error("share failed", error);
      }
    }
  };

  const handleBookmark = async () => {
    if (!bibleData) return;
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    const unit = bibleData.bible_name === "시편" ? "편" : "장";
    const verseRef = `${bibleData.bible_name} ${bibleData.chapter}${unit} ${bibleData.verse}절`;

    const { error } = await supabase.from("verse_bookmarks").insert({
      user_id: user.id,
      source: "daily_word",
      verse_ref: verseRef,
      content: cleanContent(bibleData.content),
      memo: null,
    });

    if (error) {
      if (error.code === "23505") {
        alert("이미 저장된 말씀입니다.");
        return;
      }
      alert("기록함 저장에 실패했습니다.");
      return;
    }

    alert("기록함에 보관되었습니다.");
  };

  const handleOpenCardMaker = () => {
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }
    setShowCardMaker(true);
  };

  const verseTitle = bibleData
    ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}`
    : "";

  return (
    <div className="flex min-h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto bg-[#F8F8F8] px-4 pb-4 pt-24">
      <header className="relative mb-3 flex w-full flex-col items-center text-center">
        <p className="mb-1 font-bold tracking-[0.2em] text-gray-400" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex w-full items-center justify-center">
          <div className="flex flex-1 justify-end pr-3">
            <button
              onClick={() => dateInputRef.current?.showPicker()}
              className="rounded-full border border-zinc-100 bg-white p-1.5 text-[#4A6741] shadow-sm transition-transform active:scale-95"
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
            </button>
          </div>

          <h2 className="shrink-0 font-black tracking-tighter text-zinc-900" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
          </h2>

          <div className="flex flex-1 justify-start pl-3">
            <div className="h-[28px] w-[28px]" aria-hidden="true" />
          </div>

          <input
            ref={dateInputRef}
            type="date"
            onChange={handleDateChange}
            max={formatLocalDate(new Date())}
            className="pointer-events-none absolute opacity-0"
          />
        </div>
      </header>

      <div className="relative flex w-full flex-1 items-center justify-center overflow-visible py-4">
        <div className="absolute left-[-75%] z-0 aspect-[4/5] w-[82%] max-w-sm scale-90 rounded-[32px] bg-white blur-[0.5px]" />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentDate.toISOString()}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-[82%] max-w-sm h-auto bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-start justify-center px-8 py-6 text-left z-10 touch-none cursor-grab active:cursor-grabbing"
  >
          {bibleData ? (
            <>
              <div
                className="mb-6 w-full space-y-4 break-keep font-medium leading-[1.7] text-zinc-800"
                style={{ fontSize: `${fontSize}px` }}
              >
                {String(bibleData.content || "")
                  .split("\n")
                  .map((line: string, i: number) => {
                    const m = line.match(/^(\d+)\.?\s*(.*)$/);
                    if (!m) return <p key={i}>{line}</p>;
                    return (
                      <p key={i} className="flex items-start gap-2">
                        <span className="mt-[2px] flex-shrink-0 text-[0.8em] font-bold text-[#4A6741] opacity-40">{m[1]}</span>
                        <span className="flex-1">{m[2]}</span>
                      </p>
                    );
                  })}
              </div>
              <span className="self-center text-center font-bold text-[#4A6741] opacity-60" style={{ fontSize: `${fontSize * 0.9}px` }}>
                {verseTitle}
              </span>
            </>
          ) : (
            <div className="w-full animate-pulse text-center text-zinc-300">말씀을 불러오는 중...</div>
          )}
        </motion.div>
      </AnimatePresence>   
        <div className="absolute right-[-75%] z-0 aspect-[4/5] w-[82%] max-w-sm scale-90 rounded-[32px] bg-white blur-[0.5px]" />
      </div>

      <div className="mb-14 mt-3 flex items-center gap-8">
        <button onClick={handleOpenCardMaker} className="flex flex-col items-center gap-1.5 text-[#4A6741]">
          <ImageIcon size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>카드 생성</span>
        </button>
        <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button onClick={handleBookmark} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Bookmark size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 transition-transform active:scale-95">
          <Share2 size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span>
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 pb-6">
        <div className="relative flex h-24 w-24 items-center justify-center">
          
          <AnimatePresence>
            {hasAmened && (
              <>
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 2.2, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-[#4A6741]"
                />
                <motion.div
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.2, opacity: 0 }}
                  transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
                  className="absolute inset-0 rounded-full bg-[#4A6741]"
                />
              </>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleAmenClick}
            className={`relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full shadow-xl transition-all duration-500 ${
              hasAmened ? "border-none bg-[#4A6741] text-white" : "border border-green-50 bg-white text-[#4A6741]"
            }`}
          >
            <Heart className={`mb-1 h-5 w-5 ${hasAmened ? "fill-white" : ""}`} strokeWidth={hasAmened ? 0 : 2} />
            <span className="font-bold" style={{ fontSize: `${fontSize * 0.9}px` }}>아멘</span>
            <span className="font-bold opacity-70" style={{ fontSize: `${fontSize * 0.9}px` }}>
              {amenCount.toLocaleString()}
            </span>
          </motion.button>
        </div>
      </div>

      <VerseCardMakerModal
        open={showCardMaker}
        onClose={() => setShowCardMaker(false)}
        title={verseTitle}
        content={bibleData?.content || ""}
        userId={user?.id ?? null}
      />

      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ opacity: 0, x: "-50%", y: 20 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-36 left-1/2 z-[200] whitespace-nowrap rounded-full bg-[#4A6741] px-6 py-3 text-sm font-medium text-white shadow-lg"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            말씀을 복사했습니다.
          </motion.div>
        )}
      </AnimatePresence>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} returnTo={`${window.location.origin}/#/`} />
    </div>
  );
}
