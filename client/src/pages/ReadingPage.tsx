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
  // [상태 관리]
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { fontSize = 16 } = useDisplaySettings();

  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  
  // 애니메이션 제어용 상태 (0: 효과 없음, 1: 다음, -1: 이전)
  const [direction, setDirection] = useState(0);

  // TTS 관련 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');

  // [데이터 로드]
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

  // [장 이동 함수 - 버튼 클릭 시에만 3D 효과를 위한 direction 설정]
  const paginateChapter = (newDirection: number) => {
    setDirection(newDirection); // 3D 효과 발생
    if (newDirection === 1) {
      setCurrentReadChapter(prev => prev + 1);
    } else {
      setCurrentReadChapter(prev => Math.max(1, prev - 1));
    }
  };

  // [날짜 이동 스와이프 - DailyWordPage 원본 로직 100% 동일]
  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) { // 이전 날짜
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (info.offset.x < -100) { // 다음 날짜
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) setCurrentDate(d);
    }
  };

  // [3D Flip 애니메이션 Variants]
  const pageFlipVariants = {
    initial: (dir: number) => ({
      rotateY: dir > 0 ? 90 : dir < 0 ? -90 : 0,
      opacity: dir !== 0 ? 0 : 1,
      transformPerspective: 1000,
    }),
    animate: {
      rotateY: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -90 : dir < 0 ? 90 : 0,
      opacity: dir !== 0 ? 0 : 1,
      transformPerspective: 1000,
      transition: { duration: 0.6, ease: "easeIn" }
    })
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      
      {/* 1. 상단 날짜 영역 */}
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
            type="date" ref={dateInputRef} 
            onChange={(e) => { setDirection(0); setCurrentDate(new Date(e.target.value)); }} 
            max={today.toISOString().split("T")[0]} 
            className="absolute opacity-0 pointer-events-none" 
          />
        </div>
      </header>

      {/* 2. 말씀 카드 (스와이프 시에는 날짜 이동 / 버튼 클릭 시에는 3D 효과) */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible" style={{ perspective: "1200px" }}>
        {/* 양옆 배경 힌트 카드 */}
        <div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-40" />
        
        <AnimatePresence mode="wait" custom={direction} onExitComplete={() => setDirection(0)}>
          <motion.div 
            key={currentDate.toISOString() + currentReadChapter}
            custom={direction}
            variants={pageFlipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag="x" 
            dragConstraints={{ left: 0, right: 0 }} 
            dragElastic={0.2} 
            onDragEnd={onDragEnd}
            className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col p-10 z-10 touch-none origin-center cursor-grab active:cursor-grabbing"
          >
            <div className="flex-1 overflow-y-auto pr-1 text-center scrollbar-hide">
              {loading ? (
                <div className="h-full flex items-center justify-center animate-pulse text-zinc-200 font-bold">말씀을 읽어오는 중...</div>
              ) : (
                bibleContent.map((v, i) => (
                  <p key={i} className="text-zinc-800 leading-[1.8] break-keep font-medium mb-5" style={{ fontSize: `${fontSize}px` }}>
                    {v.content}
                  </p>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 text-center">
              <span className="font-bold text-[#4A6741] opacity-60 uppercase tracking-widest" style={{ fontSize: `${fontSize * 0.9}px` }}>
                창세기 {currentReadChapter}장
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-40" />
      </div>

      {/* 3. 도구 상자 */}
      <div className="flex items-center gap-8 mt-3 mb-12"> 
        <button onClick={() => setShowAudioControl(true)} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} /><span className="font-medium text-[11px]">음성 재생</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium text-[11px]">복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Bookmark size={22} strokeWidth={1.5} /><span className="font-medium text-[11px]">기록함</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Share2 size={22} strokeWidth={1.5} /><span className="font-medium text-[11px]">공유</span>
        </button>
      </div>

      {/* 4. 하단 원형 버튼 및 장 이동 제어 */}
      <div className="flex items-center gap-7 pb-10">
        <button 
          onClick={() => paginateChapter(-1)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md text-zinc-300 active:scale-90 border border-zinc-50"
        >
          <ChevronLeft size={28} />
        </button>

        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={() => setIsReadCompleted(!isReadCompleted)}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
            ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-[#4A6741] border border-green-50'}`}
        >
          <Heart className={`w-5 h-5 mb-1 ${isReadCompleted ? 'fill-white animate-bounce' : ''}`} strokeWidth={isReadCompleted ? 0 : 2} />
          <span className="font-black text-sm">완료</span>
          <span className="font-bold opacity-60 text-[10px]">READ</span>
        </motion.button>

        <button 
          onClick={() => paginateChapter(1)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md text-zinc-300 active:scale-90 border border-zinc-50"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* 5. TTS 제어 (DailyWordPage 스타일) */}
      <AnimatePresence>
        {showAudioControl && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-24 left-6 right-6 bg-[#4A6741] text-white p-5 rounded-[24px] shadow-2xl z-[100]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full">
                    {isPlaying ? <Pause fill="white" size={14} /> : <Play fill="white" size={14} />}
                  </button>
                  <p className="text-[13px] font-bold">성경을 읽어드리고 있습니다</p>
                </div>
                <button onClick={() => setShowAudioControl(false)}><X size={20}/></button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setVoiceType('F')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10'}`}>여성</button>
                <button onClick={() => setVoiceType('M')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10'}`}>남성</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
