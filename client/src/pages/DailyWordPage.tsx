import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, Headphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Calendar as CalendarIcon 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function DailyWordPage() {
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
  const [hasAmened, setHasAmened] = useState(false);
  const [amenCount, setAmenCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { fontSize = 16 } = useDisplaySettings();

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
      setBibleData(verse);
      setAmenCount(verse.amen_count || 0);
      setHasAmened(false);
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

  const handleAmenClick = async () => {
    if (hasAmened || !bibleData) return;
    setHasAmened(true);
    setAmenCount(prev => prev + 1);
    await supabase.from('daily_bible_verses').update({ amen_count: amenCount + 1 }).eq('id', bibleData.id);
  };

  // 1. 일시정지/재생 제어 함수 (이게 없으면 화면이 하얗게 변할 수 있습니다)
const togglePlay = () => {
  if (!audioRef.current) return;
  if (isPlaying) {
    audioRef.current.pause();
  } else {
    audioRef.current.play();
  }
  setIsPlaying(!isPlaying);
};

// 2. TTS 실행 함수 (맺음말 추가 및 목소리 즉시 반영)
const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
  if (!bibleData) return;
  
  // 1. 이어듣기: 현재 재생 위치 저장
  const lastTime = audioRef.current ? audioRef.current.currentTime : 0;

  // 2. 목소리 결정: 인자가 있으면 우선, 없으면 현재 상태(기본값 'F')
  const targetVoice = selectedVoice || voiceType;

  // 3. 기존 오디오 완전 정지 및 초기화
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current = null;
  }

  const mainContent = cleanContent(bibleData.content);
  const bibleSource = `${bibleData.bible_name} ${bibleData.chapter}${bibleData.bible_name === '시편' ? '편' : '장'} ${bibleData.verse}절 말씀`;
  const textToSpeak = `${mainContent}. ${bibleSource}`;

  const apiKey = import.meta.env.VITE_GOOGLE_TTS_API_KEY; 
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  // 팝업을 먼저 띄우고 재생 상태로 변경
  setShowAudioControl(true);
  setIsPlaying(true);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        input: { text: textToSpeak },
        voice: { 
          languageCode: "ko-KR", 
          // ⚠️ 중요: targetVoice를 기준으로 성별을 확실히 매칭 (B:여성, C:남성)
          name: targetVoice === 'F' ? "ko-KR-Chirp3-HD-Despina" : "ko-KR-Chirp3-HD-Zubenelgenubi" 
        },
        audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
      }),
    });

    const data = await response.json();
    if (data.audioContent) {
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      
      // 이어듣기 적용
      audio.currentTime = lastTime;
      audioRef.current = audio;
      
      // 끝났을 때의 처리 (QTPage와 동일)
      audio.onended = () => {
        setIsPlaying(false);
        setShowAudioControl(false); // 재생 완료 시에만 닫힘
        audioRef.current = null;
      };

      audio.play();
    }
  } catch (error) {
    console.error("TTS 에러:", error);
    setIsPlaying(false);
    setShowAudioControl(false);
  }
};

  // 날려먹었던 스와이프 로직 복구
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

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      
      {/* 1. 날짜 영역 전체를 아래 내용으로 싹 지우고 덮어쓰세요 */}
