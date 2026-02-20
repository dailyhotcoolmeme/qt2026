import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import confetti from 'canvas-confetti';
import { 
  Heart, Headphones, BookHeadphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Check, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Pencil, NotebookPen,
  BookX, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import { BIBLE_BOOKS as BOOK_CHAPTERS } from "../lib/bibleData";
import { fetchMyGroups, linkPersonalActivityToGroup } from "../lib/group-activity";
import { BibleAudioPlayerModal } from "../components/BibleAudioPlayerModal";
import {
  findCurrentVerse,
  getCachedAudioObjectUrl,
  loadChapterAudioMetadata,
  parseVerseRange,
  parseVerses,
} from "../lib/bibleAudio";

export default function ReadingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null); 
  const { user, isLoading: isAuthLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [myGroups, setMyGroups] = useState<{ id: string; name: string }[]>([]);
  const [showGroupLinkPrompt, setShowGroupLinkPrompt] = useState(false);
  const [showGroupLinkModal, setShowGroupLinkModal] = useState(false);
  const [pendingGroupLinkSourceRowId, setPendingGroupLinkSourceRowId] = useState<string | null>(null);
  const [pendingGroupLinkLabel, setPendingGroupLinkLabel] = useState("");
  const [linkingGroupId, setLinkingGroupId] = useState<string | null>(null);
  
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
      "창세기", "출애굽기", "레위기", "민수기", "신명기", "여호수아", "사사기", "룻기", 
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<any>(null);
  const [rangePages, setRangePages] = useState<any[]>([]); 
  const [currentPageIdx, setCurrentPageIdx] = useState(0);

  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showRangeToast, setShowRangeToast] = useState(false);
  const [rangeToastMessage, setRangeToastMessage] = useState('');
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [showCancelToast, setShowCancelToast] = useState(false);
  const [noReadingForDate, setNoReadingForDate] = useState(false);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioSubtitle, setAudioSubtitle] = useState("");
  const [currentVerseNumber, setCurrentVerseNumber] = useState<number | null>(null);
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(true);
  const [isFromServer, setIsFromServer] = useState(false);
  const [audioControlY, setAudioControlY] = useState(0); // 재생 팝업 Y 위치
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const verseNumberRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
  const audioEndMsRef = useRef<number | null>(null);
  const audioMetaRef = useRef<any | null>(null);
  const audioVerseStartRef = useRef<number | null>(null);
  const audioVerseEndRef = useRef<number | null>(null);
  const audioPlayingChapterIdxRef = useRef<number>(0);
  const audioObjectUrlRef = useRef<string | null>(null);
  const scrollResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPageIdxRef = useRef<number>(0);  // 현재 인덱스를 ref로도 관리
  const previousDateRef = useRef<string>(new Date().toDateString());
  
  // 재생 방식 선택 및 전체 재생 모드 관련 상태
  const [showPlayModePopup, setShowPlayModePopup] = useState(false);
  const [isContinuousPlayMode, setIsContinuousPlayMode] = useState(false);
  const nextChapterAudioCache = useRef<HTMLAudioElement | null>(null);

  // 롱프레스로 읽기 완료 취소 관련 상태
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartTimeRef = useRef<number>(0);
  const longPressAnimationRef = useRef<number | null>(null);
  const readCompleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const isLongPressingRef = useRef(false);
  const longPressCancelledRef = useRef(false);
  const pressStartedRef = useRef(false); // handleStart 실행 여부 확인용

  const { fontSize = 16 } = useDisplaySettings();

  // currentPageIdx 상태와 ref 동기화
  useEffect(() => {
    currentPageIdxRef.current = currentPageIdx;
  }, [currentPageIdx]);

  // bibleData 변경 시 verseRefs 초기화 (스크롤 싱크 수정)
  useEffect(() => {
    verseRefs.current = [];
  }, [bibleData]);

  const parsedVerses = useMemo(() => parseVerses(bibleData?.content || ""), [bibleData?.content]);

  const markUserScroll = () => {
    setAutoFollowEnabled(false);
    if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current);
    scrollResumeTimerRef.current = setTimeout(() => setAutoFollowEnabled(true), 900);
  };

  useEffect(() => {
    if (!autoFollowEnabled || !currentVerseNumber) return;
    const row = verseNumberRefs.current[currentVerseNumber];
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentVerseNumber, autoFollowEnabled]);

  useEffect(() => {
    return () => {
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
      if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current);
    };
  }, []);



  // 재생 팝업 드래그 핸들러
  const handleDragStart = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY - audioControlY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newY = e.clientY - dragStartY;
    // 화면 경계 체크 (상단 80px, 하단 200px 여유)
    const minY = -200;
    const maxY = window.innerHeight - 350;
    setAudioControlY(Math.max(minY, Math.min(newY, maxY)));
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

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
const loadDailyVerse = async (date: Date, options?: { forceTodayRestore?: boolean }) => {
  // 로그인하지 않았으면 실행 안 함
  if (!user) return;
  
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const forceTodayRestore = Boolean(options?.forceTodayRestore);
  
  console.log('loadDailyVerse 호출:', date.toISOString().split('T')[0], 'isToday:', isToday);
  
  // 오늘 날짜이고 rangePages가 비어있으면 localStorage 복원
  if (isToday && (rangePages.length === 0 || forceTodayRestore)) {
    const savedPages = localStorage.getItem('reading_pages');
    const savedDate = localStorage.getItem('reading_date');
    const savedIdx = localStorage.getItem('reading_page_idx');
    
    // 날짜 확인: 저장된 날짜가 오늘이 아니면 무시
    const todayStr = today.toISOString().split('T')[0];
    if (savedPages && savedDate === todayStr) {
      try {
        const pages = JSON.parse(savedPages);
        const idx = Number(savedIdx) || 0;
        
        console.log('localStorage 복원:', pages.length, '페이지');
        
        setRangePages(pages);
        setCurrentPageIdx(idx);
        if (pages[idx]) {
          setBibleData(pages[idx]);
        }
        return;
      } catch (e) {
        console.error('복원 실패:', e);
      }
    } else if (savedDate && savedDate !== todayStr) {
      // 날짜가 다르면 localStorage 삭제
      console.log('localStorage 날짜 불일치, 삭제');
      localStorage.removeItem('reading_pages');
      localStorage.removeItem('reading_date');
      localStorage.removeItem('reading_page_idx');
      if (forceTodayRestore) {
        setRangePages([]);
        setCurrentPageIdx(0);
        setBibleData(null);
      }
    } else if (forceTodayRestore) {
      setRangePages([]);
      setCurrentPageIdx(0);
      setBibleData(null);
    }
  }
  
  // 오늘 날짜면 아무것도 안 함 (rangePages 유지)
  if (isToday) {
    console.log('오늘 날짜, rangePages 유지');
    // 상태 초기화
    setIsLoadingVerse(false);
    if (rangePages.length === 0) {
      setNoReadingForDate(false);
    }
    return;
  }
  
  // 과거 날짜만 서버에서 로드
  console.log('과거 날짜, 서버에서 로드');
  setIsLoadingVerse(true);
  setNoReadingForDate(false);
  
  const dateStr = date.toISOString().split('T')[0];
  
  // 해당 날짜의 모든 읽은 장을 가져옵니다
  const { data: records, error } = await supabase
    .from('user_reading_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', dateStr)
    .order('updated_at', { ascending: true });
  
  if (records && records.length > 0) {
    // 모든 읽은 장을 rangePages로 변환 (성경 순서대로 정렬)
    const pages = [];
    
    // 먼저 bible_books에서 book_order를 가져와서 정렬
    const bookOrders: Record<string, number> = {};
    for (const record of records) {
      if (!bookOrders[record.book_name]) {
        const { data: bookInfo } = await supabase
          .from('bible_books')
          .select('book_order')
          .eq('book_name', record.book_name)
          .single();
        
        if (bookInfo) {
          bookOrders[record.book_name] = bookInfo.book_order;
        }
      }
    }
    
    // book_order로 정렬
    const sortedRecords = [...records].sort((a, b) => {
      const orderA = bookOrders[a.book_name] || 0;
      const orderB = bookOrders[b.book_name] || 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.chapter - b.chapter;
    });
    
    for (const record of sortedRecords) {
      // bible_books 정보 별도 조회
      const { data: bookInfo } = await supabase
        .from('bible_books')
        .select('*')
        .eq('book_name', record.book_name)
        .single();
      
      // 절 번호와 함께 포맷팅
      const { data: verses } = await supabase
        .from('bible_verses')
        .select('*')
        .eq('book_name', record.book_name)
        .eq('chapter', record.chapter)
        .gte('verse', record.start_verse || 1)
        .lte('verse', record.end_verse || 999)
        .order('verse', { ascending: true });
      
      if (verses && verses.length > 0) {
        const formattedContent = verses.map(v => `${v.verse}. ${v.content}`).join('\n');
        const hasVerseRange = typeof record.start_verse === 'number' && typeof record.end_verse === 'number';
        const verseLabel = hasVerseRange
          ? (record.start_verse === record.end_verse
            ? `${record.start_verse}`
            : `${record.start_verse}-${record.end_verse}`)
          : undefined;
        
        pages.push({
          id: record.id,
          bible_name: record.book_name,
          chapter: record.chapter,
          verse: verseLabel,
          content: formattedContent,
          bible_books: bookInfo || { book_order: 0 },
        });
      }
    }
    
    if (pages.length > 0) {
      setRangePages(pages);
      setCurrentPageIdx(0);
      setBibleData(pages[0]);
      setNoReadingForDate(false);
    } else {
      setBibleData(null);
      setNoReadingForDate(true);
    }
    setIsLoadingVerse(false);
  } else if (!error) {
    setBibleData(null);
    setRangePages([]);
    setNoReadingForDate(true);
    setIsLoadingVerse(false);
  } else {
    console.error('말씀 로드 실패:', error);
    setBibleData(null);
    setRangePages([]);
    setIsLoadingVerse(false);
  }
};

