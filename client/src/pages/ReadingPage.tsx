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
  const dateInputRef = useRef<HTMLInputElement>(null); 

  const [bibleContent, setBibleContent] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false); 
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [currentBookName, setCurrentBookName] = useState("창세기");
  const [currentReadChapter, setCurrentReadChapter] = useState(1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    } catch (err) { setBibleContent([]); }
    finally { setLoading(false); }
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
    
    const targetVoice = selectedVoice || voiceType;
    if (selectedVoice) setVoiceType(selectedVoice);

    // [수정] 실제 버킷 'bible-assets' 및 새 폴더 'reading' 경로 적용
    const fileName = `reading_${currentBookName}_${currentReadChapter}_${targetVoice}.mp3`;
    const storagePath = `reading/${fileName}`;

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    try {
      // 1. bible-assets 버킷에서 기존 파일 확인
      const { data: fileUrl } = supabase.storage.from('bible-assets').getPublicUrl(storagePath);
      const checkRes = await fetch(fileUrl.publicUrl, { method: 'HEAD' });

      if (checkRes.ok) {
        const audio = new Audio(fileUrl.publicUrl);
        audioRef.current = audio;
        audio.onended = () => { setIsPlaying(false); setShowAudioControl(false); };
        setShowAudioControl(true); setIsPlaying(true);
        audio.play();
      } else {
        // 2. 없으면 Google TTS 생성
        const fullText = bibleContent.map(v => cleanContent(v.content)).join(". ");
        const textToSpeak = `${fullText}. ${currentBookName} ${currentReadChapter}장 말씀.`;
        
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${import.meta.env.VITE_GOOGLE_TTS_API_KEY}`, {
          method: "POST",
          body: JSON.stringify({
            input: { text: textToSpeak },
            voice: { languageCode: "ko-KR", name: targetVoice === 'F' ? "ko-KR-Neural2-B" : "ko-KR-Neural2-C" },
            audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
          }),
        });
        const resData = await response.json();
        
        if (resData.audioContent) {
          const base64Audio = resData.audioContent;
          const audioBlob = await (await fetch(`data:audio/mp3;base64,${base64Audio}`)).blob();
          
          // 3. bible-assets/reading/ 경로로 업로드 (캐싱)
          await supabase.storage.from('bible-assets').upload(storagePath, audioBlob, { 
            contentType: 'audio/mp3',
            upsert: true 
          });
          
          const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
          audioRef.current = audio;
          audio.onended = () => { setIsPlaying(false); setShowAudioControl(false); };
          setShowAudioControl(true); setIsPlaying(true);
          audio.play();
        }
      }
    } catch (error) { 
      console.error("TTS Error:", error);
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
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] overflow-y-auto pt-24 pb-4 px-4">
      <header className="text-center mb-3 flex flex-col items-center">
        <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button onClick={() => dateInputRef.current?.showPicker()} className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741]">
            <CalendarIcon size={18} strokeWidth={2.5} />
          </button>
          <input type="date" ref={dateInputRef} className="hidden" onChange={(e) => setCurrentDate(new Date(e.target.value))} />
        </div>
      </header>

      {/* 카드 높이 480px 복구 및 불필요한 py-4 제거로 간격 최적화 */}
      <div className="relative w-full flex items-center justify-center overflow-visible">
        <div className="absolute left-[-75%] w-[82%] max-w-sm h-[480px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 shadow-sm" />
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${currentBookName}-${currentReadChapter}`}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-[82%] max-w-sm h-[480px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center p-10 text-center z-10"
          >
            <div className="flex-1 w-full overflow-y-auto scrollbar-hide mb-4 text-left">
              {loading ? <div className="flex items-center justify-center h-full">로딩 중...</div> :
                bibleContent.map((v, i) => (
                  <div key={i} className="flex gap-3 mb-4">
                    <span className="font-bold opacity-30 text-[10px] pt-1 shrink-0">{v.verse}</span>
                    <p className="text-zinc-800 leading-[1.8] font-medium" style={{ fontSize: `${fontSize}px` }}>{cleanContent(v.content)}</p>
                  </div>
                ))}
            </div>
            <span className="font-bold text-[#4A6741] opacity-60 shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>{currentBookName} {currentReadChapter}장</span>
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm h-[480px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0 shadow-sm" />
      </div>

      {/* 카드와 도구함 사이 mt-6으로 간격 밀착 */}
      <div className="flex items-center gap-8 mt-6 mb-8"> 
        <button onClick={() => handlePlayTTS()} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button onClick={() => { navigator.clipboard.writeText(bibleContent.map(v => v.content).join(' ')); alert("복사되었습니다."); }} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      {/* pb-4로 바닥 여백을 아멘 버튼과 동일하게 고정 */}
      <div className="flex items-center justify-center gap-6 pb-4">
        <button onClick={() => setCurrentReadChapter(c => Math.max(1, c - 1))} className="text-zinc-300 p-2"><ChevronLeft size={32} strokeWidth={1.5} /></button>
        <motion.button 
          whileTap={{ scale: 0.9 }} onClick={() => setIsReadCompleted(!isReadCompleted)}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl
            ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-[#4A6741] border border-zinc-100'}`}
        >
          <Check className="w-6 h-6 mb-1" strokeWidth={3} />
          <span className="font-black text-xs leading-tight">읽기<br/>완료</span>
        </motion.button>
        <button onClick={() => setCurrentReadChapter(c => c + 1)} className="text-zinc-300 p-2"><ChevronRight size={32} strokeWidth={1.5} /></button>
      </div>

      <AnimatePresence>
        {showAudioControl && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-6 right-6 bg-[#4A6741] text-white p-5 rounded-[24px] shadow-2xl z-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full">
                  {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
                </button>
                <p className="text-[13px] font-bold">{isPlaying ? "말씀을 음성으로 읽고 있습니다" : "일시 정지 상태입니다."}</p>
              </div>
              <button onClick={() => { audioRef.current?.pause(); setShowAudioControl(false); }}><X size={20} /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePlayTTS('F')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white'}`}>여성 목소리</button>
              <button onClick={() => handlePlayTTS('M')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white'}`}>남성 목소리</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