<header className="text-center mb-3 flex flex-col items-center relative">
  <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
    {currentDate.getFullYear()}
  </p>
  
  <div className="flex items-center gap-2">
    <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.25}px` }}>
      {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
    </h2>
    
    {/* 달력 버튼 */}
    <button 
      onClick={() => dateInputRef.current?.showPicker()} 
      className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform"
    >
      <CalendarIcon size={18} strokeWidth={2.5} />
    </button>

    {/* 숨겨진 날짜 입력 input */}
    <input 
      type="date"
      ref={dateInputRef}
      onChange={handleDateChange}
      max={new Date().toISOString().split("T")[0]} 
      className="absolute opacity-0 pointer-events-none"
    />
  </div>
</header>

      {/* 2. 말씀 카드 (양옆 힌트 카드 디자인 복구) */}
<div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
  
  {/* 왼쪽 힌트 카드 (어제) */}
<div className="absolute left-[-75%] w-[80%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
  
  <AnimatePresence mode="wait">
    <motion.div 
      key={currentDate.toISOString()}
      drag="x" 
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2} // 드래그 시 탄성 추가
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      // 중앙 카드가 양옆을 너무 가리지 않게 너비를 w-[82%]로 살짝 줄임
      className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center justify-center p-10 text-center z-10 touch-none cursor-grab active:cursor-grabbing"
    >
      {bibleData ? (
        <>
          <p className="text-zinc-800 leading-[1.7] break-keep font-medium mb-6" style={{ fontSize: `${fontSize}px` }}>
            {cleanContent(bibleData.content)}
          </p>
          <span className="font-medium text-[#4A6741] opacity-40" style={{ fontSize: `${fontSize * 0.9}px` }}>
            {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse}절
          </span>
        </>
      ) : <div className="animate-pulse text-zinc-200">말씀을 불러오는 중...</div>}
    </motion.div>
  </AnimatePresence>

  {/* 오른쪽 힌트 카드 (내일) */}
<div className="absolute right-[-75%] w-[80%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
</div>

      {/* 3. 툴바 (카드와 좁게, 아래와 넓게) */}
      <div className="flex items-center gap-7 mt-3 mb-14"> 
        <button onClick={handlePlayTTS} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button onClick={() => { navigator.clipboard.writeText(cleanContent(bibleData.content)); alert("복사되었습니다."); }} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      {/* 4. 아멘 버튼 (동그란 원형 복구) */}
      <div className="flex flex-col items-center gap-3 pb-4">
        <motion.button 
          whileTap={{ scale: 0.9 }} onClick={handleAmenClick}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
            ${hasAmened ? 'bg-[#4A6741] text-white' : 'bg-white text-[#4A6741] border border-green-50'}`}
        >
          <Heart className={`w-5 h-5 mb-1 ${hasAmened ? 'fill-white animate-bounce' : ''}`} strokeWidth={hasAmened ? 0 : 2} />
          <span className="font-black" style={{ fontSize: `${fontSize * 0.9}px` }}>아멘</span>
          <span className="font-bold opacity-70" style={{ fontSize: `${fontSize * 0.9}px` }}>{amenCount.toLocaleString()}</span>
        </motion.button>
        <p className="text-zinc-300 font-medium" style={{ fontSize: `${fontSize * 0.7}px` }}>아멘으로 화답해주세요</p>
      </div>

      {/* 5. TTS 제어 팝업 부분 */}
<AnimatePresence>
  {showAudioControl && (
    <motion.div 
      initial={{ y: 80, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      exit={{ y: 80, opacity: 0 }} 
      className="fixed bottom-24 left-6 right-6 bg-[#4A6741] text-white p-5 rounded-[24px] shadow-2xl z-[100]"
    >
      <div className="flex flex-col gap-4">
        {/* 상단 컨트롤 영역 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={togglePlay} 
              className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              {isPlaying ? <Pause fill="white" size={14} /> : <Play fill="white" size={14} />}
            </button>
            <p className="text-[13px] font-bold">
              {isPlaying ? "말씀을 음성으로 읽고 있습니다" : "일시 정지 상태입니다."}
            </p>
          </div>
          <button onClick={() => { 
            if(audioRef.current) audioRef.current.pause(); 
            setShowAudioControl(false); 
            setIsPlaying(false); 
          }}>
            <X size={20}/>
          </button>
        </div>
        
        {/* 목소리 선택 영역 (박스 디자인 수정) */}
        <div className="flex gap-2">
          <button 
            onClick={() => { setVoiceType('F'); handlePlayTTS('F'); }} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}
          >
            여성 목소리
          </button>
          <button 
            onClick={() => { setVoiceType('M'); handlePlayTTS('M'); }} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}
          >
            남성 목소리
          </button>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
    </div>
  );
}