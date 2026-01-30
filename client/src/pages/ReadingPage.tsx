import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, Headphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Check, Calendar as CalendarIcon 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null); 

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
  const [bibleData, setBibleData] = useState<any>(null);
  const [isReadCompleted, setIsReadCompleted] = useState(false); // 읽기 완료 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { fontSize = 16 } = useDisplaySettings();

  useEffect(() => {
    if (showAudioControl) {
      handlePlayTTS();
    }
  }, [voiceType]);

  useEffect(() => {
    fetchVerse();
  }, [currentDate]);
  
  const fetchVerse = async () => {
    const formattedDate = currentDate.toISOString().split('T')[0];
    const { data: verse } = await supabase
      .from('daily_bible_verses')
      .select('*')
      .eq('display_date', formattedDate)
      .maybeSingle();
    
    if (verse) {
      const { data: book } = await supabase
        .from('bible_books')
        .select('book_order')
        .eq('book_name', verse.bible_name)
        .maybeSingle();

      setBibleData({ ...verse, bible_books: book });
      setIsReadCompleted(false); // 날짜 바뀌면 초기화
    }
  };

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

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  const setupAudioEvents = (audio: HTMLAudioElement, startTime: number) => {
    audioRef.current = audio;
    audio.currentTime = startTime;
    audio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      audioRef.current = null;
    };
    setShowAudioControl(true);
    setIsPlaying(true);
    audio.play().catch(e => console.log("재생 시작 오류:", e));
  };

  const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
    if (!bibleData) return;
    if (selectedVoice) {
      setVoiceType(selectedVoice);
      return;
    }
    const targetVoice = voiceType;
    const currentSrc = audioRef.current?.src || "";
    const isSameDate = currentSrc.includes(`daily_b${bibleData.bible_books?.book_order}_c${bibleData.chapter}`);
    const lastTime = isSameDate ? (audioRef.current?.currentTime || 0) : 0;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; 
      audioRef.current.load();
      audioRef.current = null;
    }

    const bookOrder = bibleData.bible_books?.book_order || '0';
    const fileName = `daily_b${bookOrder}_c${bibleData.chapter}_v${String(bibleData.verse).replace(/:/g, '_')}_${targetVoice}.mp3`;
    const storagePath = `daily/${fileName}`;
    const { data: { publicUrl } } = supabase.storage.from('bible-assets').getPublicUrl(storagePath);

    try {
      const checkRes = await fetch(publicUrl, { method: 'HEAD' });
      if (checkRes.ok) {
        const savedAudio = new Audio(publicUrl);
        setupAudioEvents(savedAudio, lastTime);
        return;
      }
      const mainContent = cleanContent(bibleData.content);
      const unit = bibleData.bible_name === "시편" ? "편" : "장";
      const textToSpeak = `${mainContent}. ${bibleData.bible_name} ${bibleData.chapter}${unit} ${bibleData.verse}절 말씀.`;
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
        const ttsAudio = new Audio(`data:audio/mp3;base64,${resData.audioContent}`);
        setupAudioEvents(ttsAudio, lastTime);
        const binary = atob(resData.audioContent);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        const blob = new Blob([array], { type: 'audio/mp3' });
        supabase.storage.from('bible-assets').upload(storagePath, blob, { contentType: 'audio/mp3', upsert: true });
      }
    } catch (error) {
      console.error("TTS 에러:", error);
      setIsPlaying(false);
    }
  };

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
        <div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentDate.toISOString()}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
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
            ) : <div className="animate-pulse text-zinc-200">말씀을 불러오는 중...</div>}
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      <div className="flex items-center gap-8 mt-3 mb-14"> 
        <button onClick={() => handlePlayTTS()} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button onClick={() => { if(bibleData) { navigator.clipboard.writeText(cleanContent(bibleData.content)); alert("복사되었습니다."); } }} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      {/* 아멘 버튼과 동일한 크기와 색상의 '읽기 완료' 버튼 추가 */}
      <div className="flex flex-col items-center gap-3 pb-4">
        <motion.button 
          whileTap={{ scale: 0.9 }} onClick={() => setIsReadCompleted(!isReadCompleted)}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
            ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-[#4A6741] border border-green-50'}`}
        >
          <Check className={`w-6 h-6 mb-1 ${isReadCompleted ? 'text-white animate-pulse' : ''}`} strokeWidth={3} />
          <span className="font-black leading-tight" style={{ fontSize: `${fontSize * 0.85}px` }}>읽기<br/>완료</span>
        </motion.button>
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
                  <p className="text-[13px] font-bold">{isPlaying ? "말씀을 음성으로 읽고 있습니다" : "일시 정지 상태입니다."}</p>
                </div>
                <button onClick={() => { if(audioRef.current) audioRef.current.pause(); setShowAudioControl(false); setIsPlaying(false); }}><X size={20}/></button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setVoiceType('F')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}>여성 목소리</button>
                <button onClick={() => setVoiceType('M')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}>남성 목소리</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
