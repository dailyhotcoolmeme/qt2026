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
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";

export default function ReadingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null); 
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
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

  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showRangeToast, setShowRangeToast] = useState(false);
  const [rangeToastMessage, setRangeToastMessage] = useState('');
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFromServer, setIsFromServer] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const { fontSize = 16 } = useDisplaySettings();

  useEffect(() => {
    if (showAudioControl) {
      handlePlayTTS();
    }
  }, [voiceType]);

  // 범위 선택 모드로만 사용
  useEffect(() => {
    // ReadingPage는 범위 선택 전용 페이지
    if (rangePages.length === 0) {
      setBibleData(null);
    }
  }, []);

// 🔥 범위 선택 관련 상태
type SelectionPhase = 'start' | 'end';
const [selectionPhase, setSelectionPhase] = useState<SelectionPhase>('start');
const [selectionStep, setSelectionStep] = useState<'testament' | 'book' | 'chapter'>('testament');
const [tempSelection, setTempSelection] = useState({
  start_testament: '',
  start_book: '',
  start_chapter: 0,
  end_testament: '',
  end_book: '',
  end_chapter: 0,
});
const [availableChapters, setAvailableChapters] = useState<number[]>([]);
const [readingProgress, setReadingProgress] = useState<Record<string, number>>({});
const [bookOrderMap, setBookOrderMap] = useState<Record<string, number>>({});

// 책 순서 매핑 로드
useEffect(() => {
  const loadBookOrders = async () => {
    const { data } = await supabase
      .from('bible_books')
      .select('book_name, book_order');
    
    if (data) {
      const orderMap: Record<string, number> = {};
      data.forEach(book => {
        orderMap[book.book_name] = book.book_order;
      });
      setBookOrderMap(orderMap);
    }
  };
  loadBookOrders();
}, []);

// 날짜별 말씀 로드 (로그인한 회원용)
const loadDailyVerse = async (date: Date) => {
  if (!user) return;
  
  const dateStr = date.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('user_reading_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', dateStr)
    .maybeSingle();
  
  if (data) {
    // bible_books 정보 별도 조회
    const { data: bookInfo } = await supabase
      .from('bible_books')
      .select('*')
      .eq('book_name', data.book_name)
      .single();
    
    // 절 번호와 함께 포맷팅
    const { data: verses } = await supabase
      .from('bible_verses')
      .select('*')
      .eq('book_name', data.book_name)
      .eq('chapter', data.chapter)
      .gte('verse', data.start_verse || 1)
      .lte('verse', data.end_verse || 999)
      .order('verse', { ascending: true });
    
    if (verses && verses.length > 0) {
      const formattedContent = verses.map(v => `${v.verse}. ${v.content}`).join('\n');
      
      setBibleData({
        id: data.id,
        bible_name: data.book_name,
        chapter: data.chapter,
        verse: data.start_verse === data.end_verse ? `${data.start_verse}` : `${data.start_verse}-${data.end_verse}`,
        content: formattedContent,
        bible_books: bookInfo || { book_order: 0 },
      });
    }
  } else if (error) {
    console.error('말씀 로드 실패:', error);
  }
};

// 로그인한 회원의 경우 날짜별 말씀 로드
useEffect(() => {
  if (user && rangePages.length === 0) {
    loadDailyVerse(currentDate);
  }
}, [user, currentDate, rangePages.length]);

// 모달이 열릴 때 전체 읽기 이력 로드
useEffect(() => {
  if (isEditModalOpen && user) {
    loadAllReadingProgress();
  }
}, [isEditModalOpen, user]);

  // localStorage에서 상태 복원
  useEffect(() => {
    const savedSelection = localStorage.getItem('reading_selection');
    const savedPages = localStorage.getItem('reading_pages');
    const savedIdx = localStorage.getItem('reading_page_idx');
    
    if (savedSelection && savedPages) {
      try {
        const selection = JSON.parse(savedSelection);
        const pages = JSON.parse(savedPages);
        const idx = Number(savedIdx) || 0;
        
        setTempSelection(selection);
        setRangePages(pages);
        setCurrentPageIdx(idx);
        if (pages[idx]) {
          setBibleData(pages[idx]);
        }
      } catch (e) {
        console.error('상태 복원 실패:', e);
      }
    }
  }, []);

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    if (tempSelection.start_chapter > 0) {
      localStorage.setItem('reading_selection', JSON.stringify(tempSelection));
    }
  }, [tempSelection]);

  useEffect(() => {
    if (rangePages.length > 0) {
      localStorage.setItem('reading_pages', JSON.stringify(rangePages));
      localStorage.setItem('reading_page_idx', String(currentPageIdx));
      
      // 마지막 읽은 장으로 이동 (최초 로드 시에만)
      if (user && bibleData === null) {
        loadLastReadChapter();
      }
    }
  }, [rangePages, currentPageIdx]);
  
  // bibleData 변경 시 읽기 상태 확인 및 초기화
  useEffect(() => {
    // 페이지가 변경되면 읽기완료 상태를 초기화 (각 장이 독립적)
    setIsReadCompleted(false);
    
    if (bibleData && user) {
      checkCurrentChapterReadStatus();
    } else {
      setReadCount(0);
    }
  }, [bibleData, user]);
  
