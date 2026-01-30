import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar as CalendarIcon 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  [span_0](start_span)[span_1](start_span)// 1. 상태 및 레퍼런스 설정 (DailyWordPage와 동일)[span_0](end_span)[span_1](end_span)
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null); 
  const { fontSize = 16 } = useDisplaySettings();
  const [bibleData, setBibleData] = useState<any>(null);

  [span_2](start_span)// 2. 날짜 변경 로직 (DailyWordPage와 동일)[span_2](end_span)
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

  [span_3](start_span)// 3. 말씀 가져오기 로직[span_3](end_span)
  useEffect(() => {
    const fetchVerse = async () => {
      const formattedDate = currentDate.toISOString().split('T')[0];
      const { data: verse } = await supabase
        .from('daily_bible_verses')
        .select('*')
        .eq('display_date', formattedDate)
        .maybeSingle();
      
      if (verse) {
        setBibleData(verse);
      }
    };
    fetchVerse();
  }, [currentDate]);

  [span_4](start_span)// 4. 텍스트 정제 로직[span_4](end_span)
  const cleanContent = (text: string) => {
    if (!text) return "";
    return text
      .replace(/^[.\s]+/, "") 
      .replace(/\d+절/g, "")
      .replace(/\d+/g, "")
      .replace(/[."'“”‘’]/g, "")
      .replace(/\.$/, "")
      .trim();
  };

  [span_5](start_span)// 5. 스와이프(드래그) 로직[span_5](end_span)
  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) { // 이전 날짜 이동
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (info.offset.x < -100) { // 다음 날짜 이동
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) setCurrentDate(d);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      
      [span_6](start_span){/* [상단 날짜 영역] - DailyWordPage와 100% 동일[span_6](end_span) */}
      <header className="text-center mb-3 flex flex-col items-center relative">
        <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button 
            onClick={() => dateInputRef.current?.showPicker()} 
            className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform"
          >
            <CalendarIcon size={18} strokeWidth={2.5} />
          </button>
          <input 
            type="date"
            ref={dateInputRef}
            onChange={handleDateChange}
            max={new Date().toISOString().split("T")[0]} 
            className="absolute opacity-0 pointer-events-none"
          />
        </div>
      </header>

      [span_7](start_span){/* [말씀 카드 영역] - DailyWordPage와 100% 동일[span_7](end_span) */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        {/* 왼쪽 힌트 카드 */}
        <div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
        
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
            className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center justify-center p-10 text-center z-10 touch-none cursor-grab active:cursor-grabbing"
          >
            {bibleData ? (
              <>
                <p className="text-zinc-800 leading-[1.7] break-keep font-medium mb-6" style={{ fontSize: `${fontSize}px` }}>
                  {cleanContent(bibleData.content)}
                </p>
                <span className="font-bold text-[#4A6741] opacity-60" style={{ fontSize: `${fontSize * 0.9}px` }}>
                  {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse}절
                </span>
              </>
            ) : (
              <div className="animate-pulse text-zinc-200">말씀을 불러오는 중...</div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 오른쪽 힌트 카드 */}
        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>
    </div>
  );
}
