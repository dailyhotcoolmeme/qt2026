import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, Headphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { fontSize = 16 } = useDisplaySettings();

  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  
  // 이동 모드 설정: 'date'(날짜-원본스와이프) vs 'chapter'(장-3D Flip)
  const [moveType, setMoveType] = useState<'date' | 'chapter'>('date');
  const [direction, setDirection] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');

  useEffect(() => {
    fetchBibleContent();
  }, [currentReadChapter, currentDate]);

  const fetchBibleContent = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('bible_verses')
        .select('verse, content')
        .eq('book_name', '창세기') 
        .eq('chapter', currentReadChapter)
        .order('verse', { ascending: true });
      if (data) setBibleContent(data);
    } catch (error) {
      console.error("Error fetching bible content:", error);
    } finally {
      setLoading(false);
      setIsReadCompleted(false);
    }
  };

  // [장 이동 함수] - 여기서 3D Flip 효과 활성화
  const paginateChapter = (dir: number) => {
    setMoveType('chapter'); // 3D 모드로 변경
    setDirection(dir);
    if (dir === 1) setCurrentReadChapter(prev => prev + 1);
    else setCurrentReadChapter(prev => Math.max(1, prev - 1));
  };

  // [날짜 이동 함수] - DailyWordPage 원본 구문 100% 동일
  const onDragEnd = (event: any, info: any) => {
    setMoveType('date'); // 스와이프 모드로 변경
    if (info.offset.x > 100) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
      setDirection(-1);
    } else if (info.offset.x < -100) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) {
        setCurrentDate(d);
        setDirection(1);
      } else {
        alert("오늘 이후의 말씀은 미리 볼 수 없습니다.");
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      <header className="text-center mb-3 flex flex-col items-center relative">
        <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>{currentDate.getFullYear()}</p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button onClick={() => dateInputRef.current?.showPicker()} className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741]"><CalendarIcon size={18} /></button>
          <input type="date" ref={dateInputRef} onChange={(e) => { setMoveType('date'); setCurrentDate(new Date(e.target.value)); }} max={today.toISOString().split("T")[0]} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible" style={{ perspective: "1200px" }}>
        <div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-40" />
        
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div 
            key={moveType === 'chapter' ? `c-${currentReadChapter}` : `d-${currentDate.toISOString()}`}
            custom={direction}
            // [핵심] moveType에 따라 3D 회전(rotateY) 또는 가로 이동(x) 결정
            initial={moveType === 'chapter' 
              ? { rotateY: direction > 0 ? 90 : -90, opacity: 0, transformPerspective: 1000 } 
              : { x: direction > 0 ? 300 : -300, opacity: 0 }}
            
            animate={moveType === 'chapter' 
              ? { rotateY: 0, opacity: 1 } 
              : { x: 0, opacity: 1 }}
            
            exit={moveType === 'chapter' 
              ? { rotateY: direction > 0 ? -90 : 90, opacity: 0, transformPerspective: 1000 } 
              : { x: direction > 0 ? -300 : 300, opacity: 0 }}
            
            // transition을 넣지 않아 DailyWordPage 고유의 쫀득한 스프링감 유지
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col p-10 z-10 touch-none origin-center cursor-grab active:cursor-grabbing"
          >
            <div className="flex-1 overflow-y-auto pr-1 text-center scrollbar-hide">
              {loading ? <div className="h-full flex items-center justify-center animate-pulse text-zinc-200 font-bold">로딩 중...</div> :
                bibleContent.map((v, i) => <p key={i} className="text-zinc-800 leading-[1.8] break-keep font-medium mb-5" style={{ fontSize: `${fontSize}px` }}>{v.content}</p>)
              }
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 text-center">
              <span className="font-bold text-[#4A6741] opacity-60 uppercase tracking-widest" style={{ fontSize: `${fontSize * 0.9}px` }}>창세기 {currentReadChapter}장</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-40" />
      </div>

      <div className="flex items-center gap-7 pb-10">
        <button onClick={() => paginateChapter(-1)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md text-zinc-300 border border-zinc-50"><ChevronLeft size={28} /></button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsReadCompleted(!isReadCompleted)} className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-[#4A6741] border border-green-50'}`}>
          <Heart className={`w-5 h-5 mb-1 ${isReadCompleted ? 'fill-white animate-bounce' : ''}`} strokeWidth={isReadCompleted ? 0 : 2} />
          <span className="font-black text-sm">완료</span>
        </motion.button>
        <button onClick={() => paginateChapter(1)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md text-zinc-300 border border-zinc-50"><ChevronRight size={28} /></button>
      </div>
    </div>
  );
}