const loadAllReadingProgress = async () => {
  if (!user) return;
  
  // user_reading_records에서 모든 읽기 기록 가져오기
  const { data } = await supabase
    .from('user_reading_records')
    .select('book_name, chapter, read_count')
    .eq('user_id', user.id);
  
  if (!data) return;
  
  // 각 책의 장별 카운트 계산
  const bookData: Record<string, { chapters: Set<number>; chapterCounts: Record<number, number> }> = {};
  
  data.forEach(record => {
    if (!bookData[record.book_name]) {
      bookData[record.book_name] = {
        chapters: new Set(),
        chapterCounts: {}
      };
    }
    bookData[record.book_name].chapters.add(record.chapter);
    bookData[record.book_name].chapterCounts[record.chapter] = record.read_count;
  });
  
  // 각 책의 전체 장 수를 가져와서 진행률 계산
  const progressMap: Record<string, number> = {};
  
  for (const bookName in bookData) {
    const { data: verses } = await supabase
      .from('bible_verses')
      .select('chapter')
      .eq('book_name', bookName)
      .order('chapter', { ascending: true });
    
    if (verses) {
      const totalChapters = Array.from(new Set(verses.map(v => v.chapter)));
      const completedChapters = bookData[bookName].chapters.size;
      
      // 책 전체 진행률 (소숫점 1자리)
      const percentage = totalChapters.length > 0 
        ? Math.round((completedChapters / totalChapters.length) * 1000) / 10
        : 0;
      progressMap[`${bookName}_total`] = percentage;
      
      // 각 장별 읽은 횟수도 저장
      totalChapters.forEach(ch => {
        const key = `${bookName}_${ch}`;
        progressMap[key] = bookData[bookName].chapterCounts[ch] || 0;
      });
    }
  }
  
  setReadingProgress(progressMap);
};

const loadChapters = async (book: string) => {
  if (selectionPhase === 'start') {
    setTempSelection(p => ({ ...p, start_book: book }));
  } else {
    setTempSelection(p => ({ ...p, end_book: book }));
  }

  const { data } = await supabase
    .from('bible_verses')
    .select('chapter')
    .eq('book_name', book)
    .order('chapter', { ascending: true });

  if (data) {
    const chapters = Array.from(new Set(data.map(d => d.chapter)));
    setAvailableChapters(chapters);
    
    // 로그인 상태면 읽기 진행률 불러오기
    if (user) {
      await loadReadingProgress(book, chapters);
    }
    
    setSelectionStep('chapter');
  }
};

const loadReadingProgress = async (book: string, chapters: number[]) => {
  if (!user) return;
  
  const { data } = await supabase
    .from('user_reading_records')
    .select('chapter, read_count')
    .eq('user_id', user.id)
    .eq('book_name', book);
  
  if (data) {
    const uniqueCompletedChapters = Array.from(new Set(data.map(d => d.chapter)));
    const chapterCounts: Record<number, number> = {};
    
    data.forEach(d => {
      chapterCounts[d.chapter] = d.read_count;
    });
    
    const progressMap: Record<string, number> = {};
    
    chapters.forEach(ch => {
      const key = `${book}_${ch}`;
      // 읽은 횟수 저장 (장 선택에서 사용)
      progressMap[key] = chapterCounts[ch] || 0;
    });
    
    // 권 전체 진행률 계산 (소숫점 1자리까지)
    const bookProgressPercentage = chapters.length > 0
      ? Math.round((uniqueCompletedChapters.length / chapters.length) * 1000) / 10
      : 0;
    progressMap[`${book}_total`] = bookProgressPercentage;
    
    setReadingProgress(prev => ({ ...prev, ...progressMap }));
  }
};

const checkCurrentChapterReadStatus = async () => {
  if (!user || !bibleData) return;
  
  const { data } = await supabase
    .from('user_reading_records')
    .select('read_count')
    .eq('user_id', user.id)
    .eq('book_name', bibleData.bible_name)
    .eq('chapter', bibleData.chapter);
  
  // 읽기 완료 횟수만 저장, 버튼 색상은 변경하지 않음 (범위 선택 모드이므로)
  const totalCount = data ? data.reduce((sum, record) => sum + record.read_count, 0) : 0;
  setReadCount(totalCount);
};

