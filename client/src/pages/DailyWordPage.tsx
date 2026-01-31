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
  const [showCopyToast, setShowCopyToast] = useState(false); // 토스트 표시 여부
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { fontSize = 16 } = useDisplaySettings();
 // 1. 성별(voiceType)이 바뀔 때 실행되는 감시자
  useEffect(() => {
    // 오디오 컨트롤러가 켜져 있을 때만 성별 변경을 반영하여 다시 재생함
    if (showAudioControl) {
      handlePlayTTS();
    }
  }, [voiceType]);

  useEffect(() => {
    fetchVerse();
  }, [currentDate]);
  
  const fetchVerse = async () => {
  const formattedDate = currentDate.toISOString().split('T')[0];
  
  // 1. 오늘의 말씀 가져오기
  const { data: verse } = await supabase
    .from('daily_bible_verses')
    .select('*')
    .eq('display_date', formattedDate)
    .maybeSingle();
  
  if (verse) {
    // 2. 중요: bible_books 테이블에서 해당 성경의 순서(book_order)를 가져옴
    const { data: book } = await supabase
      .from('bible_books')
      .select('book_order')
      .eq('book_name', verse.bible_name) // bible_name으로 매칭
      .maybeSingle();

    // 3. bible_books 데이터를 포함해서 상태 업데이트
    setBibleData({ ...verse, bible_books: book });
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
    // 햅틱 반응 추가 (Success 패턴: 툭, 툭 두 번 혹은 짧게 한 번)
  if (window.navigator && window.navigator.vibrate) {
    // 30ms 동안 아주 짧게 진동 (iOS는 브라우저 정책에 따라 제한적일 수 있음)
    window.navigator.vibrate(30); 
  }
    setHasAmened(true);
    setAmenCount(prev => prev + 1);
    await supabase.from('daily_bible_verses').update({ amen_count: amenCount + 1 }).eq('id', bibleData.id);
  };

  const handleCopy = () => {
  if (bibleData) {
    // 실제 복사 로직
    navigator.clipboard.writeText(cleanContent(bibleData.content));
    
    // 토스트 켜고 2초 뒤 끄기
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
    
    // 햅틱 반응 (선택)
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
  }
};

// 1. 재생/일시정지 토글
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  // 2. 오디오 이벤트 설정 (원래 빠른 속도의 핵심)
  const setupAudioEvents = (audio: HTMLAudioElement, startTime: number) => {
    audioRef.current = audio;
    audio.currentTime = startTime; // 이어듣기 적용

    audio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      audioRef.current = null;
    };

    setShowAudioControl(true);
    setIsPlaying(true);
    audio.play().catch(e => console.log("재생 시작 오류:", e));
  };

  // 3. TTS 실행 함수 (스토리지 저장 로직 복구 및 괄호 교정 완료)
  const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
    if (!bibleData) return;
    // 햅틱 반응 추가
  if (window.navigator?.vibrate) window.navigator.vibrate(20);

    // 1. 목소리 변경 시 상태 업데이트 후 종료 (useEffect가 바통을 이어받음)
    if (selectedVoice) {
      setVoiceType(selectedVoice);
      return;
    }

    const targetVoice = voiceType;
    // 현재 재생 중인 파일이 오늘 날짜의 말씀인지 아주 확실하게 체크
    const currentSrc = audioRef.current?.src || "";
    const isSameDate = currentSrc.includes(`daily_b${bibleData.bible_books?.book_order}_c${bibleData.chapter}`);
    
    // 같은 날짜면 이어듣고(lastTime 유지), 날짜가 바뀌었으면 처음부터(0)
    const lastTime = isSameDate ? (audioRef.current?.currentTime || 0) : 0;

    setShowAudioControl(true);


    // 2. [핵심] 기존 오디오 완전 파괴 및 괄호 정리
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
      // 서버 캐시 확인
      const checkRes = await fetch(publicUrl, { method: 'HEAD' });

      if (checkRes.ok) {
        const savedAudio = new Audio(publicUrl);
        setupAudioEvents(savedAudio, lastTime);
        return;
      }

      // 서버에 없을 때 구글 TTS 호출
      const mainContent = cleanContent(bibleData.content);
      const unit = bibleData.bible_name === "시편" ? "편" : "장";
      const textToSpeak = `${mainContent}. ${bibleData.bible_name} ${bibleData.chapter}${unit} ${bibleData.verse}절 말씀.`;

      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${import.meta.env.VITE_GOOGLE_TTS_API_KEY}`, {
        method: "POST",
        body: JSON.stringify({
          input: { text: textToSpeak },
          voice: { 
            languageCode: "ko-KR", 
            name: targetVoice === 'F' ? "ko-KR-Neural2-B" : "ko-KR-Neural2-C" 
          },
          audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
        }),
      });

      const resData = await response.json();
      if (resData.audioContent) {
        // 즉시 재생
        const ttsAudio = new Audio(`data:audio/mp3;base64,${resData.audioContent}`);
        setupAudioEvents(ttsAudio, lastTime);

        // [복구 완료] 스토리지 저장 (백그라운드)
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
  const handleShare = async () => {
    // 햅틱 반응 추가
  if (window.navigator?.vibrate) window.navigator.vibrate(20);
    const shareData = {
      title: '성경 말씀',
      text: bibleData?.content ? cleanContent(bibleData.content) : '말씀을 공유해요.',
      url: window.location.href, 
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("링크가 클립보드에 복사되었습니다.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("공유 실패:", error);
      }
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
      
      {/* 상단 날짜 영역 */}
            <header className="text-center mb-3 flex flex-col items-center w-full relative">
              <p className="font-bold text-gray-400 tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
                {currentDate.getFullYear()}
              </p>
               {/* 날짜 정렬 영역 */}
              <div className="flex items-center justify-center w-full">
              {/* 1. 왼쪽 공간 확보용 (달력 버튼 포함) */}
          <div className="flex-1 flex justify-end pr-3">
            <button 
              onClick={() => dateInputRef.current?.showPicker()} 
              className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform"
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
          {/* 2. 중앙 날짜 (고정석) */}
          <h2 className="font-black text-zinc-900 tracking-tighter shrink-0" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
           {/* 3. 오른쪽: 가상의 빈 공간 (연필 버튼과 똑같은 너비를 확보하여 날짜를 중앙으로 밀어줌) */}
    <div className="flex-1 flex justify-start pl-3">
      {/* 아이콘이 없더라도 버튼과 똑같은 크기(w-[32px] h-[32px])의 
          투명한 박스를 두어 왼쪽 버튼과 무게 중심을 맞춥니다. 
      */}
      <div className="w-[28px] h-[28px]" aria-hidden="true" />
    </div>
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
<div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
  
  <AnimatePresence mode="wait">
  <motion.div 
    key={currentDate.toISOString()}
    drag="x" 
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.2}
    onDragEnd={onDragEnd}
    initial={{ opacity: 0, x: 20 }} 
    animate={{ opacity: 1, x: 0 }} 
    exit={{ opacity: 0, x: -20 }}
    className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-start justify-center p-10 pb-8 text-left z-10 touch-none cursor-grab active:cursor-grabbing"
  >
    {bibleData ? (
      <>
        {/* 말씀 본문 영역 */}
        <div className="space-y-5 text-zinc-800 leading-[1.7] break-keep font-medium mb-6 w-full" style={{ fontSize: `${fontSize}px` }}>
          {bibleData.content.split('\n').map((line: string, i: number) => {
            // 정규식 수정: 숫자(\d+) 뒤에 점(\.)이 있으면 무시하고 숫자와 나머지 텍스트만 가져옴
            const match = line.match(/^(\d+)\.?\s*(.*)/);
            
            if (match) {
              const [_, verseNum, textContent] = match;
              return (
                <p key={i} className="flex items-start gap-2">
                  {/* 점 없이 숫자만 출력 */}
                  <span className="text-[#4A6741] opacity-40 text-[0.8em] font-bold mt-[2px] flex-shrink-0">
                    {verseNum}
                  </span>
                  <span className="flex-1">{textContent}</span>
                </p>
              );
            }
            return <p key={i}>{line}</p>;
          })}
        </div>

        {/* 출처 영역 */}
        <span className="self-center text-center font-bold text-[#4A6741] opacity-60" style={{ fontSize: `${fontSize * 0.9}px` }}>
          {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse}절
        </span>
      </>
    ) : (
      <div className="animate-pulse text-zinc-200 w-full text-center">
        말씀을 불러오는 중...
      </div>
    )}
  </motion.div>
</AnimatePresence>

  {/* 오른쪽 힌트 카드 (내일) */}
<div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      {/* 3. 툴바 (카드와 좁게, 아래와 넓게) */}
  <div className="flex items-center gap-8 mt-3 mb-14"> 
    <button onClick={() => handlePlayTTS()}  // 반드시 빈 괄호를 넣어주세요!
              className="flex flex-col items-center gap-1.5 text-zinc-400">
      <Headphones size={22} strokeWidth={1.5} />
      <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 재생</span>
    </button>
{/* 말씀 복사 버튼 찾아서 수정 */}
<button onClick={handleCopy} className="flex flex-col items-center gap-1.5 text-zinc-400">
  <Copy size={22} strokeWidth={1.5} />
  <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
</button>
    <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
  </div>

{/* 4. 아멘 버튼 영역 */}
<div className="flex flex-col items-center gap-3 pb-4">
  {/* 파동 레이어와 버튼을 겹치기 위해 relative 컨테이너 사용 */}
  <div className="relative w-24 h-24 flex items-center justify-center">
    
    {/* 빛의 파동 효과 (hasAmened가 true일 때만 실행) */}
    <AnimatePresence>
      {hasAmened && (
        <>
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            className="absolute inset-0 bg-[#4A6741] rounded-full"
          />
          <motion.div
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 1.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
            className="absolute inset-0 bg-[#4A6741] rounded-full"
          />
        </>
      )}
    </AnimatePresence>

    {/* 실제 버튼 (색상 로직 복구) */}
    <motion.button 
      whileTap={{ scale: 0.9 }} 
      onClick={handleAmenClick}
      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 relative z-10
        ${hasAmened 
          ? 'bg-[#4A6741] text-white border-none' 
          : 'bg-white text-[#4A6741] border border-green-50'
        }`}
    >
      <Heart 
        className={`w-5 h-5 mb-1 ${hasAmened ? 'fill-white animate-bounce' : ''}`} 
        strokeWidth={hasAmened ? 0 : 2} 
      />
      <span className="font-bold" style={{ fontSize: `${fontSize * 0.9}px` }}>아멘</span>
      <span className="font-bold opacity-70" style={{ fontSize: `${fontSize * 0.9}px` }}>
        {amenCount.toLocaleString()}
      </span>
    </motion.button>
  </div>
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
        
        {/* 목소리 선택 영역 (수정본) */}
        <div className="flex gap-2">
          <button 
            onClick={() => setVoiceType('F')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}
          >
            여성 목소리
          </button>
          <button 
            onClick={() => setVoiceType('M')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}
          >
            남성 목소리
          </button>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
<AnimatePresence>
  {showCopyToast && (
    <motion.div 
      initial={{ opacity: 0, x: "-50%", y: 20 }} // x는 중앙 고정, y만 움직임
      animate={{ opacity: 1, x: "-50%", y: 0 }} 
      exit={{ opacity: 0, x: "-50%", y: 20 }} 
      transition={{ duration: 0.3 }}
      className="fixed bottom-48 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap"
      style={{ left: '50%', transform: 'translateX(-50%)' }} // 인라인 스타일로 한 번 더 강제
    >
      말씀이 복사되었습니다
    </motion.div>
  )}
</AnimatePresence>
    </div>
  );
}
