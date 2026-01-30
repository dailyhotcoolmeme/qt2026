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
  const { fontSize = 16 } = useDisplaySettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null); 

  // [로직] 데이터 상태
  const [bibleContent, setBibleContent] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false); 
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  
  // 초기값 설정 (DB에 반드시 존재하는 값으로 시작)
  const [currentBookName, setCurrentBookName] = useState("창세기");
  const [currentReadChapter, setCurrentReadChapter] = useState(1);

  // TTS 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // [핵심] 말씀 데이터를 가져오는 함수 (첨부 파일 기반 로직)
  const fetchBible = async (book: string, chapter: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bible_verses') 
        .select('verse, content')
        .eq('book_name', book)
        .eq('chapter', chapter)
        .order('verse', { ascending: true });
   
      if (error) throw error;
      setBibleContent(data || []);
    } catch (err) {
      console.error("데이터 로드 에러:", err);
      setBibleContent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBible(currentBookName, currentReadChapter);
    setIsReadCompleted(false);
  }, [currentReadChapter, currentBookName]);

  const cleanContent = (text: string) => {
    if (!text) return "";
    return text.replace(/^[.\s\d]+절?/, "").replace(/[."'“”‘’]/g, "").trim();
  };

  const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
    if (bibleContent.length === 0) return;
    if (selectedVoice) { setVoiceType(selectedVoice); return; }

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

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
        audioRef.current = ttsAudio;
        ttsAudio.onended = () => { setIsPlaying(false); setShowAudioControl(false); };
        setShowAudioControl(true);
        setIsPlaying(true);
        ttsAudio.play();
      }
    } catch (error) { console.error("TTS 에러:", error); setIsPlaying(false); }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] overflow-y-auto pt-24 pb-10 px-4">
      <header className="text-center mb-3 flex flex-col items-center">
        <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button onClick={() => dateInputRef.current?.showPicker()} className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741]">
            <CalendarIcon size={18} />
          </button>
          <input type="date" ref={dateInputRef} className="hidden" onChange={(e) => setCurrentDate(new Date(e.target.value))} />
        </div>
      </header>

      {/* 디자인 유지: 고정 높이 450px */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible min-h-[480px]">
        <div className="absolute left-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 shadow-sm" />
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${currentBookName}-${currentReadChapter}`}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center p-10 text-center z-10"
          >
            <div className="flex-1 w-full overflow-y-auto scrollbar-hide mb-4 text-left">
              {loading ? (
                <div className="flex items-center justify-center h-full text-zinc-300 font-bold">로딩 중...</div>
              ) : bibleContent.length > 0 ? (
                bibleContent.map((v, i) => (
                  <div key={i} className="flex gap-3 mb-4">
                    <span className="font-bold opacity-30 text-[10px] pt-1 shrink-0">{v.verse}</span>
                    <p className="text-zinc-800 leading-[1.8] font-medium" style={{ fontSize: `${fontSize}px` }}>
                      {cleanContent(v.content)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-300 italic">말씀 데이터가 없습니다.</div>
              )}
            </div>
            <span className="font-bold text-[#4A6741] opacity-60 shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>
              {currentBookName} {currentReadChapter}{currentBookName === "시편" ? "편" : "장"}
            </span>
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 shadow-sm" />
      </div>

      <div className="flex items-center gap-8 mt-6 mb-10"> 
        <button onClick={() => handlePlayTTS()} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} /><span className="text-[11px] font-bold">음성 재생</span>
        </button>
        <button onClick={() => { navigator.clipboard.writeText(bibleContent.map(v => v.content).join(' ')); alert("복사됨"); }} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} /><span className="text-[11px] font-bold">복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} /><span className="text-[11px] font-bold">기록함</span></button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Share2 size={22} /><span className="text-[11px] font-bold">공유</span></button>
      </div>

      <div className="flex items-center justify-center gap-6 pb-6">
        <button onClick={() => setCurrentReadChapter(c => Math.max(1, c - 1))} className="text-zinc-300 p-2">
          <ChevronLeft size={32} />
        </button>
        <motion.button 
          whileTap={{ scale: 0.9 }} onClick={() => setIsReadCompleted(!isReadCompleted)}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all
            ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-[#4A6741] border border-zinc-100'}`}
        >
          <Check className="w-6 h-6 mb-1" />
          <span className="font-black text-xs">읽기완료</span>
        </motion.button>
        <button onClick={() => setCurrentReadChapter(c => c + 1)} className="text-zinc-300 p-2">
          <ChevronRight size={32} />
        </button>
      </div>

      <AnimatePresence>
        {showAudioControl && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-6 right-6 bg-[#4A6741] text-white p-5 rounded-[24px] shadow-2xl z-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full">
                  {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
                </button>
                <p className="text-xs font-bold">{isPlaying ? "재생 중" : "일시 정지"}</p>
              </div>
              <button onClick={() => { audioRef.current?.pause(); setShowAudioControl(false); }}><X size={20} /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setVoiceType('F')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10'}`}>여성</button>
              <button onClick={() => setVoiceType('M')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10'}`}>남성</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
