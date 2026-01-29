import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, Headphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, PenLine, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import AuthPage from "./AuthPage";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

export default function ReadingPage() {
  // 1. 상태 및 설정 (DailyWordPage 스타일)
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { fontSize = 16 } = useDisplaySettings();

  // 성경 읽기 전용 상태
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [memo, setMemo] = useState("");
  const [isReadCompleted, setIsReadCompleted] = useState(false);

  // TTS 관련 상태 (DailyWordPage와 동일)
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');

  // [기능] 날짜 변경 및 데이터 로드 (DailyWordPage 로직 차용)
  useEffect(() => {
    checkAuth();
    fetchBibleContent();
  }, [currentDate, currentReadChapter]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const fetchBibleContent = async () => {
    setLoading(true);
    // 현재는 예시로 '창세기' 고정, 실제로는 목표 설정 데이터와 연동 가능
    const { data } = await supabase.from('bible_verses')
      .select('verse, content')
      .eq('book_name', '창세기')
      .eq('chapter', currentReadChapter)
      .order('verse', { ascending: true });
    
    if (data) setBibleContent(data);
    setLoading(false);
  };

  // [스와이프 로직] DailyWordPage와 동일하게 복구
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

  // [TTS 로직] DailyWordPage의 고성능 TTS 로직 그대로 유지
  const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
    if (selectedVoice) { setVoiceType(selectedVoice); return; }
    setShowAudioControl(true);
    setIsPlaying(true);
    // (상세 TTS 구현 생략 - DailyWordPage와 동일한 로직 사용 가능)
    alert("TTS 기능을 실행합니다.");
  };

  const cleanContent = (text: string) => text.replace(/\d+/g, "").trim();

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      
      {/* 1. 상단 날짜 영역 (DailyWordPage 디자인 복제) */}
      <header className="text-center mb-3 flex flex-col items-center relative">
        <p className="font-bold text-[#5D7BAF] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button onClick={() => dateInputRef.current?.showPicker()} className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#5D7BAF] active:scale-95 transition-transform">
            <CalendarIcon size={18} strokeWidth={2.5} />
          </button>
          <input type="date" ref={dateInputRef} onChange={(e) => setCurrentDate(new Date(e.target.value))} max={new Date().toISOString().split("T")[0]} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      {/* 2. 말씀 카드 및 스와이프 (DailyWordPage 디자인 복제) */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        <div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-50" />
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentDate.toISOString() + currentReadChapter}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col p-8 z-10 touch-none"
          >
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="h-full flex items-center justify-center animate-pulse text-zinc-200">말씀 로딩 중...</div>
              ) : (
                bibleContent.map((v, i) => (
                  <p key={i} className="text-zinc-800 leading-[1.7] break-keep font-medium mb-4" style={{ fontSize: `${fontSize}px` }}>
                    <span className="text-[0.7em] font-bold opacity-30 mr-2">{v.verse}</span>
                    {v.content}
                  </p>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
              <span className="font-bold text-[#5D7BAF] opacity-60" style={{ fontSize: `${fontSize * 0.9}px` }}>
                창세기 {currentReadChapter}장
              </span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentReadChapter(prev => Math.max(1, prev - 1))} className="p-2 text-zinc-300"><ChevronLeft size={20}/></button>
                <button onClick={() => setCurrentReadChapter(prev => prev + 1)} className="p-2 text-zinc-300"><ChevronRight size={20}/></button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 opacity-50" />
      </div>

      {/* 3. 도구상자 (DailyWordPage 디자인 복제) */}
      <div className="flex items-center gap-8 mt-3 mb-10"> 
        <button onClick={() => handlePlayTTS()} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button onClick={() => { navigator.clipboard.writeText("말씀 내용"); alert("복합되었습니다."); }} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      {/* 4. 하단 읽기 완료 & 묵상 기록 영역 */}
      <div className="w-full max-w-sm space-y-4 px-2">
        <div className="bg-gray-50 rounded-[28px] p-5 border border-gray-100 space-y-3 shadow-inner">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-[#5D7BAF] font-black"><PenLine size={18} /> 오늘의 묵상</div>
             <button 
               onClick={() => setIsReadCompleted(!isReadCompleted)}
               className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isReadCompleted ? 'bg-[#5D7BAF] text-white' : 'bg-white text-zinc-400 border border-zinc-200'}`}
             >
               {isReadCompleted ? "읽기 완료됨" : "읽음 표시"}
             </button>
           </div>
           <Textarea 
             placeholder="말씀을 통해 느낀 점을 기록해 보세요."
             className="bg-white border-none min-h-[100px] p-4 rounded-2xl shadow-sm text-sm" 
             value={memo} 
             onChange={(e) => setMemo(e.target.value)} 
           />
           <Button className="w-full bg-[#5D7BAF] h-12 rounded-xl font-black shadow-md">묵상 저장하기</Button>
        </div>
      </div>

      {/* TTS 제어 팝업 (DailyWordPage와 동일) */}
      <AnimatePresence>
        {showAudioControl && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-24 left-6 right-6 bg-[#5D7BAF] text-white p-5 rounded-[24px] shadow-2xl z-[100]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                    {isPlaying ? <Pause fill="white" size={14} /> : <Play fill="white" size={14} />}
                  </button>
                  <p className="text-[13px] font-bold">{isPlaying ? "성경을 읽어드리고 있습니다" : "일시 정지됨"}</p>
                </div>
                <button onClick={() => setShowAudioControl(false)}><X size={20}/></button>
              </div>
              <div className="flex gap-2">
                {['F', 'M'].map((v) => (
                  <button key={v} onClick={() => setVoiceType(v as 'F' | 'M')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === v ? 'bg-white text-[#5D7BAF]' : 'bg-white/10 text-white'}`}>
                    {v === 'F' ? '여성' : '남성'} 목소리
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