const loadLastReadChapter = async () => {
  if (!user || rangePages.length === 0) return;
  
  const { data } = await supabase
    .from('user_reading_records')
    .select('book_name, chapter, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (data && rangePages.length > 0) {
    const lastReadIndex = rangePages.findIndex(
      p => p.bible_name === data.book_name && p.chapter === data.chapter
    );
    
    if (lastReadIndex !== -1) {
      setCurrentPageIdx(lastReadIndex);
      setBibleData(rangePages[lastReadIndex]);
    }
  }
};

const loadRangePagesWithSelection = async (selection: typeof tempSelection) => {
  console.log('loadRangePagesWithSelection 시작:', selection);
  
  if (!selection.start_book || !selection.start_chapter) {
    alert('시작 범위를 선택해주세요.');
    return;
  }

  if (!selection.end_book || !selection.end_chapter) {
    alert('종료 범위를 선택해주세요.');
    return;
  }

  // 권 순서 확인 (시작 권이 종료 권보다 뒤에 있으면 안됨)
  const { data: startBookData } = await supabase
    .from('bible_books')
    .select('book_order')
    .eq('book_name', selection.start_book)
    .maybeSingle();

  const { data: endBookData } = await supabase
    .from('bible_books')
    .select('book_order')
    .eq('book_name', selection.end_book)
    .maybeSingle();

  if (startBookData && endBookData && startBookData.book_order > endBookData.book_order) {
    alert('시작 범위가 종료 범위보다 뒤에 있을 수 없습니다.');
    return;
  }

  const pages: any[] = [];
  
  // 같은 권인 경우
  if (selection.start_book === selection.end_book) {
    for (let ch = selection.start_chapter; ch <= selection.end_chapter; ch++) {
      const { data, error } = await supabase
        .from('bible_verses')
        .select('*')
        .eq('book_name', selection.start_book)
        .eq('chapter', ch)
        .order('verse', { ascending: true });

      console.log(`${selection.start_book} ${ch}장 데이터:`, data, error);

      if (data && data.length > 0) {
        // 각 절을 verse 번호와 함께 포맷팅
        const formattedContent = data.map(v => `${v.verse}. ${v.content}`).join('\n');
        
        pages.push({
          id: `${selection.start_book}_${ch}`,
          bible_name: selection.start_book,
          chapter: ch,
          content: formattedContent,
          verse: null,
          bible_books: startBookData,
        });
      }
    }
  } else {
    // 다른 권인 경우 - 시작 권부터 종료 권까지 모든 장 가져오기
    const { data: allBooks } = await supabase
      .from('bible_books')
      .select('*')
      .gte('book_order', startBookData?.book_order)
      .lte('book_order', endBookData?.book_order)
      .order('book_order', { ascending: true });

    if (allBooks) {
      for (const book of allBooks) {
        // 각 권의 모든 장 가져오기
        const { data: chapters } = await supabase
          .from('bible_verses')
          .select('chapter')
          .eq('book_name', book.book_name)
          .order('chapter', { ascending: true });

        if (chapters) {
          const uniqueChapters = Array.from(new Set(chapters.map(c => c.chapter)));
          
          for (const ch of uniqueChapters) {
            // 시작 권의 경우 시작 장부터
            if (book.book_name === selection.start_book && ch < selection.start_chapter) continue;
            // 종료 권의 경우 종료 장까지
            if (book.book_name === selection.end_book && ch > selection.end_chapter) continue;

            const { data, error } = await supabase
              .from('bible_verses')
              .select('*')
              .eq('book_name', book.book_name)
              .eq('chapter', ch)
              .order('verse', { ascending: true });

            console.log(`${book.book_name} ${ch}장 데이터:`, data, error);

            if (data && data.length > 0) {
              // 각 절을 verse 번호와 함께 포맷팅
              const formattedContent = data.map(v => `${v.verse}. ${v.content}`).join('\n');
              
              pages.push({
                id: `${book.book_name}_${ch}`,
                bible_name: book.book_name,
                chapter: ch,
                content: formattedContent,
                verse: null,
                bible_books: { book_order: book.book_order },
              });
            }
          }
        }
      }
    }
  }

  console.log('생성된 pages:', pages);

  if (pages.length === 0) {
    alert('선택한 범위의 성경 데이터를 찾을 수 없습니다. 데이터베이스를 확인해주세요.');
    return;
  }

  setRangePages(pages);
  setCurrentPageIdx(0);
  setBibleData(pages[0]);
  setIsEditModalOpen(false);
  
  // 토스트 메시지로 범위 안내
  const message = selection.start_book === selection.end_book
    ? `${selection.start_book} ${selection.start_chapter}장 ~ ${selection.end_chapter}장 말씀입니다.`
    : `${selection.start_book} ${selection.start_chapter}장 ~ ${selection.end_book} ${selection.end_chapter}장 말씀입니다.`;
  
  setRangeToastMessage(message);
  setShowRangeToast(true);
  setTimeout(() => setShowRangeToast(false), 3000);
};

