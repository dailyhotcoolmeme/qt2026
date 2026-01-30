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

  [span_1](start_span)[span_2](start_span)// [첨부 파일 기반] 성경 데이터 및 로딩 상태 관리[span_1](end_span)[span_2](end_span)
  const [bibleContent, setBibleContent] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false); 
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  
  [span_3](start_span)// 현재 읽고 있는 권과 장 (첨부 파일의 goal 기반 로직 반영 가능)[span_3](end_span)
  const [currentBookName, setCurrentBookName] = useState("창세기");
  const [currentReadChapter, setCurrentReadChapter] = useState(1);

  // TTS 및 오디오 상태 유지
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

  [span_4](start_span)// [첨부 파일 로직] bible_verses 테이블에서 해당 장의 전체 구절 로드[span_4](end_span)
  useEffect(() => {
    const fetchBible = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('bible_verses') 
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
    setIsReadCompleted(false);
  }, [currentReadChapter, currentBookName]);

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

  const setupAudioEvents = (audio: HTMLAudioElement) => {
    audioRef.current = audio;
    audio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      audioRef.current = null;
    };
    setShowAudioControl(true);
    setIsPlaying(true);
    audio.play().catch(e => console.log("재생 오류:", e));
  };

  // [기능 보존] 시편/장/절 구분 및 맺음말 포함 TTS 로직
  const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
    if (bibleContent.length === 0) return;
    if (selectedVoice) {
      setVoiceType(selectedVoice);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const fullText = bibleContent.map(v => cleanContent(v.content)).join(". ");
    const unit = currentBookName === "시편" ? "편" : "장";
    const lastVerse = bibleContent[bibleContent.length - 1].verse;
    const textToSpeak = `${fullText}. ${currentBookName} ${currentReadChapter}${unit} 1절부터 ${lastVerse}절까지 말씀.`;

    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${import.meta.env.VITE_GOOGLE_TTS_API_KEY}`, {
        method: "POST",
        body: JSON.stringify({
          input: { text: textToSpeak },
          voice: { languageCode: "ko-KR", name: voiceType === 'F' ? "ko-KR-Neural2-B" : "ko-KR-Neural2-C" },
          audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
        }),
      });
      const resData = await response.json();
      if (resData.audioContent) {
        const ttsAudio = new Audio(`data:audio/mp3;base64,${resData.audioContent}`);
        setupAudioEvents(ttsAudio);
      }
    } catch (error) {
      console.error("TTS 에러:", error);
      setIsPlaying(false);
    }
  };

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

      {/* 디자인 유지: 고정 높이 h-[450px] 카드 */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        <div className="absolute left-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${currentBookName}-${currentReadChapter}`}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center p-10 text-center z-10 touch-none"
          >
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
              {currentBookName} {currentReadChapter}{currentBookName === "시편" ? "편" : "장"}
            </span>
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      {/* 하단 툴바 및 버튼 레이아웃 유지 */}
      <div className="flex items-center gap-8 mt-3 mb-14"> 
        <button onClick={() => handlePlayTTS()} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button onClick={() => { 
          const text = bibleContent.map(v => `${v.verse}절 ${v.content}`).join('\n');
          navigator.clipboard.writeText(text); 
          alert("복사되었습니다."); 
        }} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      <div className="flex items-center justify-center gap-6 pb-4">
        <button onClick={() => setCurrentReadChapter(c => Math.max(1, c - 1))} className="text-zinc-300 hover:text-[#4A6741] transition-colors p-2">
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

        <button onClick={() => setCurrentReadChapter(c => c + 1)} className="text-zinc-300 hover:text-[#4A6741] transition-colors p-2">
          <ChevronRight size={32} strokeWidth={1.5} />
        </button>
      </div>

      <AnimatePresence>
        {showAudioControl && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-24 left-6 right-6 bg-[#4A6741] text-white p-5 rounded-[24px] shadow-2xl z-[100]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                    {isPlaying ? <Pause fill="white" size={14} /> : <Play fill="white" size={14} />}
                  </button>
                  <p className="text-[13px] font-bold">{isPlaying ? "장 전체를 읽고 있습니다" : "일시 정지"}</p>
                </div>
                <button onClick={() => { if(audioRef.current) audioRef.current.pause(); setShowAudioControl(false); setIsPlaying(false); }}><X size={20}/></button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setVoiceType('F')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}>여성</button>
                <button onClick={() => setVoiceType('M')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}>남성</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