// 로그인한 회원의 경우 날짜별 말씀 로드
useEffect(() => {
  // 초기화 완료 후에만 실행
  if (!isInitialized) return;
  
  const today = new Date();
  const todayKey = today.toDateString();
  const currentKey = currentDate.toDateString();
  const isToday = currentKey === todayKey;
  const wasToday = previousDateRef.current === todayKey;
  let forceTodayRestore = false;
  
  // 오늘이 아닌 경우만 화면 클리어
  if (!isToday) {
    setRangePages([]);
    setBibleData(null);
  } else if (!wasToday) {
    setRangePages([]);
    setBibleData(null);
    forceTodayRestore = true;
  }
  
  previousDateRef.current = currentKey;

  if (user) {
    loadDailyVerse(currentDate, { forceTodayRestore });
  }
}, [user, currentDate, isInitialized]);

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
    const savedDate = localStorage.getItem('reading_date');
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (savedSelection) {
      try {
        const selection = JSON.parse(savedSelection);
        setTempSelection(selection);
      } catch (e) {
        console.error('상태 복원 실패:', e);
      }
    }
    
    // 복원 완료 표시
    if (savedPages && savedDate === todayStr) {
      try {
        const pages = JSON.parse(savedPages);
        const idx = Number(savedIdx) || 0;

        setRangePages(pages);
        setCurrentPageIdx(idx);
        if (pages[idx]) {
          setBibleData(pages[idx]);
        }
      } catch (e) {
        console.error('state restore failed:', e);
      }
    } else if (savedPages && savedDate !== todayStr) {
      localStorage.removeItem('reading_pages');
      localStorage.removeItem('reading_date');
      localStorage.removeItem('reading_page_idx');
    }

    setIsInitialized(true);
  }, []);

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    if (tempSelection.start_chapter > 0) {
      localStorage.setItem('reading_selection', JSON.stringify(tempSelection));
    }
  }, [tempSelection]);

  useEffect(() => {
    if (rangePages.length > 0) {
      const today = new Date();
      const isToday = currentDate.toDateString() === today.toDateString();
      
      // 오늘 날짜일 때만 localStorage에 저장
      if (isToday) {
        const todayStr = today.toISOString().split('T')[0];
        localStorage.setItem('reading_pages', JSON.stringify(rangePages));
        localStorage.setItem('reading_date', todayStr);
        localStorage.setItem('reading_page_idx', String(currentPageIdx));
        console.log('localStorage 저장:', todayStr, rangePages.length, '페이지');
      }
      
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
  console.log('loadChapters 호출됨:', book, 'selectionPhase:', selectionPhase);
  
  if (selectionPhase === 'start') {
    setTempSelection(p => ({ ...p, start_book: book }));
  } else {
    setTempSelection(p => ({ ...p, end_book: book }));
  }

  // lib/bibleData.ts에서 정확한 장 수 가져오기
  const bookInfo = BOOK_CHAPTERS.find(b => b.name === book);
  
  console.log('bookInfo:', bookInfo);

  if (bookInfo && bookInfo.chapters) {
    // 1부터 chapters까지 배열 생성
    const chapters = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);
    setAvailableChapters(chapters);
    
    console.log('장 목록 설정:', chapters.length, '개');
    
    // 먼저 장 선택 화면으로 전환
    setSelectionStep('chapter');
    
    // 로그인 상태면 읽기 진행률 백그라운드로 불러오기
    if (user) {
      loadReadingProgress(book, chapters);
    }
  } else {
    console.error('책 정보를 찾을 수 없습니다:', book);
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
    .eq('chapter', bibleData.chapter)
    .maybeSingle();
  
  const totalCount = data?.read_count || 0;
  setReadCount(totalCount);
  
  // 읽기 완료 상태 설정 (한 번이라도 읽었으면 true)
  setIsReadCompleted(totalCount > 0);
};

const loadLastReadChapter = async () => {
  if (!user || rangePages.length === 0) return;
  
  const { data } = await supabase
    .from('user_reading_records')
    .select('book_name, chapter, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
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
  setNoReadingForDate(false);
  
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

  const setupAudioEvents = (audio: HTMLAudioElement, startTime: number, fromServer = false, isContinuous = false, currentIdx = 0) => {
    audioRef.current = audio;
    audio.currentTime = startTime;
    
    // 현재 장 데이터 캡처 (클로저로 인한 stale state 방지)
    const currentChapterData = rangePages[currentIdx] || bibleData;
    
    // 서버 파일일 때 duration 및 진행 상태 업데이트
    setIsFromServer(fromServer);
    
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
      
      // 전체 재생 모드일 때 다음 장 미리 로드
      if (isContinuous && rangePages.length > 0 && currentIdx < rangePages.length - 1) {
        const nextChapter = rangePages[currentIdx + 1];
        preloadNextChapterAudio(nextChapter);
      }
    };
    
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      
      // 음성 싱크: 절별 스크롤 (하이라이트 제거)
      if (verseRefs.current.length > 0 && audio.duration > 0) {
        const totalVerses = verseRefs.current.length;
        const estimatedVerseIndex = Math.floor((audio.currentTime / audio.duration) * totalVerses);
        const clampedIndex = Math.min(estimatedVerseIndex, totalVerses - 1);
        
        if (clampedIndex !== currentVerseIndex && verseRefs.current[clampedIndex]) {
          setCurrentVerseIndex(clampedIndex);
          // 스크롤만 수행 (하이라이트 제거)
          verseRefs.current[clampedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    
    audio.onended = async () => {
      // 자동 읽기 완료 처리 (전체 재생 모드에서는 조용히 처리)
      // 현재 장 데이터를 전달하여 올바른 장에 기록
      await handleReadComplete(isContinuous, currentChapterData);
      
      // 전체 재생 모드일 때 다음 장으로 자동 이동
      if (isContinuous && rangePages.length > 0 && currentIdx < rangePages.length - 1) {
        const nextIdx = currentIdx + 1;
        const nextChapterData = rangePages[nextIdx];
        currentPageIdxRef.current = nextIdx;
        setCurrentPageIdx(nextIdx);
        setBibleData(nextChapterData);
        
        // \ub2e4\uc74c \uc7a5 \ub370\uc774\ud130\ub97c \uc9c1\uc811 \uc804\ub2ec\ud558\uc5ec \uc7ac\uc0dd
        setTimeout(() => {
          playNextChapterInContinuousMode(nextChapterData, nextIdx);
        }, 500);
      } else {
        // \uc804\uccb4 \uc7ac\uc0dd \uc885\ub8cc
        setIsPlaying(false);
        setShowAudioControl(false);
        setCurrentTime(0);
        setDuration(0);
        setIsContinuousPlayMode(false);
        audioRef.current = null;
      }
    };
    
    setShowAudioControl(true);
    setIsPlaying(true);
    // play()는 여기서 호출하지 않음 - R2 파일 loadeddata에서만 호출
    if (!fromServer) {
      // TTS 생성된 파일만 즉시 재생
      audio.play().catch(e => console.log("재생 시작 오류:", e));
    }
  };

  const handlePlayTTS = async (selectedVoice?: 'F' | 'M', skipPopup = false, isContinuous = false) => {
    if (!bibleData) return;
    
    if (window.navigator?.vibrate) window.navigator.vibrate(20);

    if (selectedVoice) {
      setVoiceType(selectedVoice);
      return;
    }
    
    // 2개 장 이상일 때 재생 방식 선택 팝업
    if (!skipPopup && rangePages.length > 1) {
      setShowPlayModePopup(true);
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
    const fileName = `reading/reading_b${bookOrder}_c${bibleData.chapter}_${targetVoice}.mp3`;

    try {
      // 1. R2에서 파일 직접 로드 시도
      const publicUrl = `https://pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev/${fileName}`;
      const savedAudio = new Audio(publicUrl);
      
      let errorOccurred = false;
      
      // 즉시 UI 표시
      audioRef.current = savedAudio;
      savedAudio.currentTime = lastTime;
      setShowAudioControl(true);
      setIsFromServer(true);
      
      // 오디오 이벤트 설정
      savedAudio.onloadedmetadata = () => {
        if (!errorOccurred) {
          setDuration(savedAudio.duration);
          // 전체 재생 모드일 때 다음 장 미리 로드
          if (isContinuous && rangePages.length > 0 && currentPageIdx < rangePages.length - 1) {
            const nextChapter = rangePages[currentPageIdx + 1];
            preloadNextChapterAudio(nextChapter);
          }
        }
      };
      
      savedAudio.ontimeupdate = () => {
        if (!errorOccurred) {
          setCurrentTime(savedAudio.currentTime);
          // 음성 싱크: 절별 스크롤
          if (verseRefs.current.length > 0 && savedAudio.duration > 0) {
            const totalVerses = verseRefs.current.length;
            const estimatedVerseIndex = Math.floor((savedAudio.currentTime / savedAudio.duration) * totalVerses);
            const clampedIndex = Math.min(estimatedVerseIndex, totalVerses - 1);
            if (clampedIndex !== currentVerseIndex && verseRefs.current[clampedIndex]) {
              setCurrentVerseIndex(clampedIndex);
              verseRefs.current[clampedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      };
      
      savedAudio.onended = async () => {
        if (!errorOccurred) {
          const currentChapterData = rangePages[currentPageIdx] || bibleData;
          await handleReadComplete(isContinuous, currentChapterData);
          
          if (isContinuous && rangePages.length > 0 && currentPageIdx < rangePages.length - 1) {
            const nextIdx = currentPageIdx + 1;
            const nextChapterData = rangePages[nextIdx];
            currentPageIdxRef.current = nextIdx;
            setCurrentPageIdx(nextIdx);
            setBibleData(nextChapterData);
            setTimeout(() => {
              playNextChapterInContinuousMode(nextChapterData, nextIdx);
            }, 500);
          } else {
            setIsPlaying(false);
            setShowAudioControl(false);
            setCurrentTime(0);
            setDuration(0);
            setIsContinuousPlayMode(false);
            audioRef.current = null;
          }
        }
      };
      
      // 에러 핸들러 정의
      const errorHandler = async (e: Event) => {
        if (errorOccurred) return;
        errorOccurred = true;
        console.log('[Audio] R2 파일 없음, TTS 생성 시작');
        
        // UI 숨기고 오디오 정리
        setShowAudioControl(false);
        setIsPlaying(false);
        audioRef.current = null;
        savedAudio.onloadedmetadata = null;
        savedAudio.ontimeupdate = null;
        savedAudio.onended = null;
        
        // TTS 생성
        await generateAndUploadTTS();
      };
      
      // 파일이 로드되면 재생 시작
      savedAudio.addEventListener('loadeddata', () => {
        if (!errorOccurred) {
          savedAudio.removeEventListener('error', errorHandler); // error 리스너 제거
          console.log('[Audio] R2 파일 로드 성공');
          setIsPlaying(true);
          savedAudio.play().catch(e => console.log('재생 시작 오류:', e));
        }
      }, { once: true });
      
      // 파일이 없으면 TTS 생성
      savedAudio.addEventListener('error', errorHandler, { once: true });
      
      return;
      
    } catch (error) {
      console.error("Audio 재생 에러:", error);
      setIsPlaying(false);
    }
    
    // TTS 생성 및 업로드 함수
    async function generateAndUploadTTS() {
      try {
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
          "X-Microsoft-OutputFormat": "audio-16khz-64kbitrate-mono-mp3",
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
      
      // 4. 오디오 설정 및 재생
      setupAudioEvents(ttsAudio, lastTime, false, isContinuous, currentPageIdx);

      // R2 업로드 (백그라운드)
      (async () => {
        try {
          console.log('[R2 Upload] Uploading:', fileName);
          // 1. Presigned URL 받기
          const urlRes = await fetch('/api/audio/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName })
          });
          const { uploadUrl, publicUrl } = await urlRes.json();
          
          // 2. 직접 R2에 업로드
          await fetch(uploadUrl, {
            method: 'PUT',
            body: audioBlob,
            headers: { 'Content-Type': 'audio/mp3' }
          });
          
          console.log('[R2 Upload] ✅ Success! URL:', publicUrl);
        } catch (error) {
          console.error('[R2 Upload] ❌ Failed:', error);
        }
      })();

      } catch (error) {
        console.error("Azure TTS 에러:", error);
        setIsPlaying(false);
      }
    }
  };

  const closeAudioModal = () => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    setShowAudioControl(false);
    setAudioLoading(false);
    setCurrentTime(0);
    setDuration(0);
    audioEndMsRef.current = null;
  };

  const seekAudioFromModal = (nextTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const getPlayableVerseNumbers = () => {
    const minVerse = audioVerseStartRef.current ?? 1;
    const maxVerse = audioVerseEndRef.current ?? Number.MAX_SAFE_INTEGER;
    const fromText = parsedVerses
      .map((v) => v.verse)
      .filter((v) => v >= minVerse && v <= maxVerse);
    if (fromText.length > 0) return fromText;
    const fromMeta = (audioMetaRef.current?.verses || [])
      .map((v: any) => Number(v.verse))
      .filter((v: number) => Number.isFinite(v) && v >= minVerse && v <= maxVerse);
    return fromMeta;
  };

  const estimateCurrentVerseByProgress = () => {
    const verses = getPlayableVerseNumbers();
    if (!verses.length || !audioRef.current) return null;
    const dur = audioRef.current.duration || duration || 0;
    if (!dur || dur <= 0) return verses[0];
    const ratio = Math.max(0, Math.min(0.999, audioRef.current.currentTime / dur));
    const idx = Math.min(verses.length - 1, Math.floor(ratio * verses.length));
    return verses[idx];
  };

  const seekToVerse = (targetVerse: number) => {
    const meta = audioMetaRef.current;
    if (!audioRef.current) return;
    const rows = meta?.verses || [];
    const row =
      rows.find((v: any) => v.verse === targetVerse) ??
      rows.find((v: any) => v.verse > targetVerse) ??
      [...rows].reverse().find((v: any) => v.verse < targetVerse) ??
      null;
    if (row && Number.isFinite(row.start_ms)) {
      const sec = Math.max(0, row.start_ms / 1000);
      audioRef.current.currentTime = sec;
      setCurrentTime(sec);
      setCurrentVerseNumber(Number(row.verse));
      return;
    }

    const verses = getPlayableVerseNumbers();
    if (!verses.length) return;
    const foundIdx = verses.findIndex((v) => v >= targetVerse);
    const targetIdx = foundIdx === -1 ? verses.length - 1 : foundIdx;
    const dur = audioRef.current.duration || duration || 0;
    if (dur > 0) {
      const sec = (targetIdx / Math.max(1, verses.length)) * dur;
      audioRef.current.currentTime = sec;
      setCurrentTime(sec);
    }
    setCurrentVerseNumber(verses[targetIdx]);
  };

  const jumpPrevVerse = () => {
    const current = currentVerseNumber ?? estimateCurrentVerseByProgress();
    if (!current) return;
    const minVerse = audioVerseStartRef.current ?? 1;
    seekToVerse(Math.max(minVerse, current - 1));
  };

  const jumpNextVerse = () => {
    const current = currentVerseNumber ?? estimateCurrentVerseByProgress();
    if (!current) return;
    const maxVerse = audioVerseEndRef.current ?? Number.MAX_SAFE_INTEGER;
    seekToVerse(Math.min(maxVerse, current + 1));
  };

  const handlePlayServerAudio = async (opts?: {
    continuous?: boolean;
    chapterData?: any;
    chapterIdx?: number;
    skipSelector?: boolean;
  }) => {
    const continuous = opts?.continuous ?? false;
    const chapterData = opts?.chapterData ?? bibleData;
    const chapterIdx = opts?.chapterIdx ?? currentPageIdx;

    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }
    if (!chapterData) return;

    if (!opts?.skipSelector && rangePages.length > 1) {
      setShowPlayModePopup(true);
      return;
    }

    const bookId = Number(chapterData?.bible_books?.book_order || 0);
    const chapter = Number(chapterData?.chapter || 0);
    if (!bookId || !chapter) return;

    setIsContinuousPlayMode(continuous);
    audioPlayingChapterIdxRef.current = chapterIdx;

    try {
      setShowAudioControl(true);
      setAudioLoading(true);
      setAudioSubtitle("\uC624\uB514\uC624 \uC900\uBE44 \uC911...");

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      const testament = bookId <= 39 ? "OT" : "NT";
      const metadata = await loadChapterAudioMetadata(bookId, chapter, testament);
      if (!metadata) throw new Error("audio metadata not found");
      audioMetaRef.current = metadata;
      const objectUrl = await getCachedAudioObjectUrl(metadata.audioUrl);
      if (audioObjectUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = objectUrl;

      const audio = new Audio(objectUrl);
      audio.preload = "auto";
      audioRef.current = audio;

      const verseRange = parseVerseRange(chapterData?.verse);
      const rangeStart = verseRange
        ? metadata.verses.find((v) => v.verse === verseRange.start) ??
          metadata.verses.find((v) => v.verse > verseRange.start) ??
          null
        : null;
      const rangeEnd = verseRange
        ? [...metadata.verses].reverse().find((v) => v.verse === verseRange.end) ??
          [...metadata.verses].reverse().find((v) => v.verse < verseRange.end) ??
          null
        : null;
      let startMs = rangeStart?.start_ms ?? 0;
      let endMs = rangeEnd?.end_ms ?? metadata.durationMs;
      if (rangeStart && Number.isFinite(startMs)) {
        startMs = Math.max(0, startMs - 120);
      }
      let approxStartRatio: number | null = null;
      let approxEndRatio: number | null = null;
      if (verseRange && metadata.verses.length === 0) {
        const parsed = parseVerses(chapterData?.content || "");
        const parsedMaxVerse = parsed.reduce((max, row) => Math.max(max, row.verse), 0);
        const totalVerses = Math.max(verseRange.end, parsedMaxVerse, parsed.length || 0);
        approxStartRatio = Math.min(1, Math.max(0, (verseRange.start - 1) / Math.max(1, totalVerses)));
        approxEndRatio = Math.min(1, verseRange.end / Math.max(1, totalVerses));
        startMs = Math.round((metadata.durationMs || 0) * approxStartRatio);
        endMs = Math.round((metadata.durationMs || 0) * approxEndRatio);
      }
      audioEndMsRef.current = endMs > 0 ? endMs : null;
      audioVerseStartRef.current = verseRange?.start ?? metadata.verses?.[0]?.verse ?? 1;
      audioVerseEndRef.current = verseRange?.end ?? metadata.verses?.[metadata.verses.length - 1]?.verse ?? Number.MAX_SAFE_INTEGER;

      setAudioSubtitle(
        verseRange
          ? `${chapterData.bible_name} ${chapter}\uC7A5 ${verseRange.start}-${verseRange.end}\uC808`
          : `${chapterData.bible_name} ${chapter}\uC7A5`
      );

      let endedHandled = false;
      const finishCurrentChapter = async () => {
        if (endedHandled) return;
        endedHandled = true;
        setIsPlaying(false);
        if (continuous && chapterIdx < rangePages.length - 1) {
          await handleReadComplete(true, chapterData);
          const nextIdx = chapterIdx + 1;
          const nextChapter = rangePages[nextIdx];
          setCurrentPageIdx(nextIdx);
          currentPageIdxRef.current = nextIdx;
          setBibleData(nextChapter);
          await handlePlayServerAudio({
            continuous: true,
            chapterData: nextChapter,
            chapterIdx: nextIdx,
            skipSelector: true,
          });
        } else if (continuous) {
          await handleReadComplete(true, chapterData);
          setShowAudioControl(false);
          setCurrentTime(0);
          setDuration(0);
        }
      };

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || metadata.durationMs / 1000);
        if (verseRange && metadata.verses.length === 0 && approxStartRatio !== null && approxEndRatio !== null && audio.duration > 0) {
          const byDurationStart = Math.round(audio.duration * 1000 * approxStartRatio);
          const byDurationEnd = Math.round(audio.duration * 1000 * approxEndRatio);
          startMs = byDurationStart;
          endMs = byDurationEnd;
          audioEndMsRef.current = endMs > 0 ? endMs : null;
        }
        audio.currentTime = startMs / 1000;
      };

      audio.ontimeupdate = () => {
        const currentMs = Math.round(audio.currentTime * 1000);
        setCurrentTime(audio.currentTime);
        const active = findCurrentVerse(metadata.verses, currentMs);
        if (active !== null) {
          setCurrentVerseNumber(active);
        } else {
          setCurrentVerseNumber(estimateCurrentVerseByProgress());
        }
        if (audioEndMsRef.current !== null && currentMs >= audioEndMsRef.current) {
          audio.pause();
          void finishCurrentChapter();
        }
      };

      audio.onended = async () => {
        await finishCurrentChapter();
      };

      await audio.play();
      setIsPlaying(true);
      setAudioLoading(false);
    } catch (error) {
      console.error("Reading audio play failed:", error);
      setAudioLoading(false);
      setIsPlaying(false);
      setAudioSubtitle("\uC624\uB514\uC624\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };
const togglePlay = () => {
    if (!audioRef.current || audioLoading) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleNextChapterFromModal = async () => {
    const currentIdx = audioPlayingChapterIdxRef.current;
    if (currentIdx >= rangePages.length - 1) return;
    const nextIdx = currentIdx + 1;
    const nextChapter = rangePages[nextIdx];
    if (!nextChapter) return;
    setCurrentPageIdx(nextIdx);
    currentPageIdxRef.current = nextIdx;
    setBibleData(nextChapter);
    await handlePlayServerAudio({
      continuous: isContinuousPlayMode,
      chapterData: nextChapter,
      chapterIdx: nextIdx,
      skipSelector: true,
    });
  };

  const handlePrevChapterFromModal = async () => {
    const currentIdx = audioPlayingChapterIdxRef.current;
    if (currentIdx <= 0) return;
    const prevIdx = currentIdx - 1;
    const prevChapter = rangePages[prevIdx];
    if (!prevChapter) return;
    setCurrentPageIdx(prevIdx);
    currentPageIdxRef.current = prevIdx;
    setBibleData(prevChapter);
    await handlePlayServerAudio({
      continuous: isContinuousPlayMode,
      chapterData: prevChapter,
      chapterIdx: prevIdx,
      skipSelector: true,
    });
  };

  // \uc804\uccb4 \uc7ac\uc0dd \ubaa8\ub4dc\uc5d0\uc11c \ub2e4\uc74c \uc7a5 \uc7ac\uc0dd
  const playNextChapterInContinuousMode = async (chapterData: any, chapterIdx: number) => {
    if (!chapterData) return;
    
    const targetVoice = voiceType;
    const bookOrder = chapterData.bible_books?.book_order || '0';
    const fileName = `reading/reading_b${bookOrder}_c${chapterData.chapter}_${targetVoice}.mp3`;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }

    try {
      // R2에서 파일 직접 로드 시도
      const publicUrl = `https://pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev/${fileName}`;
      const savedAudio = new Audio(publicUrl);
      
      let errorOccurred = false;
      
      // 즉시 UI 표시
      audioRef.current = savedAudio;
      savedAudio.currentTime = 0;
      setShowAudioControl(true);
      setIsFromServer(true);
      
      // 오디오 이벤트 설정
      savedAudio.onloadedmetadata = () => {
        if (!errorOccurred) {
          setDuration(savedAudio.duration);
          if (rangePages.length > 0 && chapterIdx < rangePages.length - 1) {
            const nextChapter = rangePages[chapterIdx + 1];
            preloadNextChapterAudio(nextChapter);
          }
        }
      };
      
      savedAudio.ontimeupdate = () => {
        if (!errorOccurred) {
          setCurrentTime(savedAudio.currentTime);
          if (verseRefs.current.length > 0 && savedAudio.duration > 0) {
            const totalVerses = verseRefs.current.length;
            const estimatedVerseIndex = Math.floor((savedAudio.currentTime / savedAudio.duration) * totalVerses);
            const clampedIndex = Math.min(estimatedVerseIndex, totalVerses - 1);
            if (clampedIndex !== currentVerseIndex && verseRefs.current[clampedIndex]) {
              setCurrentVerseIndex(clampedIndex);
              verseRefs.current[clampedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      };
      
      savedAudio.onended = async () => {
        if (!errorOccurred) {
          const currentChapterData = rangePages[chapterIdx] || bibleData;
          await handleReadComplete(true, currentChapterData);
          
          if (rangePages.length > 0 && chapterIdx < rangePages.length - 1) {
            const nextIdx = chapterIdx + 1;
            const nextChapterData = rangePages[nextIdx];
            currentPageIdxRef.current = nextIdx;
            setCurrentPageIdx(nextIdx);
            setBibleData(nextChapterData);
            setTimeout(() => {
              playNextChapterInContinuousMode(nextChapterData, nextIdx);
            }, 500);
          } else {
            setIsPlaying(false);
            setShowAudioControl(false);
            setCurrentTime(0);
            setDuration(0);
            setIsContinuousPlayMode(false);
            audioRef.current = null;
          }
        }
      };
      
      // 에러 핸들러 정의
      const errorHandlerContinuous = async (e: Event) => {
        if (errorOccurred) return;
        errorOccurred = true;
        console.log('[Audio Continuous] R2 파일 없음, TTS 생성 시작');
        
        // UI 숨기고 오디오 정리
        setShowAudioControl(false);
        setIsPlaying(false);
        audioRef.current = null;
        savedAudio.onloadedmetadata = null;
        savedAudio.ontimeupdate = null;
        savedAudio.onended = null;
        
        // TTS 생성
        await generateContinuousTTS();
      };
      
      // 파일이 로드되면 재생 시작
      savedAudio.addEventListener('loadeddata', () => {
        if (!errorOccurred) {
          savedAudio.removeEventListener('error', errorHandlerContinuous); // error 리스너 제거
          console.log('[Audio Continuous] R2 파일 로드 성공');
          setIsPlaying(true);
          savedAudio.play().catch(e => console.log('재생 시작 오류:', e));
        }
      }, { once: true });
      
      // 파일이 없으면 TTS 생성
      savedAudio.addEventListener('error', errorHandlerContinuous, { once: true });
      
      return;

    } catch (error) {
      console.error("Audio 재생 에러:", error);
      setIsPlaying(false);
      setIsContinuousPlayMode(false);
    }
    
    async function generateContinuousTTS() {
      try {
      // 서버에 파일이 없으면 TTS API 호출
      const toKorNum = (num: number | string) => {
        const n = Number(num);
        if (isNaN(n)) return String(num);
        const units = ["", "\uc77c", "\uc774", "\uc0bc", "\uc0ac", "\uc624", "\uc721", "\uce60", "\ud314", "\uad6c"];
        const tens = ["", "\uc2ed", "\uc774\uc2ed", "\uc0bc\uc2ed", "\uc0ac\uc2ed", "\uc624\uc2ed", "\uc721\uc2ed", "\uce60\uc2ed", "\ud314\uc2ed", "\uad6c\uc2ed"];
        if (n === 0) return "\uc601";
        if (n < 10) return units[n];
        if (n < 100) return tens[Math.floor(n / 10)] + units[n % 10];
        return String(n);
      };

      const mainContent = chapterData.content.replace(/\d+\.\s*/g, '');
      const unit = chapterData.bible_name === "\uc2dc\ud3b8" ? "\ud3b8" : "\uc7a5";
      const chapterKor = toKorNum(chapterData.chapter);
      const textToSpeak = `${chapterData.bible_name} ${chapterKor}${unit}. ${mainContent}.`;

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

      if (!response.ok) throw new Error("API \ud638\ucd9c \uc2e4\ud328");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const ttsAudio = new Audio(audioUrl);
      
      setupAudioEvents(ttsAudio, 0, false, true, chapterIdx);

      // R2 업로드 (백그라운드)
      (async () => {
        try {
          console.log('[R2 Upload - Continuous] Uploading:', fileName);
          const urlRes = await fetch('/api/audio/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName })
          });
          const { uploadUrl, publicUrl } = await urlRes.json();
          
          await fetch(uploadUrl, {
            method: 'PUT',
            body: audioBlob,
            headers: { 'Content-Type': 'audio/mp3' }
          });
          
          console.log('[R2 Upload - Continuous] ✅ Success! URL:', publicUrl);
        } catch (error) {
          console.error('[R2 Upload - Continuous] ❌ Failed:', error);
        }
      })();

      } catch (error) {
        console.error("Azure TTS \uc5d0\ub7ec:", error);
        setIsPlaying(false);
        setIsContinuousPlayMode(false);
      }
    }
  };

  // 다음 장 오디오 미리 로드
  const preloadNextChapterAudio = async (nextChapter: any) => {
    if (!nextChapter) return;
    
    const targetVoice = voiceType;
    const bookOrder = nextChapter.bible_books?.book_order || '0';
    const fileName = `reading/reading_b${bookOrder}_c${nextChapter.chapter}_${targetVoice}.mp3`;

    try {
      // R2에서 파일 직접 로드 시도
      const publicUrl = `https://pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev/${fileName}`;
      const preloadAudio = new Audio(publicUrl);
      preloadAudio.preload = 'auto';
      
      let audioLoadFailed = false;
      let audioLoaded = false;
      
      preloadAudio.addEventListener('error', async () => {
        if (audioLoadFailed || audioLoaded) return;
        audioLoadFailed = true;
        console.log('[Audio Preload] R2 파일 없음, TTS 생성 시작');
        
        // 실패한 오디오 정리
        preloadAudio.pause();
        preloadAudio.src = '';
        
        // TTS 생성
        await generatePreloadTTS();
      }, { once: true });
      
      preloadAudio.addEventListener('canplay', () => {
        if (audioLoadFailed) return;
        audioLoaded = true;
        console.log('[Audio Preload] R2 파일 로드 성공');
        nextChapterAudioCache.current = preloadAudio;
      }, { once: true });
      
      // 임시로 캐시에 할당 (canplay 이벤트에서 재할당)
      nextChapterAudioCache.current = preloadAudio;
      return;

    } catch (error) {
      console.error("다음 장 미리 로드 실패:", error);
    }
    
    async function generatePreloadTTS() {
      try {
      // 서버에 파일이 없으면 TTS API로 미리 생성
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

      const mainContent = nextChapter.content.replace(/\d+\.\s*/g, '');
      const unit = nextChapter.bible_name === "시편" ? "편" : "장";
      const chapterKor = toKorNum(nextChapter.chapter);
      const textToSpeak = `${nextChapter.bible_name} ${chapterKor}${unit}. ${mainContent}.`;

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
      nextChapterAudioCache.current = new Audio(audioUrl);
      nextChapterAudioCache.current.preload = 'auto';

      // R2 업로드 (백그라운드)
      (async () => {
        try {
          console.log('[R2 Upload - Preload] Uploading:', fileName);
          const urlRes = await fetch('/api/audio/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName })
          });
          const { uploadUrl, publicUrl } = await urlRes.json();
          
          await fetch(uploadUrl, {
            method: 'PUT',
            body: audioBlob,
            headers: { 'Content-Type': 'audio/mp3' }
          });
          
          console.log('[R2 Upload - Preload] ✅ Success! URL:', publicUrl);
        } catch (error) {
          console.error('[R2 Upload - Preload] ❌ Failed:', error);
        }
      })();

      } catch (error) {
        console.error("다음 장 미리 로드 실패:", error);
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

  // 읽기 완료 취소
  const handleBookmark = async () => {
    if (!bibleData) return;
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    const verseRef = `${bibleData.bible_name} ${bibleData.chapter}${bibleData.bible_name === '시편' ? '편' : '장'} ${bibleData.verse}`;
    const { error } = await supabase.from("verse_bookmarks").insert({
      user_id: user.id,
      source: "reading",
      verse_ref: verseRef,
      content: cleanContent(bibleData.content),
      memo: null,
    });

    if (error) {
      if (error.code === "23505") {
        alert("이미 저장된 말씀입니다.");
        return;
      }
      alert("즐겨찾기 저장에 실패했습니다.");
      return;
    }

    alert("기록함에 저장되었습니다.");
  };

  const handleReadCancel = useCallback(async () => {
    if (!user || !bibleData) return;

    try {
      // DB에서 read_count 1 감소 (최소 0)
      const { data: existing } = await supabase
        .from('user_reading_records')
        .select('read_count')
        .eq('user_id', user.id)
        .eq('book_name', bibleData.bible_name)
        .eq('chapter', bibleData.chapter)
        .maybeSingle();

      if (existing && existing.read_count > 0) {
        const newCount = existing.read_count - 1;
        
        if (newCount === 0) {
          // 0이 되면 레코드 삭제
          await supabase
            .from('user_reading_records')
            .delete()
            .eq('user_id', user.id)
            .eq('book_name', bibleData.bible_name)
            .eq('chapter', bibleData.chapter);
        } else {
          // 1 감소
          await supabase
            .from('user_reading_records')
            .update({ 
              read_count: newCount,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('book_name', bibleData.bible_name)
            .eq('chapter', bibleData.chapter);
        }

        // 로컬 상태 업데이트
        await checkCurrentChapterReadStatus();
        
        // 햅틱 피드백 (취소 패턴 - 3번 진동)
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        
        // 취소 토스트 표시
        setShowCancelToast(true);
        setTimeout(() => setShowCancelToast(false), 2000);
      }
    } catch (error) {
      console.error('읽기 완료 취소 실패:', error);
    }
  }, [user, bibleData]);

  const prepareReadingGroupLink = useCallback(
    async (sourceRowId: string, label: string) => {
      if (!user?.id) return;
      const groups = await fetchMyGroups(user.id);
      if (groups.length === 0) return;

      setMyGroups(groups);
      setPendingGroupLinkSourceRowId(sourceRowId);
      setPendingGroupLinkLabel(label);
      setShowGroupLinkPrompt(true);
    },
    [user?.id]
  );

  const closeReadingGroupLinkFlow = () => {
    setShowGroupLinkPrompt(false);
    setShowGroupLinkModal(false);
    setPendingGroupLinkSourceRowId(null);
    setPendingGroupLinkLabel("");
    setLinkingGroupId(null);
  };

  const handleReadingGroupLink = async (groupId: string) => {
    if (!user?.id || !pendingGroupLinkSourceRowId) return;
    setLinkingGroupId(groupId);

    try {
      const { error } = await linkPersonalActivityToGroup({
        userId: user.id,
        activityType: "reading",
        sourceTable: "user_reading_records",
        sourceRowId: pendingGroupLinkSourceRowId,
        groupId,
      });
      if (error) throw error;

      closeReadingGroupLinkFlow();
      alert("모임 신앙생활에 연결되었습니다.");
    } catch (error) {
      console.error("reading group link failed:", error);
      alert("모임 연결에 실패했습니다.");
    } finally {
      setLinkingGroupId(null);
    }
  };

  const handleReadComplete = async (silent = false, chapterData = bibleData) => {
    // 말씀이 없으면 읽기 완료 불가
    if (!chapterData) {
      if (!silent) {
        setShowWarningToast(true);
        setTimeout(() => setShowWarningToast(false), 2000);
      }
      return;
    }

    // 폭죽 효과 (전체 재생 모드가 아닐 때만)
    if (!silent) {
      confetti({
        particleCount: 100, 
        spread: 70, 
        origin: { y: 0.8 }, 
        colors: ['#f897c4', '#88B04B', '#FFD700'] 
      });
      
      // 햅틱 피드백 (짧은 진동)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }

    // 로그인 확인
    // 비로그인 사용자는 로그인 모달 표시
    if (!user) {
      console.log('사용자 없음 - 로그인 모달 표시');
      if (!silent) {
        // 폭죽과 동시에 로그인 팝업 표시
        setShowLoginModal(true);
      }
      return;
    }

    // 로그인 상태면 읽기 완료 기록 저장 (책+장 단위)
    if (chapterData) {
      try {
        const dateStr = currentDate.toISOString().split('T')[0];
        const verseValue = chapterData.verse;
        let startVerse: number | null = null;
        let endVerse: number | null = null;

        if (typeof verseValue === 'number') {
          startVerse = verseValue;
          endVerse = verseValue;
        } else if (typeof verseValue === 'string') {
          const [startStr, endStr] = verseValue.split('-').map(v => v.trim());
          const startNum = Number(startStr);
          const endNum = endStr ? Number(endStr) : startNum;
          if (!Number.isNaN(startNum)) startVerse = startNum;
          if (!Number.isNaN(endNum)) endVerse = endNum;
        }
        
        // upsert 사용: 있으면 업데이트, 없으면 생성
        const { data: existing } = await supabase
          .from('user_reading_records')
          .select('read_count')
          .eq('user_id', user.id)
          .eq('book_name', chapterData.bible_name)
          .eq('chapter', chapterData.chapter)
          .maybeSingle();
        
        const newReadCount = existing ? existing.read_count + 1 : 1;
        
        const { data: savedRecord, error: upsertError } = await supabase
          .from('user_reading_records')
          .upsert({
            user_id: user.id,
            date: dateStr,
            book_name: chapterData.bible_name,
            chapter: chapterData.chapter,
            start_verse: startVerse,
            end_verse: endVerse,
            read_count: newReadCount,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,book_name,chapter',
            ignoreDuplicates: false
          })
          .select('id')
          .single();

        if (upsertError) {
          throw upsertError;
        }

        // 진행률 업데이트
        const key = `${chapterData.bible_name}_${chapterData.chapter}`;
        setReadingProgress(prev => ({ ...prev, [key]: 100 }));
        
        // 읽기 상태 다시 확인 (횟수 및 상태 업데이트)
        await checkCurrentChapterReadStatus();

        if (!silent && savedRecord?.id) {
          await prepareReadingGroupLink(String(savedRecord.id), `${chapterData.bible_name} ${chapterData.chapter}장`);
        }
      } catch (error) {
        console.error('읽기 완료 저장 실패:', error);
      }
    }
  };

  // 롱프레스 이벤트 리스너 (터치 시작 즉시 원형 진행 바 표시)
  useEffect(() => {
    const button = readCompleteButtonRef.current;
    if (!button) return;

    const handleStart = (e: TouchEvent | MouseEvent) => {
      pressStartedRef.current = true; // 버튼 누름 시작 플래그
      longPressStartTimeRef.current = Date.now();
      
      // 읽기 완료 상태일 때만 진행 바 시작
      if (!isReadCompleted) return;
      
      // 즉시 진행 바 시작
      isLongPressingRef.current = true;
      setIsLongPressing(true);
      
      const animate = () => {
        const elapsed = Date.now() - longPressStartTimeRef.current;
        
        if (elapsed >= 1500) {
          // 1.5초 완료 - 취소 실행
          handleReadCancel();
          longPressCancelledRef.current = true;
          isLongPressingRef.current = false;
          setIsLongPressing(false);
        } else if (isLongPressingRef.current) {
          longPressAnimationRef.current = requestAnimationFrame(animate);
        }
      };
      longPressAnimationRef.current = requestAnimationFrame(animate);
    };

    const handleEnd = () => {
      // handleStart가 실행되었고, 롱프레스 취소가 아닌 경우만 읽기 완료 실행
      if (pressStartedRef.current && !longPressCancelledRef.current) {
        handleReadComplete();
      }
      
      // 모든 상태 초기화
      pressStartedRef.current = false;
      longPressCancelledRef.current = false;
      isLongPressingRef.current = false;
      setIsLongPressing(false);
      if (longPressAnimationRef.current) {
        cancelAnimationFrame(longPressAnimationRef.current);
      }
    };

    button.addEventListener('touchstart', handleStart, { passive: true });
    button.addEventListener('touchend', handleEnd, { passive: true });
    button.addEventListener('mousedown', handleStart);
    button.addEventListener('mouseup', handleEnd);
    button.addEventListener('mouseleave', handleEnd);

    return () => {
      button.removeEventListener('touchstart', handleStart);
      button.removeEventListener('touchend', handleEnd);
      button.removeEventListener('mousedown', handleStart);
      button.removeEventListener('mouseup', handleEnd);
      button.removeEventListener('mouseleave', handleEnd);
    };
  }, [isReadCompleted, handleReadCancel, handleReadComplete]);

  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) { // 이전 날짜
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      // 과거 날짜로 이동하면 범위 선택 해제
      setRangePages([]);
      setBibleData(null);
      setNoReadingForDate(false); // 메시지 깜박임 방지
      setCurrentDate(d);
    } else if (info.offset.x < -100) { // 다음 날짜
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) {
        const isGoingToToday = d.toDateString() === today.toDateString();
        // 오늘로 돌아가는 게 아니면 범위 선택 해제
        if (!isGoingToToday) {
          setRangePages([]);
          setBibleData(null);
          setNoReadingForDate(false); // 메시지 깜박임 방지
        }
        setCurrentDate(d);
      }
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
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, rotateY: -15, scale: 0.95 }} 
            animate={{ opacity: 1, rotateY: 0, scale: 1 }} 
            exit={{ opacity: 0, rotateY: 15, scale: 0.95 }}
            className="w-[82%] max-w-sm h-auto min-h-[450px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-start justify-center px-8 py-6 text-left z-10 touch-none cursor-grab active:cursor-grabbing"
            style={{ perspective: 1000 }}
          >
            {bibleData ? (
              <>
                {/* 출처 영역 - 상단으로 이동 */}
                <span className="self-center text-center font-bold text-[#4A6741] opacity-60 mb-6" style={{ fontSize: `${fontSize * 0.9}px` }}>
                  {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse ? `${bibleData.verse}절` : ''}
                </span>

                {/* 말씀 본문 영역 - 높이 고정 및 스크롤 추가 */}
                <div
                  onWheel={markUserScroll}
                  onTouchMove={markUserScroll}
                  className="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 text-zinc-800 leading-[1.5] break-keep font-medium"
                  style={{ fontSize: `${fontSize}px`, maxHeight: "320px" }}
                >
                  {parsedVerses.map(({ verse, text }, i) => (
                    <p
                      key={`${verse}-${i}`}
                      ref={(el) => {
                        verseRefs.current[i] = el;
                        verseNumberRefs.current[verse] = el;
                      }}
                      className="flex items-start gap-2 px-2 py-1 rounded-lg transition-colors"
                    >
                      <span className="text-[#4A6741] opacity-40 text-[0.8em] font-bold mt-[2px] flex-shrink-0">{verse}</span>
                      <span className="flex-1">{text}</span>
                    </p>
                  ))}
                  {parsedVerses.length === 0 && bibleData.content.split("\n").map((line: string, i: number) => <p key={i}>{line}</p>)}
                </div>
              </>
            ) : noReadingForDate ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
                <BookX size={48} className="text-zinc-200" strokeWidth={1.5} />
                <p className="text-zinc-400 text-sm font-medium text-center">
                  읽은 말씀이 없습니다
                </p>
              </div>
            ) : isLoadingVerse ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
                <Loader2 size={48} className="text-zinc-200 animate-spin" strokeWidth={1.5} />
                <p className="text-zinc-400 text-sm font-medium text-center">
                  읽은 말씀 불러오는 중...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
                <NotebookPen size={48} className="text-zinc-200" strokeWidth={1.5} />
                <p className="text-zinc-400 text-sm font-medium text-center">
                  우측 상단 버튼을 눌러<br />
                  읽을 범위를 선택해주세요
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] w-[82%] max-w-sm h-[460px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      <div className="flex items-center gap-8 mt-3 mb-14"> 
        <button onClick={() => handlePlayServerAudio()} className="flex flex-col items-center gap-1.5  text-[#4A6741]">
          <BookHeadphones size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
        </button>
        <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
        </button>
        <button onClick={handleBookmark} className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
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

        <div className="relative flex flex-col items-center">
          <motion.button 
            ref={readCompleteButtonRef}
            whileTap={{ scale: 0.9 }}
            className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
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
          
          {/* 미세 힌트 텍스트 (읽기 완료 상태일 때만) */}
          {isReadCompleted && (
            <div className="text-xs text-gray-400 mt-1.5 opacity-60">
              길게 누르면 취소
            </div>
          )}
        </div>

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
          <div className="flex items-center gap-1 bg-green-50 py-2 px-4 rounded-full font-bold text-[#4A6741]" style={{ fontSize: `${fontSize * 0.625}px` }}>
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
            <div className="flex items-center gap-1 bg-blue-50 py-2 px-4 rounded-full font-bold text-blue-700" style={{ fontSize: `${fontSize * 0.625}px` }}>
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
                setAvailableChapters([]);
                // localStorage 초기화
                localStorage.removeItem('reading_selection');
                localStorage.removeItem('reading_pages');
                localStorage.removeItem('reading_page_idx');
              }}
              className="py-2 px-4 bg-red-50 text-red-600 rounded-full"
              style={{ fontSize: `${fontSize * 0.625}px` }}
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
              
              // 시작/종료 장 표시
              const isStartChapter = tempSelection.start_book === currentBook && tempSelection.start_chapter === ch;
              const isEndChapter = tempSelection.end_book === currentBook && tempSelection.end_chapter === ch;
              const isInRange = tempSelection.start_book === currentBook && 
                                tempSelection.start_chapter > 0 && 
                                tempSelection.end_chapter > 0 && 
                                ch >= tempSelection.start_chapter && 
                                ch <= tempSelection.end_chapter;
              
              return (
                <button
                  key={ch}
                  disabled={isDisabled}
                  onClick={() => {
                    if (selectionPhase === 'start') {
                      const updatedSelection = { 
                        ...tempSelection, 
                        start_chapter: ch,
                        end_testament: tempSelection.start_testament, // 종료 범위도 동일하게 설정
                        end_book: tempSelection.start_book // 종료 책도 시작 책과 동일하게 설정
                      };
                      setTempSelection(updatedSelection);
                      setSelectionPhase('end');
                      // 종료 범위는 바로 장 선택으로 (같은 책이므로)
                      // 다른 책 선택하려면 뒤로가기 가능
                      loadChapters(tempSelection.start_book);
                    } else {
                      // 종료 범위 선택 완료 -> 확인 모달 표시
                      const updatedSelection = {
                        ...tempSelection,
                        end_chapter: ch
                      };
                      setTempSelection(updatedSelection);
                      setPendingSelection(updatedSelection);
                      setShowConfirmModal(true);
                    }
                  }}
                  className={`py-3 rounded-xl font-bold relative overflow-hidden transition-all ${
                    isDisabled
                      ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                      : isStartChapter || isEndChapter
                      ? 'bg-blue-500 text-white border-2 border-blue-600'
                      : isInRange
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : hasBeenRead
                      ? 'bg-green-100 text-[#4A6741] border-2 border-green-300 hover:bg-green-200'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1">
                      {isStartChapter && <span className="text-[9px]">시작</span>}
                      <span>{ch}</span>
                      {isEndChapter && <span className="text-[9px]">종료</span>}
                    </div>
                    {user && hasBeenRead && !isDisabled && !isStartChapter && !isEndChapter && (
                      <span className="text-[9px] text-[#4A6741] font-bold">{readCount}회</span>
                    )}
                  </div>
                  
                  {hasBeenRead && !isDisabled && !isStartChapter && !isEndChapter && <Check size={12} className="absolute top-0.5 right-0.5 text-[#4A6741]" />}
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

      <AnimatePresence>
        {showGroupLinkPrompt && (
          <div className="fixed inset-0 z-[320] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeReadingGroupLinkFlow}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-6 w-full max-w-[360px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2">모임에 완료 연결할까요?</h4>
              <p className="text-sm text-zinc-500 mb-6">
                {pendingGroupLinkLabel || "읽기 완료"} 기록을 모임 신앙생활에 연결할 수 있습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeReadingGroupLinkFlow}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-bold"
                >
                  나중에
                </button>
                <button
                  onClick={() => {
                    setShowGroupLinkPrompt(false);
                    setShowGroupLinkModal(true);
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#4A6741] text-white font-bold"
                >
                  연결하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGroupLinkModal && pendingGroupLinkSourceRowId && (
          <div className="fixed inset-0 z-[330] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeReadingGroupLinkFlow}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-6 w-full max-w-[420px] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-zinc-900">연결할 모임 선택</h4>
                <button
                  onClick={closeReadingGroupLinkFlow}
                  className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {myGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between bg-zinc-50 rounded-xl px-3 py-2">
                    <span className="text-sm font-semibold text-zinc-800">{group.name}</span>
                    <button
                      onClick={() => handleReadingGroupLink(group.id)}
                      disabled={linkingGroupId === group.id}
                      className="px-3 py-1.5 rounded-lg bg-[#4A6741] text-white text-xs font-bold disabled:opacity-60"
                    >
                      {linkingGroupId === group.id ? "연결 중..." : "연결"}
                    </button>
                  </div>
                ))}
                {myGroups.length === 0 && (
                  <div className="text-sm text-zinc-500 text-center py-6">연결 가능한 모임이 없습니다.</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal} 
      />

      {/* 말씀 범위 확인 모달 */}
      <AnimatePresence>
        {showConfirmModal && pendingSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 text-center">선택하신 말씀 범위</h3>
              <div className="bg-zinc-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">시작:</span>
                  <span className="font-bold">
                    {pendingSelection.start_book} {pendingSelection.start_chapter}장
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">종료:</span>
                  <span className="font-bold">
                    {pendingSelection.end_book} {pendingSelection.end_chapter}장
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-bold hover:bg-zinc-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    loadRangePagesWithSelection(pendingSelection);
                    setShowConfirmModal(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3d5536] transition-colors"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 재생 방식 선택 팝업 */}
      <AnimatePresence>
        {showPlayModePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center"
            onClick={() => setShowPlayModePopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[24px] p-8 max-w-sm mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black mb-4 text-zinc-900 text-center">
                재생 방식을 선택해주세요
              </h3>
              <p className="text-sm text-zinc-500 mb-6 text-center">
                {currentPageIdx === 0 ? `${rangePages.length}개 장의 말씀이 있습니다` : `현재 장 포함 ${rangePages.length - currentPageIdx}개 장이 남았습니다`}
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowPlayModePopup(false);
                    setIsContinuousPlayMode(true);
                    handlePlayServerAudio({ continuous: true, skipSelector: true });
                  }}
                  className="w-full py-4 bg-[#4A6741] text-white rounded-2xl font-bold text-base hover:bg-[#3d5635] transition-colors"
                >
                  {currentPageIdx === 0 ? `전체 범위 재생 (${rangePages.length}개 장)` : `나머지 장 재생 (${rangePages.length - currentPageIdx}개 장)`}
                </button>
                
                <button
                  onClick={() => {
                    setShowPlayModePopup(false);
                    setIsContinuousPlayMode(false);
                    handlePlayServerAudio({ continuous: false, skipSelector: true });
                  }}
                  className="w-full py-4 bg-white border-2 border-[#4A6741] text-[#4A6741] rounded-2xl font-bold text-base hover:bg-green-50 transition-colors"
                >
                  현재 장만 재생 (1장씩)
                </button>
                
                <button
                  onClick={() => setShowPlayModePopup(false)}
                  className="w-full py-3 text-zinc-400 font-medium text-sm"
                >
                  취소
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


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

      {/* 읽기 완료 취소 토스트 (빨간색) */}
      <AnimatePresence>
        {showCancelToast && (
          <motion.div 
            initial={{ opacity: 0, x: "-50%", y: 20 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-64 left-1/2 z-[200] bg-red-500 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium text-center whitespace-nowrap"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            읽기 완료가 취소되었습니다
          </motion.div>
        )}
      </AnimatePresence>

      {/* 경고 토스트 (빨간색) */}
      <AnimatePresence>
        {showWarningToast && (
          <motion.div 
            initial={{ opacity: 0, x: "-50%", y: 20 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-36 left-1/2 z-[200] bg-red-500 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium text-center whitespace-nowrap"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            읽을 말씀을 먼저 정해주세요
          </motion.div>
        )}
      </AnimatePresence>

      <BibleAudioPlayerModal
        open={showAudioControl}
        loading={audioLoading}
        subtitle={audioSubtitle}
        fontSize={fontSize}
        isPlaying={isPlaying}
        progress={currentTime}
        duration={duration}
        onClose={closeAudioModal}
        onTogglePlay={togglePlay}
        onSeek={seekAudioFromModal}
        onPrevVerse={jumpPrevVerse}
        onNextVerse={jumpNextVerse}
        onPrevChapter={handlePrevChapterFromModal}
        onNextChapter={handleNextChapterFromModal}
        canPrevChapter={audioPlayingChapterIdxRef.current > 0}
        canNextChapter={audioPlayingChapterIdxRef.current < rangePages.length - 1}
      />

    </div>
  );
}