const loadRangePages = async () => {
  await loadRangePagesWithSelection(tempSelection);
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

  const setupAudioEvents = (audio: HTMLAudioElement, startTime: number, fromServer = false) => {
    audioRef.current = audio;
    audio.currentTime = startTime;
    
    // 서버 파일일 때 duration 및 진행 상태 업데이트
    setIsFromServer(fromServer);
    
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };
    
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      
      // 음성 싱크: 절별 스크롤 및 하이라이트
      if (verseRefs.current.length > 0 && audio.duration > 0) {
        const totalVerses = verseRefs.current.length;
        const estimatedVerseIndex = Math.floor((audio.currentTime / audio.duration) * totalVerses);
        const clampedIndex = Math.min(estimatedVerseIndex, totalVerses - 1);
        
        if (clampedIndex !== currentVerseIndex && verseRefs.current[clampedIndex]) {
          setCurrentVerseIndex(clampedIndex);
          verseRefs.current[clampedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      setCurrentTime(0);
      setDuration(0);
      audioRef.current = null;
    };
    
    setShowAudioControl(true);
    setIsPlaying(true);
    audio.play().catch(e => console.log("재생 시작 오류:", e));
  };

  const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
    if (!bibleData) return;
    
    if (window.navigator?.vibrate) window.navigator.vibrate(20);

    if (selectedVoice) {
      setVoiceType(selectedVoice);
      return;
    }

    const targetVoice = voiceType;
    const currentSrc = audioRef.current?.src || "";
    const isSameDate = currentSrc.includes(`reading_b${bibleData.bible_books?.book_order}_c${bibleData.chapter}`);
    const lastTime = isSameDate ? (audioRef.current?.currentTime || 0) : 0;

    setShowAudioControl(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }

    // 파일 경로 설정 (reading 폴더)
    const bookOrder = bibleData.bible_books?.book_order || '0';
    const fileName = `reading_b${bookOrder}_c${bibleData.chapter}_${targetVoice}.mp3`;
    const storagePath = `reading/${fileName}`;
    const { data: { publicUrl } } = supabase.storage.from('bible-assets').getPublicUrl(storagePath);

    try {
      const checkRes = await fetch(publicUrl, { method: 'HEAD' });
      
      // 1. 이미 파일이 있는 경우
      if (checkRes.ok) {
        const savedAudio = new Audio(publicUrl);
        setupAudioEvents(savedAudio, lastTime, true); // 서버 파일이므로 true 전달
        return;
      }

      // 2. 숫자 변환 및 텍스트 정제
      const toKorNum = (num: number | string) => {
        const n = Number(num);
        if (isNaN(n)) return String(num);
        const units = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
        const tens = ["", "십", "이십", "삼십", "사십", "오십", "육십", "칠십", "팔십", "구십"];
        if (n === 0) return "영";
        if (n < 10) return units[n];
        if (n < 100) return tens[Math.floor(n / 10)] + units[n % 10];
        return String(n);
      };

      // 절 번호 제거
      const mainContent = bibleData.content.replace(/\d+\.\s*/g, '');
      const unit = bibleData.bible_name === "시편" ? "편" : "장";
      const chapterKor = toKorNum(bibleData.chapter);
      // 순서 변경: 책 이름 + 장 먼저, 그 다음 말씀 내용 ('말씀' 제거)
      const textToSpeak = `${bibleData.bible_name} ${chapterKor}${unit}. ${mainContent}.`;

      // 3. Azure API 호출
      const AZURE_KEY = import.meta.env.VITE_AZURE_TTS_API_KEY;
      const AZURE_REGION = import.meta.env.VITE_AZURE_TTS_REGION;
      const azureVoice = targetVoice === 'F' ? "ko-KR-SoonBokNeural" : "ko-KR-BongJinNeural";

      const response = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        },
        body: `
          <speak version='1.0' xml:lang='ko-KR'>
            <voice xml:lang='ko-KR' name='${azureVoice}'>
              <prosody rate="1.0">${textToSpeak}</prosody>
            </voice>
          </speak>
        `,
      });

      if (!response.ok) throw new Error("API 호출 실패");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const ttsAudio = new Audio(audioUrl);
      
      // 4. 오디오 설정 및 재생 (TTS API이므로 false 전달)
      setupAudioEvents(ttsAudio, lastTime, false);

      // 스토리지 업로드
      supabase.storage.from('bible-assets').upload(storagePath, audioBlob, { 
        contentType: 'audio/mp3', 
        upsert: true 
      });

    } catch (error) {
      console.error("Azure TTS 에러:", error);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { 
        audioRef.current.pause(); 
        setIsPlaying(false); 
      } else { 
        audioRef.current.play(); 
        setIsPlaying(true); 
      }
    }
  };

  const handleCopy = () => {
    if (bibleData) {
      navigator.clipboard.writeText(cleanContent(bibleData.content));
      
      // 토스트 켜고 2초 뒤 끄기
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
      
      // 햅틱 반응
      if (window.navigator?.vibrate) window.navigator.vibrate(20);
    }
  };

  const handleShare = async () => {
    if (!bibleData) return;
    
    const unit = bibleData.bible_name === '시편' ? '편' : '장';
    const title = `${bibleData.bible_name} ${bibleData.chapter}${unit}`;
    
    // 절 번호 포함된 전체 내용
    const contentWithVerses = bibleData.content;
    
    const shareData = {
      title: title,
      text: `${title}\n\n${contentWithVerses}`,
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

  const handleReadComplete = async () => {
    // 폭죽 효과
    confetti({
      particleCount: 100, 
      spread: 70, 
      origin: { y: 0.8 }, 
      colors: ['#f897c4', '#88B04B', '#FFD700'] 
    });

    // 로그인 확인
    if (!user) {
      // 폭죽 후 메시지 표시
      setTimeout(() => {
        setShowLoginAlert(true);
        setTimeout(() => {
          setShowLoginAlert(false);
          setShowLoginModal(true); // 메시지 후 모달
        }, 3000);
      }, 500);
      return;
    }

    // 로그인 상태면 읽기 완료 기록 저장 (횟수 증가)
    if (bibleData) {
      try {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // user_reading_records에서 오늘 날짜 데이터 확인
        const { data: existing } = await supabase
          .from('user_reading_records')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle();
        
        if (existing) {
          // 이미 있으면 read_count만 증가
          await supabase
            .from('user_reading_records')
            .update({ 
              read_count: existing.read_count + 1, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existing.id);
        } else {
          // 없으면 새로 생성
          await supabase.from('user_reading_records').insert({
            user_id: user.id,
            date: dateStr,
            book_name: bibleData.bible_name,
            chapter: bibleData.chapter,
            start_verse: bibleData.verse || 1,
            end_verse: bibleData.verse || 1,
            read_count: 1,
          });
        }
        
        // 진행률 업데이트
        const key = `${bibleData.bible_name}_${bibleData.chapter}`;
        setReadingProgress(prev => ({ ...prev, [key]: 100 }));
        
        // 읽기 상태 다시 확인 (횟수 업데이트)
        await checkCurrentChapterReadStatus();
        
        // 읽기 완료 버튼 색상 변경
        setIsReadCompleted(true);
      } catch (error) {
        console.error('읽기 완료 저장 실패:', error);
      }
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
            {/* 오늘 날짜에만 NotebookPen 버튼 표시 */}
            {currentDate.toDateString() === today.toDateString() ? (
              <button
                onClick={() => {
                  setIsEditModalOpen(true);
                }}
                className="relative flex items-center justify-center p-1.5 rounded-full bg-[#4A6741] shadow-sm active:scale-95 transition-transform"
              >
                <motion.span
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: 9, ease: "circOut" }}
                  className="absolute inset-0 rounded-full bg-white"
                />
                <NotebookPen size={16} strokeWidth={1.5} className="relative z-10 text-white" />
              </button>
            ) : (
              <div className="w-[28px] h-[28px]" aria-hidden="true" />
            )}
          </div>
          <input type="date" ref={dateInputRef} onChange={handleDateChange} max={new Date().toISOString().split("T")[0]} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        <div className="absolute left-[-75%] w-[82%] max-w-sm h-[460px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
        <AnimatePresence mode="wait">
          <motion.div 
            key={bibleData?.id || bibleData?.chapter || currentDate.toISOString()}
            drag={user && rangePages.length === 0 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={user && rangePages.length === 0 ? onDragEnd : undefined}
            initial={{ opacity: 0, rotateY: -15, scale: 0.95 }} 
            animate={{ opacity: 1, rotateY: 0, scale: 1 }} 
            exit={{ opacity: 0, rotateY: 15, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={`w-[82%] max-w-sm h-auto min-h-[450px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-start justify-center px-8 py-6 text-left z-10 ${
              user && rangePages.length === 0 ? 'touch-none cursor-grab active:cursor-grabbing' : ''
            }`}
            style={{ perspective: 1000 }}
          >
            {bibleData ? (
              <>
                {/* 출처 영역 - 상단으로 이동 */}
                <span className="self-center text-center font-bold text-[#4A6741] opacity-60 mb-6" style={{ fontSize: `${fontSize * 0.9}px` }}>
                  {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse ? `${bibleData.verse}절` : ''}
                </span>

                {/* 말씀 본문 영역 - 높이 고정 및 스크롤 추가 */}
                <div className="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 text-zinc-800 leading-[1.5] break-keep font-medium" 
                     style={{ fontSize: `${fontSize}px`, maxHeight: "320px" }}>
                  {bibleData.content.split('\n').map((line: string, i: number) => {
                    // 정규식: 숫자(\d+) 뒤에 점(\.)이 있으면 무시하고 숫자와 나머지 텍스트만 가져옴
                    const match = line.match(/^(\d+)\.?\s*(.*)/);
                    
                    if (match) {
                      const [_, verseNum, textContent] = match;
                      const isCurrentVerse = isPlaying && i === currentVerseIndex;
                      return (
                        <p 
                          key={i} 
                          ref={(el) => verseRefs.current[i] = el}
                          className={`flex items-start gap-2 transition-colors duration-300 rounded-lg px-2 py-1 ${isCurrentVerse ? 'bg-[#4A6741]/10' : ''}`}
                        >
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
                <NotebookPen size={48} className="text-zinc-200" strokeWidth={1.5} />
                <p className="text-zinc-400 text-sm font-medium text-center">
                  우측 상단 � 버튼을 눌러<br />
                  읽을 범위를 선택해주세요
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm h-[460px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      <div className="flex items-center gap-8 mt-3 mb-14"> 
        <button onClick={() => handlePlayTTS()} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Headphones size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
      </div>

      <div className="flex items-center justify-center gap-8 pb-6">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { 
            if (rangePages.length > 0 && currentPageIdx > 0) { 
              const newIdx = currentPageIdx - 1; 
              setCurrentPageIdx(newIdx); 
              setBibleData(rangePages[newIdx]); 
            } 
          }}
          className={`${rangePages.length > 0 && currentPageIdx > 0 ? 'text-[#4A6741]' : 'text-zinc-300'} transition-colors p-2`}
        >
          <ChevronLeft size={32} strokeWidth={1.5} />
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.9 }} onClick={handleReadComplete}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
            ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-gray-400 border border-green-50'}`}
        >
          <Check className={`w-6 h-6 ${isReadCompleted ? 'text-white animate-pulse' : ''}`} strokeWidth={3} />
          <span className="font-bold" style={{ fontSize: `${fontSize * 0.85}px` }}>읽기완료</span>
          {user && readCount > 0 && (
            <span className="text-xs mt-0.5 opacity-80" style={{ fontSize: `${fontSize * 0.65}px` }}>
              {readCount}회
            </span>
          )}
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { 
            if (rangePages.length > 0 && currentPageIdx < rangePages.length - 1) { 
              const newIdx = currentPageIdx + 1; 
              setCurrentPageIdx(newIdx); 
              setBibleData(rangePages[newIdx]); 
            } 
          }}
          className={`${rangePages.length > 0 && currentPageIdx < rangePages.length - 1 ? 'text-[#4A6741]' : 'text-zinc-300'} transition-colors p-2`}
        >
          <ChevronRight size={32} strokeWidth={1.5} />
        </motion.button>
      </div>
<AnimatePresence>
  {isEditModalOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-[200] flex items-end justify-center"
      onClick={() => setIsEditModalOpen(false)}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full max-md:rounded-t-[32px] p-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 선택 상태 표시 및 클릭 가능한 인디케이터 */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* 시작 범위 */}
          <div className="flex items-center gap-1 bg-green-50 py-2 px-4 rounded-full text-[10px] font-bold text-[#4A6741]">
            <span className="opacity-60">시작:</span>
            {tempSelection.start_testament && (
              <button 
                onClick={() => { setSelectionPhase('start'); setSelectionStep('testament'); }}
                className="underline underline-offset-2 hover:text-[#4A6741]"
              >
                {tempSelection.start_testament}
              </button>
            )}
            {tempSelection.start_book && (
              <>
                〉
                <button 
                  onClick={() => { setSelectionPhase('start'); setSelectionStep('book'); }}
                  className="underline underline-offset-2 hover:text-[#4A6741]"
                >
                  {tempSelection.start_book}
                </button>
              </>
            )}
            {tempSelection.start_chapter > 0 && (
              <>
                〉
                <button 
                  onClick={() => { setSelectionPhase('start'); setSelectionStep('chapter'); loadChapters(tempSelection.start_book); }}
                  className="underline underline-offset-2 hover:text-[#4A6741]"
                >
                  {tempSelection.start_chapter}장
                </button>
              </>
            )}
          </div>

          {/* 종료 범위 */}
          {tempSelection.start_chapter > 0 && (
            <div className="flex items-center gap-1 bg-blue-50 py-2 px-4 rounded-full text-[10px] font-bold text-blue-700">
              <span className="opacity-60">종료:</span>
              {tempSelection.end_testament && (
                <button 
                  onClick={() => { setSelectionPhase('end'); setSelectionStep('testament'); }}
                  className="underline underline-offset-2 hover:text-blue-700"
                >
                  {tempSelection.end_testament}
                </button>
              )}
              {tempSelection.end_book && (
                <>
                  〉
                  <button 
                    onClick={() => { setSelectionPhase('end'); setSelectionStep('book'); }}
                    className="underline underline-offset-2 hover:text-blue-700"
                  >
                    {tempSelection.end_book}
                  </button>
                </>
              )}
              {tempSelection.end_chapter > 0 && (
                <>
                  〉
                  <button 
                    onClick={() => { setSelectionPhase('end'); setSelectionStep('chapter'); loadChapters(tempSelection.end_book); }}
                    className="underline underline-offset-2 hover:text-blue-700"
                  >
                    {tempSelection.end_chapter}장
                  </button>
                </>
              )}
            </div>
          )}

          {/* 다시 정하기 버튼 */}
          {(tempSelection.start_chapter > 0 || tempSelection.end_chapter > 0) && (
            <button
              onClick={() => {
                setTempSelection({
                  start_testament: '',
                  start_book: '',
                  start_chapter: 0,
                  end_testament: '',
                  end_book: '',
                  end_chapter: 0,
                });
                setSelectionPhase('start');
                setSelectionStep('testament');
                setRangePages([]);
                setBibleData(null);
              }}
              className="py-2 px-4 bg-red-50 text-red-600 rounded-full text-[10px] font-bold hover:bg-red-100"
            >
              다시 정하기
            </button>
          )}
        </div>

        {/* 단계별 제목 */}
        <h3 className="text-xl font-black mb-6 text-zinc-900">
          {selectionPhase === 'start' && '📖 시작 범위를 정해주세요'}
          {selectionPhase === 'end' && '📕 종료 범위를 정해주세요'}
        </h3>

        <h4 className="text-sm font-bold mb-3 text-zinc-500">
          {selectionStep === 'testament' && '구약 또는 신약을 선택하세요'}
          {selectionStep === 'book' && '권을 선택하세요'}
          {selectionStep === 'chapter' && '장을 선택하세요'}
        </h4>

        <div className="grid grid-cols-4 gap-2">
          {/* 신약/구약 선택 */}
          {selectionStep === 'testament' &&
            ['구약', '신약'].map(t => {
              // 구약/신약 전체 진행률 계산 (모든 책 포함)
              const testamentBooks = BIBLE_BOOKS[t as '구약' | '신약'] || [];
              let totalProgress = 0;
              
              testamentBooks.forEach(book => {
                const bookProgress = readingProgress[`${book}_total`];
                // 읽기 이력이 없는 책은 0%로 계산
                totalProgress += (bookProgress || 0);
              });
              
              // 소숫점 1자리까지 계산 (전체 책 수로 나눔)
              const avgProgress = testamentBooks.length > 0
                ? Math.round((totalProgress / testamentBooks.length) * 10) / 10 
                : 0;
              const hasProgress = user && avgProgress > 0;
              
              return (
                <button
                  key={t}
                  onClick={() => { 
                    if (selectionPhase === 'start') {
                      setTempSelection(p => ({ ...p, start_testament: t }));
                    } else {
                      setTempSelection(p => ({ ...p, end_testament: t }));
                    }
                    setSelectionStep('book');
                  }}
                  className={`py-5 rounded-2xl font-bold col-span-4 text-lg ${
                    hasProgress
                      ? 'bg-green-100 text-[#4A6741] border-2 border-green-300 hover:bg-green-200'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{t}</span>
                    {user && (
                      <span className={`text-xs font-bold ${
                        hasProgress ? 'text-[#4A6741]' : 'text-zinc-400'
                      }`}>
                        {avgProgress}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

          {/* 권 선택 */}
          {selectionStep === 'book' && (() => {
            const testament = selectionPhase === 'start' ? tempSelection.start_testament : tempSelection.end_testament;
            const startBookOrder = tempSelection.start_book ? bookOrderMap[tempSelection.start_book] : null;
            
            return BIBLE_BOOKS[testament as '구약' | '신약']?.map(b => {
              const bookProgress = readingProgress[`${b}_total`];
              const displayProgress = bookProgress !== undefined ? bookProgress : 0;
              const hasProgress = displayProgress > 0;
              
              // 종료 범위 선택 시 시작 권보다 앞에 있는 권은 비활성화
              const currentBookOrder = bookOrderMap[b];
              const isDisabled = selectionPhase === 'end' && startBookOrder !== null && 
                                 currentBookOrder < startBookOrder;
              
              return (
                <button
                  key={b}
                  disabled={isDisabled}
                  onClick={() => loadChapters(b)}
                  className={`py-3 rounded-xl text-sm font-bold relative ${
                    isDisabled
                      ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                      : hasProgress 
                      ? 'bg-green-100 text-[#4A6741] border-2 border-green-300 hover:bg-green-200' 
                      : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{b}</span>
                    {user && !isDisabled && (
                      <span className={`text-[9px] font-bold ${
                        hasProgress ? 'text-[#4A6741]' : 'text-zinc-400'
                      }`}>
                        {displayProgress}%
                      </span>
                    )}
                  </div>
                </button>
              );
            });
          })()}

          {/* 장 선택 */}
          {selectionStep === 'chapter' &&
            availableChapters.map(ch => {
              const currentBook = selectionPhase === 'start' ? tempSelection.start_book : tempSelection.end_book;
              const progressKey = `${currentBook}_${ch}`;
              const readCount = readingProgress[progressKey] || 0;
              const hasBeenRead = readCount > 0;
              
              // 종료 범위 선택 시 시작 장보다 작은 장은 비활성화
              const isDisabled = selectionPhase === 'end' && 
                                 tempSelection.start_book === tempSelection.end_book && 
                                 ch < tempSelection.start_chapter;
              
              return (
                <button
                  key={ch}
                  disabled={isDisabled}
                  onClick={() => {
                    if (selectionPhase === 'start') {
                      setTempSelection(p => ({ 
                        ...p, 
                        start_chapter: ch,
                      }));
                      setSelectionPhase('end');
                      setSelectionStep('testament');
                    } else {
                      // 종료 범위 선택 완료 -> 즉시 성경 본문 로드
                      const updatedSelection = {
                        ...tempSelection,
                        end_chapter: ch
                      };
                      setTempSelection(updatedSelection);
                      // 업데이트된 값으로 직접 로드
                      loadRangePagesWithSelection(updatedSelection);
                    }
                  }}
                  className={`py-3 rounded-xl font-bold relative overflow-hidden transition-all ${
                    isDisabled
                      ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                      : hasBeenRead
                      ? 'bg-green-100 text-[#4A6741] border-2 border-green-300 hover:bg-green-200'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{ch}</span>
                    {user && hasBeenRead && !isDisabled && (
                      <span className="text-[9px] text-[#4A6741] font-bold">{readCount}회</span>
                    )}
                  </div>
                  
                  {hasBeenRead && !isDisabled && <Check size={12} className="absolute top-0.5 right-0.5 text-[#4A6741]" />}
                </button>
              );
            })}
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

      {/* 로그인 모달 */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />


      {/* 말씀 복사 토스트 */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div 
            initial={{ opacity: 0, x: "-50%", y: 20 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            말씀이 복사되었습니다
          </motion.div>
        )}
      </AnimatePresence>

      {/* 범위 선택 완료 토스트 */}
      <AnimatePresence>
        {showRangeToast && (
          <motion.div 
            initial={{ opacity: 0, x: "-50%", y: 20 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            {rangeToastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로그인 안내 토스트 */}
      <AnimatePresence>
        {showLoginAlert && (
          <motion.div 
            initial={{ opacity: 0, x: "-50%", y: 20 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium text-center whitespace-nowrap"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            로그인하시면 읽은 말씀을 기록하고 관리할 수 있습니다!
          </motion.div>
        )}
      </AnimatePresence>

      {/* TTS 컨트롤 (재생바 추가) */}
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
                <button onClick={() => { if(audioRef.current) audioRef.current.pause(); setShowAudioControl(false); setIsPlaying(false); setCurrentTime(0); setDuration(0); }}><X size={20}/></button>
              </div>
              
              {/* 재생바 및 시간 (서버 파일일 때만 표시) */}
              {isFromServer && duration > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
                    <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => {
                      const newTime = Number(e.target.value);
                      setCurrentTime(newTime);
                      if (audioRef.current) {
                        audioRef.current.currentTime = newTime;
                      }
                    }}
                    className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, white 0%, white ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                </div>
              )}
              
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
