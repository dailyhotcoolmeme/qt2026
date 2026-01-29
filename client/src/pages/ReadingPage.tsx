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
  // 1. 상태 설정 및 초기화
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { fontSize = 16 } = useDisplaySettings();

  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);

  [span_0](start_span)// TTS 관련 상태 (DailyWordPage 스타일)[span_0](end_span)
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');

  [span_1](start_span)[span_2](start_span)// 데이터 로드 이펙트[span_1](end_span)[span_2](end_span)
  useEffect(() => {
    fetchBibleContent();
  }, [currentDate, currentReadChapter]);

  const fetchBibleContent = async () => {
    setLoading(true);
    [span_3](start_span)// 예시 데이터: 실제 운영 시에는 선택된 권(book) 정보를 활용[span_3](end_span)
    const { data } = await supabase.from('bible_verses')
      .select('verse, content')
      .eq('book_name', '창세기')
      .eq('chapter', currentReadChapter)
      .order('verse', { ascending: true });
    
    if (data) setBibleContent(data);
    setLoading(false);
    setIsReadCompleted(false); // 장이 바뀌면 완료 상태 초기화
  };

  [span_4](start_span)// 스와이프 로직[span_4](end_span)
  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (info.offset.x < -100) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) setCurrentDate(d);
    }
  };

  const handlePlayTTS = () => {
    setShowAudioControl(true);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      
      [span_5](start_span){/* 1. 상단 날짜 영역 (#4A6741 적용)[span_5](end_span) */}
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
            onChange={(e) => setCurrentDate(new Date(e.target.value))} 
            max={today.toISOString().split("T")[0]} 
            className="absolute opacity-0 pointer-events-none" 
          />
        </div>
      </header>

      [span_6](start_span){/* 2. 말씀 카드 (디자인 복제 및 중앙 정렬)[span_6](end_span) */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        <div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-50" />
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentDate.toISOString() + currentReadChapter}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col p-10 z-10 touch-none"
          >
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar text-center">
              {loading ? (
                <div className="h-full flex items-center justify-center animate-pulse text-zinc-200">말씀을 불러오는 중...</div>
              ) : (
                bibleContent.map((v, i) => (
                  <p key={i} className="text-zinc-800 leading-[1.8] break-keep font-medium mb-5" style={{ fontSize: `${fontSize}px` }}>
                    {v.content}
                  </p>
                ))
              )}
            </div>
            {/* 하단 성경 구절 정보 중앙 정렬 */}
            <div className="mt-4 pt-4 border-t border-gray-50 text-center">
              <span className="font-bold text-[#4A6741] opacity-60" style={{ fontSize: `${fontSize * 0.9}px` }}>
                창세기 {currentReadChapter}장
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-50" />
      </div>

      [span_7](start_span){/* 3. 툴바 (동일한 디자인)[span_7](end_span) */}
      <div className="flex items-center gap-8 mt-3 mb-12"> 
        <button onClick={handlePlayTTS} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      [span_8](start_span){/* 4. 하단 원형 완료 버튼 및 이동 컨트롤[span_8](end_span) */}
      <div className="flex items-center gap-6 pb-8">
        {/* 이전장 버튼 */}
        <button 
          onClick={() => setCurrentReadChapter(prev => Math.max(1, prev - 1))}
          className="p-3 rounded-full bg-white shadow-md text-zinc-300 active:scale-90 transition-transform"
        >
          <ChevronLeft size={28} />
        </button>

        {/* 읽기 완료 (아멘 버튼 스타일) */}
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={() => setIsReadCompleted(!isReadCompleted)}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
            ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-[#4A6741] border border-green-50'}`}
        >
          <Heart className={`w-5 h-5 mb-1 ${isReadCompleted ? 'fill-white animate-bounce' : ''}`} strokeWidth={isReadCompleted ? 0 : 2} />
          <span className="font-black" style={{ fontSize: `${fontSize * 0.9}px` }}>완료</span>
          <span className="font-bold opacity-70" style={{ fontSize: `${fontSize * 0.7}px` }}>READ</span>
        </motion.button>

        {/* 다음장 버튼 */}
        <button 
          onClick={() => setCurrentReadChapter(prev => prev + 1)}
          className="p-3 rounded-full bg-white shadow-md text-zinc-300 active:scale-90 transition-transform"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      [span_9](start_span){/* TTS 제어 팝업 (#4A6741 적용)[span_9](end_span) */}
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
                <button onClick={() => setVoiceType('F')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10'}`}>여성 목소리</button>
                <button onClick={() => setVoiceType('M')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10'}`}>남성 목소리</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
