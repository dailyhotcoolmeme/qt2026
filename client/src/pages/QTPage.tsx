import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, Headphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Calendar as CalendarIcon, ChevronRight, ChevronLeft, PencilLine, Trash2, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useLocation } from "wouter"; // [필수] wouter 사용
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";

// 사용자 세션 ID 생성 (익명 사용자 추적)
const getSessionId = () => {
  let sessionId = localStorage.getItem('qt_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('qt_session_id', sessionId);
  }
  return sessionId;
};

export default function QTPage() {
  const [location, setLocation] = useLocation(); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef(getSessionId());
  const { user } = useAuth();

  // 1. 사용자 관련 상태
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [shouldOpenWriteSheet, setShouldOpenWriteSheet] = useState(false);

  // 2. 작성 및 녹음 관련 상태
  const [isWriteSheetOpen, setIsWriteSheetOpen] = useState(false);
  const [textContent, setTextContent] = useState("");
  

  // 3. 성경 및 UI 관련 상태
  const [bibleData, setBibleData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const [showCopyToast, setShowCopyToast] = useState(false); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<number | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);

  // 4. Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- 1. 나눔 참여 버튼 클릭 시 실행할 함수 ---
  const handleJoinClick = () => {
    // 로그인 여부 확인
    if (!user?.id) {
      // 로그인 모달 띄우기
      setShowLoginModal(true);
      // 로그인 후 작성창을 자동으로 열기 위한 플래그
      setShouldOpenWriteSheet(true);
      return;
    }
    // 로그인 되어 있으면 글쓰기 시트 열기
    setIsWriteSheetOpen(true);
  };

  // 로그인 후 돌아오면 자동으로 작성창 열기
  useEffect(() => {
    if (user?.id && shouldOpenWriteSheet && !showLoginModal) {
      setIsWriteSheetOpen(true);
      setShouldOpenWriteSheet(false);
    }
  }, [user?.id, shouldOpenWriteSheet, showLoginModal]);

  // URL 쿼리에서 autoOpenWrite 파라미터 확인하고 자동으로 작성창 열기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoOpenWrite') === 'true' && user?.id) {
      setIsWriteSheetOpen(true);
      // URL에서 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      try { localStorage.removeItem('qt_autoOpenWrite'); localStorage.removeItem('qt_return'); } catch (e) {}
      return;
    }

    // Fallback: check localStorage for return/autoOpen set before OAuth flow
    try {
      const storedAuto = localStorage.getItem('qt_autoOpenWrite');
      const storedReturn = localStorage.getItem('qt_return');
      if (storedAuto === '1' && user?.id) {
        setIsWriteSheetOpen(true);
        localStorage.removeItem('qt_autoOpenWrite');
        if (storedReturn) {
          localStorage.removeItem('qt_return');
          if (window.location.href !== storedReturn) {
            window.location.href = storedReturn;
            return;
          }
        }
      } else if (storedReturn && user?.id) {
        localStorage.removeItem('qt_return');
        window.location.href = storedReturn;
        return;
      }
    } catch (e) {
      // ignore
    }
  }, [user?.id]);

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

  // 오디오 컨트롤 표시 상태 (TTS 재생용)
  const [showAudioControl, setShowAudioControl] = useState(false);

  // 묵상 저장 함수
  const handleSubmit = async () => {
    if (!textContent) return;

    try {
      // 로그인 사용자만 저장 가능
      if (!user?.id) {
        alert("로그인 후 글을 남길 수 있습니다.");
        return;
      }

      const { data, error } = await supabase
        .from('meditations')
        .insert({
          user_id: user.id,
          // DB requires non-null user_nickname; provide a safe fallback
          user_nickname: user?.nickname ?? '회원',
          is_anonymous: isAnonymous,
          my_meditation: textContent,
          verse: bibleData ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}` : null,
          verse_display_date: bibleData?.display_date 
  ?? currentDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating meditation:', error);
        // show detailed error when available to help debugging
        try { console.error(JSON.stringify(error)); } catch (e) {}
        alert("글 저장 중 오류가 발생했습니다.");
        return;
      }

      // UI 업데이트
      const newNote = {
        id: data.id,
        user_id: data.user_id,
        content: textContent,
        author: isAnonymous ? "익명" : (data.user_nickname || user?.nickname || "회원"),
        created_at: new Date().toLocaleDateString(),
        created_time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        authorId: data.user_id,
      };

      setNotes(prevNotes => [newNote, ...prevNotes]);
      setTextContent("");
      setIsAnonymous(true);
      setIsWriteSheetOpen(false);
      setNoteIndex(0);
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      alert("글 저장 중 오류가 발생했습니다.");
    }
  };

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
    .from('daily_qt_verses')
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
  // 1. localStorage에서 저장된 묵상들 로드
const [notes, setNotes] = useState<any[]>(() => {
  const saved = localStorage.getItem('qt_notes')
  return saved ? JSON.parse(saved) : []
});
const [expandedId, setExpandedId] = useState<number | null>(null);
const [noteIndex, setNoteIndex] = useState(0);
const [isLoadingNotes, setIsLoadingNotes] = useState(true);

// Supabase에서 오늘의 묵상들 로드
useEffect(() => {
  const loadNotes = async () => {
    setIsLoadingNotes(true);
    const formattedDate = currentDate.toISOString().split('T')[0];

const { data, error } = await supabase
  .from('meditations')
  .select(`
    id,
    user_id,
    user_nickname,
    is_anonymous,
    my_meditation,
    verse,
    created_at
  `)
  .eq('verse_display_date', formattedDate) // ⭐ 기준 변경
  .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading notes:', error);
      setIsLoadingNotes(false);
      return;
    }

    const loadedNotes = (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      content: item.my_meditation,
      author: item.is_anonymous ? '익명' : (item.user_nickname || '익명'),
      verse: item.verse || null,
      created_at: new Date(item.created_at).toLocaleDateString(),
      created_time: new Date(item.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      authorId: item.user_id,
    }));

    setNotes(loadedNotes);
    setIsLoadingNotes(false);
  };

  loadNotes();
}, [currentDate]);

// notes가 변경될 때마다 localStorage에 저장 (백업용)
useEffect(() => {
  localStorage.setItem('qt_notes', JSON.stringify(notes));
}, [notes]);

useEffect(() => {
  // 마지막 묵상을 삭제했을 때 인덱스가 꼬여서 화면이 멈추는 것을 방지합니다.
  if (notes.length > 0 && noteIndex >= notes.length) {
    setNoteIndex(notes.length - 1);
  }
}, [notes.length, noteIndex]);
// 말씀 카드 스와이프와 동일한 로직 적용
const onNoteDragEnd = (event: any, info: any) => {
  if (info.offset.x > 100) { // 오른쪽으로 밀기 (이전 묵상)
    if (noteIndex > 0) {
      setNoteIndex(prev => prev - 1);
      setExpandedId(null); // 다음 카드로 가면 높이 초기화
    }
  } else if (info.offset.x < -100) { // 왼쪽으로 밀기 (다음 묵상)
    if (noteIndex < (notes?.length || 0) - 1) {
      setNoteIndex(prev => prev + 1);
      setExpandedId(null); // 다음 카드로 가면 높이 초기화
    }
  }
};
// 2. 삭제 버튼 클릭 시 바로 지우지 않고 확인창을 띄우는 함수
const openDeleteConfirm = (id: number) => {
  setTargetDeleteId(id);
  setShowDeleteConfirm(true);
  if (window.navigator?.vibrate) window.navigator.vibrate(10); // 살짝 진동
};

// 3. 확인창에서 '삭제'를 눌렀을 때 진짜 실행되는 함수
const confirmDelete = async () => {
  if (targetDeleteId !== null) {
    const noteToDelete = notes.find(n => n.id === targetDeleteId);
    // 현재 사용자가 글의 작성자인지 확인
    const currentAuthorId = user?.id;
    
    if (noteToDelete?.authorId === currentAuthorId) {
      try {
        const { error } = await supabase
          .from('meditations')
          .delete()
          .eq('id', targetDeleteId)
          .eq('user_id', currentAuthorId);

        if (error) {
          console.error('Error deleting meditation:', error);
          alert("글 삭제 중 오류가 발생했습니다.");
          return;
        }

        setNotes(prev => prev.filter(n => n.id !== targetDeleteId));
        
        // 인덱스 보정
        if (noteIndex >= notes.length - 1 && noteIndex > 0) {
          setNoteIndex(prev => prev - 1);
        }

        setShowDeleteConfirm(false);
        setTargetDeleteId(null);
        
        // 삭제 완료 토스트
        setShowDeleteToast(true);
        setTimeout(() => setShowDeleteToast(false), 2000);
        if (window.navigator?.vibrate) window.navigator.vibrate([30, 30]);
      } catch (err) {
        console.error('Error in confirmDelete:', err);
        alert("글 삭제 중 오류가 발생했습니다.");
      }
    } else {
      alert("자신이 작성한 글만 삭제할 수 있습니다.");
      setShowDeleteConfirm(false);
      setTargetDeleteId(null);
    }
  }
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
<div className="absolute left-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
  
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
    className="w-[82%] max-w-sm h-auto min-h-[450px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-start justify-center p-10 pb-8 text-left z-10 touch-none cursor-grab active:cursor-grabbing"
  >
    {bibleData ? (
      <>
        {/* 말씀 본문 영역 - 높이 고정 및 스크롤 추가 */}
    <div className="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 text-zinc-800 leading-[1.7] break-keep font-medium mb-6" 
         style={{ fontSize: `${fontSize}px`,maxHeight: "320px" // 이 값을 조절하여 카드의 전체적인 높이감을 결정하세요
        }}>
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
<div className="absolute right-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
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
{/* 4. 묵상 카드 영역 */}
<div className="relative w-full flex flex-col items-center mt-6 mb-6">
  {/* 헤더 부분 */}
  <div className="w-[82%] max-w-sm mb-3 flex justify-between items-center px-1">
    <div className="flex items-center gap-4">
      <h3 className="font-bold text-[#4A6741] opacity-60" style={{ fontSize: `${fontSize * 0.9}px` }}>묵상 나눔</h3>
      <button 
  onClick={handleJoinClick}
  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#4A6741]/10 rounded-full active:scale-95 transition-all ml-1"
>
  <PencilLine size={fontSize * 0.75} className="text-[#4A6741]" />
  <span className="font-bold text-[#4A6741]" style={{ fontSize: `${fontSize * 0.8}px` }}>나눔 참여</span>
</button>
    </div>
    <span className="font-medium text-zinc-400 opacity-70" style={{ fontSize: `${fontSize * 0.7}px` }}>
      {notes.length > 0 ? `${noteIndex + 1} / ${notes.length}` : "0 / 0"}
    </span>
  </div>

  <div className="relative w-full flex items-center justify-center">
    {/* 왼쪽 화살표 */}
    <div className="absolute left-[3%] -translate-x-1/2 z-20">
      <button 
        onClick={() => noteIndex > 0 && setNoteIndex(prev => prev - 1)}
        disabled={noteIndex === 0}
        className={`p-2 transition-all ${noteIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-20 active:scale-75'}`}
      >
        <ChevronLeft size={24} strokeWidth={1.2} className="text-zinc-900" />
      </button>
    </div>

    {/* 묵상 카드 본체 */}
<AnimatePresence mode="wait">
  {isLoadingNotes ? (
    <motion.div 
      key="loading"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="w-[82%] max-w-sm bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white flex flex-col items-center justify-center py-12 relative z-10"
    >
      <p 
        className="text-zinc-400 font-medium" 
        style={{ fontSize: `${fontSize * 0.85}px` }}
      >
        묵상들을 불러오는 중...
      </p>
    </motion.div>
  ) : notes.length > 0 && notes[noteIndex] ? (
    /* 1. 묵상이 있을 때 보여줄 카드 */
    <motion.div
      key={`note-${notes[noteIndex].id}`}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={onNoteDragEnd}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className="w-[82%] max-w-sm bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white flex flex-col p-7 touch-none cursor-grab active:cursor-grabbing relative z-10"
    >
      {/* 본문 */}
      <div 
        className={`text-zinc-600 leading-[1.7] break-keep transition-all duration-300 ${
          expandedId === notes[noteIndex].id ? '' : 'line-clamp-3'
        } whitespace-pre-wrap`} 
        style={{ fontSize: `${fontSize * 0.9}px` }}
      >
        {notes[noteIndex].content}
      </div>

      {/* 더보기 버튼 */}
      {(notes[noteIndex].content.length > 60 || notes[noteIndex].content.includes('\n')) && (
        <button 
          onClick={() => setExpandedId(expandedId === notes[noteIndex].id ? null : notes[noteIndex].id)}
          className="font-medium text-[#4A6741] opacity-50 mt-3 self-start px-1"
          style={{ fontSize: `${fontSize * 0.8}px` }}
        >
          {expandedId === notes[noteIndex].id ? "접기" : "더보기"}
        </button>
      )}

      {/* 음성 녹음/재생 기능 제거: 노트에는 텍스트만 표시됩니다 */}

      {/* 푸터: 닉네임 + 날짜 + 삭제 */}
<div className="mt-5 pt-4 border-t border-zinc-50 flex justify-between items-center">
  <div className="flex flex-col gap-0.5">
    <span className="font-bold text-[#4A6741] opacity-50" style={{ fontSize: `${fontSize * 0.85}px` }}>
      {notes[noteIndex].author}
    </span>
    <div className="flex items-center gap-1.5"> {/* 가로 정렬을 위한 div 추가 */}
      <span className="text-zinc-400 font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>
        {notes[noteIndex].created_at || "오늘"} 
      </span>
      {/* 아래 시간 코드를 추가합니다 */}
      <span className="text-zinc-400 font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>
        {notes[noteIndex].created_time}
      </span>
    </div>
  </div>
  {notes[noteIndex]?.authorId === (user?.id) && (
    <button 
      onClick={(e) => { e.stopPropagation(); openDeleteConfirm(notes[noteIndex].id); }}
      className="p-1.5 text-zinc-300 hover:text-red-400 transition-colors"
    >
      <Trash2 size={fontSize * 1.1} strokeWidth={1.5} />
    </button>
  )}
</div>
    </motion.div>
  ) : (
    /* 2. 묵상이 없을 때 보여줄 안내 박스 */
    <motion.div 
      key="empty-box"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      // 기존 카드와 동일한 className을 사용하고 py(상하 여백)만 조절해서 3줄 높이로 맞춤
      className="w-[82%] max-w-sm bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white flex flex-col items-center justify-center py-12 relative z-10"
    >
      <p 
        className="text-zinc-400 font-medium" 
        style={{ fontSize: `${fontSize * 0.85}px` }}
      >
        묵상 기록을 나눠보세요.
      </p>
    </motion.div>
  )}
</AnimatePresence>

    {/* 오른쪽 화살표 */}
    <div className="absolute right-[3%] translate-x-1/2 z-20">
      <button 
        onClick={() => noteIndex < notes.length - 1 && setNoteIndex(prev => prev + 1)}
        disabled={noteIndex >= notes.length - 1}
        className={`p-2 transition-all ${noteIndex >= notes.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-20 active:scale-75'}`}
      >
        <ChevronRight size={24} strokeWidth={1.2} className="text-zinc-900" />
      </button>
    </div>
  </div>
</div>
{/* 삭제 확인 커스텀 모달 */}
<AnimatePresence>
  {showDeleteConfirm && (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      {/* 배경 흐리게 */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setShowDeleteConfirm(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      
      {/* 모달 본체 */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-[28px] p-8 w-full max-w-[280px] shadow-2xl text-center"
      >
        <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize}px` }}>
          묵상을 삭제할까요?
        </h4>
        <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
          삭제된 묵상은 복구할 수 없습니다.
        </p>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            취소
          </button>
          <button 
            onClick={confirmDelete}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold transition-active active:scale-95 shadow-lg shadow-red-200"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            삭제
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
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
      className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap"
      style={{ left: '50%', transform: 'translateX(-50%)' }} // 인라인 스타일로 한 번 더 강제
    >
      말씀이 복사되었습니다
    </motion.div>
  )}
</AnimatePresence>
<AnimatePresence>
  {isWriteSheetOpen && (
    <>
      {/* 배경 흐리게 */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setIsWriteSheetOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]"
      />
      
      {/* 입력 시트 */}
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-zinc-50 rounded-t-[32px] z-[401] px-6 pt-2 pb-10"
      >
        <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-4" />
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-medium text-zinc-700" style={{ fontSize: `${fontSize}px` }}>묵상기록 남기기</h3>
          <button onClick={handleSubmit} className="text-[#4A6741] font-bold" style={{ fontSize: `${fontSize}px` }}>등록</button>
        </div>

        {/* 텍스트 입력 영역 */}
        <textarea 
  value={textContent}
  onChange={(e) => setTextContent(e.target.value)}
  placeholder="오늘 말씀과 묵상에 대해 기록해보세요"
  className="w-full h-40 bg-white rounded-2xl p-4 border-none focus:outline-none focus:ring-1 focus:ring-[#4A6741]/20 resize-none mb-4"
  style={{ fontSize: `${fontSize * 0.9}px` }}
/>
{/* 익명 체크박스 영역 */}
<div className="flex items-center gap-2 mb-4 px-1">
  <input 
    type="checkbox" 
    id="anonymous"
    checked={isAnonymous}
    onChange={(e) => setIsAnonymous(e.target.checked)}
    className="w-4 h-4 accent-[#4A6741]"
  />
  <label htmlFor="anonymous" className="text-zinc-500 text-sm font-medium cursor-pointer">
    익명으로 등록하기
  </label>
</div>

{/* 작성자 정보 표시 (미리보기 느낌) */}
<div className="text-xs text-zinc-400 mb-4 px-1">
  작성자: <span className="text-[#4A6741] font-bold">
    {isAnonymous ? "익명" : (user?.nickname || "회원")}
  </span>
</div>
        {/* 음성 녹음 기능 제거: 텍스트 입력만 사용합니다 */}
        <div className="p-2" />
      </motion.div>
    </>
  )}
</AnimatePresence>

{/* 5. 로그인 필수 모달 */}
<LoginModal 
  open={showLoginModal} 
  onOpenChange={setShowLoginModal}
  // place the query before the hash so useHashLocation sees the query correctly
  returnTo={`${window.location.origin}/?autoOpenWrite=true#/qt`}
/> 
    </div>
  );
}
