import React, { useState, useEffect, useRef } from "react";
import confetti from 'canvas-confetti';
import { 
  Heart, Headphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Check, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Pencil, NotebookPen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null); 
const [selectionStep, setSelectionStep] = useState<'testament' | 'book' | 'start_chapter' | 'end_chapter'>('testament');
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
  
  const BIBLE_BOOKS = {
    구약: [
      "창세기", "출애굽기", "레위기", "민수기", "신명기", "여호수아", "사사기", "루기", 
      "사무엘상", "사무엘하", "열왕기상", "열왕기하", "역대상", "역대하", "에스라", 
      "느헤미야", "에스더", "욥기", "시편", "잠언", "전도서", "아가", "이사야", 
      "예레미야", "예레미야 애가", "에스겔", "다니엘", "호세아", "요엘", "아모스", 
      "오바댜", "요나", "미가", "나훔", "하박국", "스바냐", "학개", "스가랴", "말라기"
    ],
    신약: [
      "마태복음", "마가복음", "누가복음", "요한복음", "사도행전", "로마서", "고린도전서", 
      "고린도후서", "갈라디아서", "에베소서", "빌립보서", "골로새서", "데살로니가전서", 
      "데살로니가후서", "디모데전서", "디모데후서", "디도서", "빌레몬서", "히브리서", 
      "야고보서", "베드로전서", "베드로후서", "요한일서", "요한이서", "요한삼서", 
      "유다서", "요한계시록"
    ]
  };

  // --- 🔥 범위 선택 전용 상태 (복구 및 강화) ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [rangePages, setRangePages] = useState<any[]>([]); 
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
type SelectionPhase = 'start' | 'end' | 'confirm';

const [selectionPhase, setSelectionPhase] =
  useState<SelectionPhase>('start');

const [tempSelection, setTempSelection] = useState({
  testament: '',
  book_name: '',
  start_chapter: 0,
  end_chapter: 0,
});
const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  type SelectionStep =
  | 'testament'
  | 'book'
  | 'start_chapter'
  | 'end_chapter'
  | 'confirm';

  const [isReadCompleted, setIsReadCompleted] = useState(false);
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
      .from('bible_verses')
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
      setRangePages([]); // 범위 모드 초기화
      setIsReadCompleted(false);
    }
  };

  // --- 🔥 [핵심] 단계별 데이터 로딩 로직 ---
