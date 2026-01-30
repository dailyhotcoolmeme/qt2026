import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null); 
  const { fontSize = 16 } = useDisplaySettings();
  const [bibleData, setBibleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVerse = async () => {
      setLoading(true);
      const formattedDate = currentDate.toISOString().split('T')[0];
      const { data: verse } = await supabase.from('daily_bible_verses').select('*').eq('display_date', formattedDate).maybeSingle();
      setBibleData(verse || null);
      setLoading(false);
    };
    fetchVerse();
  }, [currentDate]);

  const cleanContent = (text: string) => {
    if (!text) return "";
    return text.replace(/^[.\s]+/, "").replace(/\d+절/g, "").replace(/\d+/g, "").replace(/[."'“”‘’]/g, "").replace(/\.$/, "").trim();
  };

  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);
    } else if (info.offset.x < -100) {
      const d = new Date(currentDate); d.setDate(d.getDate() + 1);
      if (d <= today) setCurrentDate(d);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      
      <header className="text-center mb-3 flex flex-col items-center relative flex-none">
        <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button onClick={() => dateInputRef.current?.showPicker()} className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform">
            <CalendarIcon size={18} strokeWidth={2.5} />
          </button>
          <input type="date" ref={dateInputRef} onChange={(e) => setCurrentDate(new Date(e.target.value))} max={today.toISOString().split("T")[0]} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        <div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-40 shadow-sm" />
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentDate.toISOString()}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center justify-center p-10 text-center z-10 touch-none cursor-grab active:cursor-grabbing"
          >
            {loading ? (
              <div className="animate-pulse text-zinc-200 font-bold">말씀을 불러오는 중...</div>
            ) : bibleData ? (
              <>
                <p className="text-zinc-800 leading-[1.7] break-keep font-medium mb-6" style={{ fontSize: `${fontSize}px` }}>
                  {cleanContent(bibleData.content)}
                </p>
                <span className="font-bold text-[#4A6741] opacity-60 uppercase tracking-widest" style={{ fontSize: `${fontSize * 0.9}px` }}>
                  {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse}절
                </span>
              </>
            ) : (
              <div className="text-zinc-300 font-medium">해당 날짜의 말씀이 없습니다.</div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-40 shadow-sm" />
      </div>
    </div>
  );
}
