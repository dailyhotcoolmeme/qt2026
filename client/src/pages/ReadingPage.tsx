import React, { useState, useEffect, useRef } from "react";
import { 
  Headphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Check, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null); 

  // [로직 변경] 첨부 파일의 상태 관리 변수들을 가져옵니다.
  const [bibleContent, setBibleContent] = useState<any[]>([]); [span_3](start_span)// 장 전체 말씀 저장[span_3](end_span)
  const [loading, setLoading] = useState(false); [span_4](start_span)// 로딩 상태[span_4](end_span)
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  
  // 현재 읽고 있는 장 상태 (기본값 1장)
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  // 예시를 위해 '창세기'로 고정 (나중에 목표 설정 로직과 연결 가능)
  const [currentBookName, setCurrentBookName] = useState("창세기");

  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { fontSize = 16 } = useDisplaySettings();

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

  [span_5](start_span)// [로직 변경] 첨부 파일의 fetchBible 방식을 그대로 적용[span_5](end_span)
  useEffect(() => {
    const fetchBible = async () => {
      setLoading(true);
      const { data, error } = await supabase
        [span_6](start_span).from('bible_verses') // 테이블명 변경[span_6](end_span)
        .select('verse, content')
        .eq('book_name', currentBookName)
        .eq('chapter', currentReadChapter)
        .order('verse', { ascending: true });
   
      if (data) {
        setBibleContent(data);
      }
      setLoading(false);
    };
    fetchBible();
    setIsReadCompleted(false); // 장이 바뀌면 완료 상태 초기화
  }, [currentReadChapter, currentBookName]);

  const cleanContent = (text: string) => {
    if (!text) return "";
    return text.replace(/[."'“”‘’]/g, "").trim();
  };

  // TTS 및 기타 핸들러는 기존 디자인 코드 유지 (생략 가능하나 기능 보존을 위해 유지)
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      <header className="text-center mb-3 flex flex-col items-center relative">
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
          <input type="date" ref={dateInputRef} onChange={handleDateChange} max={new Date().toISOString().split("T")[0]} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        {/* 디자인 유지: 고정 높이 450px */}
        <div className="absolute left-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${currentBookName}-${currentReadChapter}`}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center p-10 text-center z-10 touch-none"
          >
            [span_7](start_span){/* [데이터 바뀜] 카드 내부 말씀 리스트 출력 디자인[span_7](end_span) */}
            <div className="flex-1 w-full overflow-y-auto scrollbar-hide mb-4 text-left">
              {loading ? (
                <div className="flex items-center justify-center h-full animate-pulse text-zinc-200 font-black">말씀을 불러오는 중...</div>
              ) : (
                bibleContent.map((v, i) => (
                  <div key={i} className="flex gap-3 mb-4 last:mb-0">
                    <span className="font-bold opacity-30 text-[10px] pt-1 shrink-0">{v.verse}</span>
                    <p className="text-zinc-800 leading-[1.8] break-keep font-medium" style={{ fontSize: `${fontSize}px` }}>
                      {cleanContent(v.content)}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            <span className="font-bold text-[#4A6741] opacity-60 shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>
              {currentBookName} {currentReadChapter}장
            </span>
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      {/* 하단 툴바 디자인 그대로 유지 */}
      <div className="flex items-center gap-8 mt-3 mb-14"> 
        <button onClick={() => {}} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button onClick={() => { alert("복사되었습니다."); }} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      {/* 읽기 완료 및 장 이동 버튼 디자인 그대로 유지 */}
      <div className="flex items-center justify-center gap-6 pb-4">
        <button 
          onClick={() => setCurrentReadChapter(c => Math.max(1, c - 1))}
          className="text-zinc-300 hover:text-[#4A6741] transition-colors p-2"
        >
          <ChevronLeft size={32} strokeWidth={1.5} />
        </button>

        <motion.button 
          whileTap={{ scale: 0.9 }} onClick={() => setIsReadCompleted(!isReadCompleted)}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
            ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-[#4A6741] border border-green-50'}`}
        >
          <Check className={`w-6 h-6 mb-1 ${isReadCompleted ? 'text-white animate-pulse' : ''}`} strokeWidth={3} />
          <span className="font-black leading-tight" style={{ fontSize: `${fontSize * 0.85}px` }}>읽기<br/>완료</span>
        </motion.button>

        <button 
          onClick={() => setCurrentReadChapter(c => c + 1)}
          className="text-zinc-300 hover:text-[#4A6741] transition-colors p-2"
        >
          <ChevronRight size={32} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