const loadChapters = async (book: string) => {
  // 선택 반영
  setTempSelection({
    ...tempSelection,
    book_name: book,
    start_chapter: 0,
    end_chapter: 0,
  });

  // 장 정보 가져오기
  const { data } = await supabase
    .from('bible_verses')
    .select('chapter')
    .eq('book_name', book)
    .order('chapter', { ascending: true });

  if (data) {
    const chapters = Array.from(new Set(data.map(d => d.chapter)));
    setAvailableChapters(chapters);

    setSelectionStep('start_chapter'); // 권 선택 후 장 UI 바로 열림
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
    const fileName = `reading_b${bookOrder}_c${bibleData.chapter}_v${String(bibleData.verse || 'range').replace(/:/g, '_')}_${targetVoice}.mp3`;
    const storagePath = `reading/${fileName}`;
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
      const textToSpeak = `${mainContent}. ${bibleData.bible_name} ${bibleData.chapter}${unit} 말씀.`;
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

  const handleShare = async () => {
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

  const handleReadComplete = () => {
    const nextState = !isReadCompleted;
    setIsReadCompleted(nextState);

    if (nextState) {
      confetti({
        particleCount: 100, 
        spread: 70, 
        origin: { y: 0.8 }, 
        colors: ['#f897c4', '#88B04B', '#FFD700'] 
      });
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
      <header className="text-center mb-3 flex flex-col items-center w-full relative">
        <p className="font-bold text-gray-400 tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center justify-center w-full">
          <div className="flex-1 flex justify-end pr-3">
            <button 
              onClick={() => dateInputRef.current?.showPicker()} 
              className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform"
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
          <h2 className="font-black text-zinc-900 tracking-tighter shrink-0" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <div className="flex-1 flex justify-start pl-3">      
            <button
  onClick={() => {
    setIsEditModalOpen(true);
  }}
  className="
    relative z-[9999]
    flex items-center justify-center
    p-2 rounded-full
    bg-red-500
    active:scale-90
  "
>
  <NotebookPen size={18} color="white" />
</button>
          </div>
          <input type="date" ref={dateInputRef} onChange={handleDateChange} max={new Date().toISOString().split("T")[0]} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        <div className="absolute left-[-75%] w-[82%] max-w-sm h-[460px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
        <AnimatePresence mode="wait">
          <motion.div 
            key={bibleData?.id || bibleData?.chapter || currentDate.toISOString()}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-[82%] max-w-sm h-[460px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center p-10 text-center z-10 cursor-grab active:cursor-grabbing"
          >
            {bibleData ? (
              <>
                <div className="flex-1 w-full overflow-y-auto scrollbar-hide flex items-center justify-center mb-4 text-left">
                  <p className="text-zinc-800 leading-[1.8] break-keep font-medium mb-6" style={{ fontSize: `${fontSize}px` }}>
                    {bibleData.content}
                  </p>
                </div>
                <span className="font-bold text-[#4A6741] opacity-60 shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>
                  {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse ? `${bibleData.verse}절` : ''}
                </span>
              </>
            ) : <div className="animate-pulse text-zinc-200 m-auto">말씀을 불러오는 중...</div>}
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm h-[460px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
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
        <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      <div className="flex items-center justify-center gap-8 pb-6">
        <button 
          onClick={() => { if (rangePages.length > 0 && currentPageIdx > 0) { const newIdx = currentPageIdx - 1; setCurrentPageIdx(newIdx); setBibleData(rangePages[newIdx]); } }}
          className={`${rangePages.length > 0 && currentPageIdx > 0 ? 'text-[#4A6741]' : 'text-zinc-300'} transition-colors p-2`}
        >
          <ChevronLeft size={32} strokeWidth={1.5} />
        </button>

        <motion.button 
          whileTap={{ scale: 0.9 }} onClick={handleReadComplete}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
            ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-gray-400 border border-green-50'}`}
        >
          <Check className={`w-6 h-6 mb-1 ${isReadCompleted ? 'text-white animate-pulse' : ''}`} strokeWidth={3} />
          <span className="font-bold leading-tight" style={{ fontSize: `${fontSize * 0.85}px` }}>읽기<br/>완료</span>
        </motion.button>

        <button 
          onClick={() => { if (rangePages.length > 0 && currentPageIdx < rangePages.length - 1) { const newIdx = currentPageIdx + 1; setCurrentPageIdx(newIdx); setBibleData(rangePages[newIdx]); } }}
          className={`${rangePages.length > 0 && currentPageIdx < rangePages.length - 1 ? 'text-[#4A6741]' : 'text-zinc-300'} transition-colors p-2`}
        >
          <ChevronRight size={32} strokeWidth={1.5} />
        </button>
      </div>

      {/* 🔥 범위 선택 모달 (복구 및 기능 수정) */}
      <AnimatePresence>
        {/* 실제 모달 */}
{isEditModalOpen && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/40 z-[200] flex items-end justify-center"
    onClick={() => setIsEditModalOpen(false)}
  >
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="bg-white w-full max-md:rounded-t-[32px] p-8 max-h-[85vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 상단 선택 상태 표시 */}
      <div className="flex flex-wrap items-center gap-1 mb-6 bg-green-50 py-2 px-4 rounded-full w-fit text-[10px] font-bold text-[#4A6741]">
        <span>{tempSelection.testament || "성경"}</span>
        {tempSelection.book_name && <>〉<span>{tempSelection.book_name}</span></>}
        {tempSelection.start_chapter > 0 && <>〉<span>시작 {tempSelection.start_chapter}장</span></>}
        {tempSelection.start_verse > 0 && <>〉<span>{tempSelection.start_verse}절</span></>}
        {tempSelection.end_chapter > 0 && <>〉<span>{tempSelection.end_chapter}장</span></>}
        {tempSelection.end_verse > 0 && <>〉<span>{tempSelection.end_verse}절</span></>}
      </div>

      {/* 단계별 제목 */}
      <h3 className="text-xl font-black mb-6 text-zinc-900">
        {selectionStep === 'testament' && "어디를 읽으실까요?"}
        {selectionStep === 'book' && "권 선택"}
        {selectionStep === 'start_chapter' && "시작 장 선택"}
        {selectionStep === 'start_verse' && "시작 절 선택"}
        {selectionStep === 'end_chapter' && "종료 장 선택"}
        {selectionStep === 'end_verse' && "종료 절 선택"}
      </h3>

      <div className="grid grid-cols-4 gap-2">
        {/* 신약/구약 선택 */}
        {selectionStep === 'testament' &&
          ['구약', '신약'].map(t => (
            <button
              key={t}
              onClick={() => {
                setTempSelection(p => ({ ...p, testament: t }));
                setSelectionStep('book');
              }}
              className="py-5 bg-zinc-50 rounded-2xl font-bold col-span-4 text-lg"
            >
              {t}
            </button>
          ))}

        {/* 권 선택 */}
        {selectionStep === 'book' &&
          BIBLE_BOOKS[tempSelection.testament as '구약' | '신약'].map(b => (
            <button
              key={b}
              onClick={() => loadChapters(b)}
              className="py-3 bg-zinc-50 rounded-xl text-sm font-bold text-zinc-600"
            >
              {b}
            </button>
          ))}

        {/* 장 선택 */}
        {(selectionStep === 'start_chapter' || selectionStep === 'end_chapter') &&
          availableChapters.map(ch => (
            <button
              key={ch}
              disabled={selectionStep === 'end_chapter' && ch < tempSelection.start_chapter}
              onClick={() => {
                if (selectionStep === 'start_chapter') {
                  setTempSelection(p => ({ ...p, start_chapter: ch }));
                  loadVerses(ch, 'start_verse');
                  setSelectionStep('start_verse'); // ✅ 시작 장 선택 후 절 선택
                } else {
                  setTempSelection(p => ({ ...p, end_chapter: ch }));
                  loadVerses(ch, 'end_verse');
                  setSelectionStep('end_verse');
                }
              }}
              className={`py-3 rounded-xl font-bold ${
                selectionStep === 'end_chapter' && ch < tempSelection.start_chapter
                  ? 'bg-zinc-100 text-zinc-300'
                  : 'bg-zinc-50 text-zinc-700'
              }`}
            >
              {ch}
            </button>
          ))}

        {/* 절 선택 */}
        {(selectionStep === 'start_verse' || selectionStep === 'end_verse') &&
          availableVerses.map(v => (
            <button
              key={v}
              disabled={selectionStep === 'end_verse' && v < tempSelection.start_verse}
              onClick={() => {
                if (selectionStep === 'start_verse') {
                  setTempSelection(p => ({ ...p, start_verse: v }));
                  setSelectionStep('end_chapter'); // 다음 단계: 종료 장
                } else {
                  setTempSelection(p => ({ ...p, end_verse: v }));
                  setIsEditModalOpen(false); // 완료 시 모달 닫기
                }
              }}
              className={`py-3 rounded-xl font-bold ${
                selectionStep === 'end_verse' && v < tempSelection.start_verse
                  ? 'bg-zinc-100 text-zinc-300'
                  : 'bg-zinc-50 text-zinc-700'
              }`}
            >
              {v}
            </button>
          ))}
      </div>

      <button
        onClick={() => setIsEditModalOpen(false)}
        className="w-full mt-8 py-4 text-zinc-400 font-bold text-sm"
      >
        닫기
      </button>
    </motion.div>
  </motion.div>
)}
      </AnimatePresence>

      {/* TTS 컨트롤 (완벽 복구) */}
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
