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
import { ActivityGroupLinkModal } from "../components/ActivityGroupLinkModal";
import { ActivityCalendarModal } from "../components/ActivityCalendarModal";

import { useLocation } from "wouter";

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toLocalDateKey(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatLocalDate(parsed);
}

export default function ReadingPage() {
  const [location] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  // 荑쇰━?ㅽ듃留곸뿉 date媛 ?덉쑝硫??대떦 ?좎쭨濡??대룞
  useEffect(() => {
    if (!location) return;
    const query = location.split("?")[1];
    if (!query) return;
    const params = new URLSearchParams(query);
    const dateStr = params.get("date");
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) setCurrentDate(d);
    }
  }, [location]);
  const today = new Date();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [activityDateKeys, setActivityDateKeys] = useState<Set<string>>(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [myGroups, setMyGroups] = useState<{ id: string; name: string }[]>([]);
  const [showGroupLinkPrompt, setShowGroupLinkPrompt] = useState(false);
  const [showGroupLinkModal, setShowGroupLinkModal] = useState(false);
  const [pendingGroupLinkSourceRowId, setPendingGroupLinkSourceRowId] = useState<string | null>(null);
  const [pendingGroupLinkLabel, setPendingGroupLinkLabel] = useState("");
  const [linkingGroupId, setLinkingGroupId] = useState<string | null>(null);

  const handleDateChange = (selectedDate: Date) => {
    if (!isNaN(selectedDate.getTime())) {
      if (selectedDate > today) {
        alert("?ㅻ뒛 ?댄썑??留먯?? 誘몃━ 蹂????놁뒿?덈떎.");
        return;
      }
      setCurrentDate(selectedDate);
    }
  };
  const [bibleData, setBibleData] = useState<any>(null);

  const BIBLE_BOOKS = useMemo(() => {
    const grouped: Record<"구약" | "신약", string[]> = { 구약: [], 신약: [] };
    BOOK_CHAPTERS.forEach((book) => {
      if (book.testament === "old") {
        grouped.구약.push(book.name);
      } else {
        grouped.신약.push(book.name);
      }
    });
    return grouped;
  }, []);

  // --- ?뵦 踰붿쐞 ?좏깮 ?꾩슜 ?곹깭 (蹂듦뎄 諛?媛뺥솕) ---
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
  const [audioControlY, setAudioControlY] = useState(0); // ?ъ깮 ?앹뾽 Y ?꾩튂
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
  const currentPageIdxRef = useRef<number>(0);  // ?꾩옱 ?몃뜳?ㅻ? ref濡쒕룄 愿由?
  const previousDateRef = useRef<string>(new Date().toDateString());

  // ?ъ깮 諛⑹떇 ?좏깮 諛??꾩껜 ?ъ깮 紐⑤뱶 愿???곹깭
  const [showPlayModePopup, setShowPlayModePopup] = useState(false);
  const [isContinuousPlayMode, setIsContinuousPlayMode] = useState(false);
  const nextChapterAudioCache = useRef<HTMLAudioElement | null>(null);

  const { fontSize = 16 } = useDisplaySettings();

  useEffect(() => {
    let alive = true;

    const loadActivityDateKeys = async () => {
      if (!user?.id) {
        if (alive) setActivityDateKeys(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("user_reading_records")
        .select("date, created_at")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading reading activity dates:", error);
        return;
      }

      const next = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row.date) {
          next.add(row.date);
          return;
        }
        const dateKey = toLocalDateKey(row.created_at);
        if (dateKey) next.add(dateKey);
      });

      if (alive) setActivityDateKeys(next);
    };

    void loadActivityDateKeys();
    return () => {
      alive = false;
    };
  }, [user?.id, currentDate, isReadCompleted]);

  // currentPageIdx 상태를 ref와 동기화
  useEffect(() => {
    currentPageIdxRef.current = currentPageIdx;
  }, [currentPageIdx]);

  // bibleData 蹂寃???verseRefs 珥덇린??(?ㅽ겕濡??깊겕 ?섏젙)
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



  // ?ъ깮 ?앹뾽 ?쒕옒洹??몃뱾??
  const handleDragStart = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY - audioControlY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newY = e.clientY - dragStartY;
    // ?붾㈃ 寃쎄퀎 泥댄겕 (?곷떒 80px, ?섎떒 200px ?ъ쑀)
    const minY = -200;
    const maxY = window.innerHeight - 350;
    setAudioControlY(Math.max(minY, Math.min(newY, maxY)));
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // 踰붿쐞 ?좏깮 紐⑤뱶濡쒕쭔 ?ъ슜
  useEffect(() => {
    // ReadingPage??踰붿쐞 ?좏깮 ?꾩슜 ?섏씠吏
    if (rangePages.length === 0) {
      setBibleData(null);
    }
  }, []);

  // ?뵦 踰붿쐞 ?좏깮 愿???곹깭
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

  // 梨??쒖꽌 留ㅽ븨 濡쒕뱶
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

  // ?좎쭨蹂?留먯? 濡쒕뱶 (濡쒓렇?명븳 ?뚯썝??
  const loadDailyVerse = async (date: Date, options?: { forceTodayRestore?: boolean }) => {
    // 濡쒓렇?명븯吏 ?딆븯?쇰㈃ ?ㅽ뻾 ????
    if (!user) return;

    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const forceTodayRestore = Boolean(options?.forceTodayRestore);

    console.log('loadDailyVerse ?몄텧:', date.toISOString().split('T')[0], 'isToday:', isToday);

    // ?ㅻ뒛 ?좎쭨?닿퀬 rangePages媛 鍮꾩뼱?덉쑝硫?localStorage 蹂듭썝
    if (isToday && (rangePages.length === 0 || forceTodayRestore)) {
      const savedPages = localStorage.getItem('reading_pages');
      const savedDate = localStorage.getItem('reading_date');
      const savedIdx = localStorage.getItem('reading_page_idx');

      // ?좎쭨 ?뺤씤: ??λ맂 ?좎쭨媛 ?ㅻ뒛???꾨땲硫?臾댁떆
      const todayStr = today.toISOString().split('T')[0];
      if (savedPages && savedDate === todayStr) {
        try {
          const pages = JSON.parse(savedPages);
          const idx = Number(savedIdx) || 0;

          console.log('localStorage 蹂듭썝:', pages.length, '?섏씠吏');

          setRangePages(pages);
          setCurrentPageIdx(idx);
          if (pages[idx]) {
            setBibleData(pages[idx]);
          }
          return;
        } catch (e) {
          console.error('蹂듭썝 ?ㅽ뙣:', e);
        }
      } else if (savedDate && savedDate !== todayStr) {
        // ?좎쭨媛 ?ㅻⅤ硫?localStorage ??젣
        console.log('localStorage ?좎쭨 遺덉씪移? ??젣');
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

    // ?ㅻ뒛 ?좎쭨硫??꾨Т寃껊룄 ????(rangePages ?좎?)
    if (isToday) {
      console.log('?ㅻ뒛 ?좎쭨, rangePages ?좎?');
      // ?곹깭 珥덇린??
      setIsLoadingVerse(false);
      if (rangePages.length === 0) {
        setNoReadingForDate(false);
      }
      return;
    }

    // 怨쇨굅 ?좎쭨留??쒕쾭?먯꽌 濡쒕뱶
    console.log('怨쇨굅 ?좎쭨, ?쒕쾭?먯꽌 濡쒕뱶');
    setIsLoadingVerse(true);
    setNoReadingForDate(false);

    const dateStr = date.toISOString().split('T')[0];

    // ?대떦 ?좎쭨??紐⑤뱺 ?쎌? ?μ쓣 媛?몄샃?덈떎
    const { data: records, error } = await supabase
      .from('user_reading_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .order('updated_at', { ascending: true });

    if (records && records.length > 0) {
      // 紐⑤뱺 ?쎌? ?μ쓣 rangePages濡?蹂??(?깃꼍 ?쒖꽌?濡??뺣젹)
      const pages = [];

      // 癒쇱? bible_books?먯꽌 book_order瑜?媛?몄????뺣젹
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

      // book_order濡??뺣젹
      const sortedRecords = [...records].sort((a, b) => {
        const orderA = bookOrders[a.book_name] || 0;
        const orderB = bookOrders[b.book_name] || 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.chapter - b.chapter;
      });

      for (const record of sortedRecords) {
        // bible_books ?뺣낫 蹂꾨룄 議고쉶
        const { data: bookInfo } = await supabase
          .from('bible_books')
          .select('*')
          .eq('book_name', record.book_name)
          .single();

        // ??踰덊샇? ?④퍡 ?щ㎎??
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
      console.error('留먯? 濡쒕뱶 ?ㅽ뙣:', error);
      setBibleData(null);
      setRangePages([]);
      setIsLoadingVerse(false);
    }
  };

  // 濡쒓렇?명븳 ?뚯썝??寃쎌슦 ?좎쭨蹂?留먯? 濡쒕뱶
  useEffect(() => {
    // 珥덇린???꾨즺 ?꾩뿉留??ㅽ뻾
    if (!isInitialized) return;

    const today = new Date();
    const todayKey = today.toDateString();
    const currentKey = currentDate.toDateString();
    const isToday = currentKey === todayKey;
    const wasToday = previousDateRef.current === todayKey;
    let forceTodayRestore = false;

    // ?ㅻ뒛???꾨땶 寃쎌슦留??붾㈃ ?대━??
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

  // 紐⑤떖???대┫ ???꾩껜 ?쎄린 ?대젰 濡쒕뱶
  useEffect(() => {
    if (isEditModalOpen && user) {
      loadAllReadingProgress();
    }
  }, [isEditModalOpen, user]);

  // localStorage?먯꽌 ?곹깭 蹂듭썝
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
        console.error('?곹깭 蹂듭썝 ?ㅽ뙣:', e);
      }
    }

    // 蹂듭썝 ?꾨즺 ?쒖떆
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

  // ?곹깭 蹂寃???localStorage?????
  useEffect(() => {
    if (tempSelection.start_chapter > 0) {
      localStorage.setItem('reading_selection', JSON.stringify(tempSelection));
    }
  }, [tempSelection]);

  useEffect(() => {
    if (rangePages.length > 0) {
      const today = new Date();
      const isToday = currentDate.toDateString() === today.toDateString();

      // ?ㅻ뒛 ?좎쭨???뚮쭔 localStorage?????
      if (isToday) {
        const todayStr = today.toISOString().split('T')[0];
        localStorage.setItem('reading_pages', JSON.stringify(rangePages));
        localStorage.setItem('reading_date', todayStr);
        localStorage.setItem('reading_page_idx', String(currentPageIdx));
        console.log('localStorage ???', todayStr, rangePages.length, '?섏씠吏');
      }

      // 留덉?留??쎌? ?μ쑝濡??대룞 (理쒖큹 濡쒕뱶 ?쒖뿉留?
      if (user && bibleData === null) {
        loadLastReadChapter();
      }
    }
  }, [rangePages, currentPageIdx]);

  // bibleData 蹂寃????쎄린 ?곹깭 ?뺤씤 諛?珥덇린??
  useEffect(() => {
    // ?섏씠吏媛 蹂寃쎈릺硫??쎄린?꾨즺 ?곹깭瑜?珥덇린??(媛??μ씠 ?낅┰??
    setIsReadCompleted(false);

    if (bibleData && user) {
      checkCurrentChapterReadStatus();
    } else {
      setReadCount(0);
    }
  }, [bibleData, user]);

  const loadAllReadingProgress = async () => {
    if (!user) return;

    // user_reading_records?먯꽌 紐⑤뱺 ?쎄린 湲곕줉 媛?몄삤湲?
    const { data } = await supabase
      .from('user_reading_records')
      .select('book_name, chapter, read_count')
      .eq('user_id', user.id);

    if (!data) return;

    // 媛?梨낆쓽 ?λ퀎 移댁슫??怨꾩궛
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

    // 媛?梨낆쓽 ?꾩껜 ???섎? 媛?몄???吏꾪뻾瑜?怨꾩궛
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

        // 梨??꾩껜 吏꾪뻾瑜?(?뚯닽??1?먮━)
        const percentage = totalChapters.length > 0
          ? Math.round((completedChapters / totalChapters.length) * 1000) / 10
          : 0;
        progressMap[`${bookName}_total`] = percentage;

        // 媛??λ퀎 ?쎌? ?잛닔?????
        totalChapters.forEach(ch => {
          const key = `${bookName}_${ch}`;
          progressMap[key] = bookData[bookName].chapterCounts[ch] || 0;
        });
      }
    }

    setReadingProgress(progressMap);
  };

  const loadChapters = async (book: string) => {
    console.log('loadChapters ?몄텧??', book, 'selectionPhase:', selectionPhase);

    if (selectionPhase === 'start') {
      setTempSelection(p => ({ ...p, start_book: book }));
    } else {
      setTempSelection(p => ({ ...p, end_book: book }));
    }

    // lib/bibleData.ts?먯꽌 ?뺥솗??????媛?몄삤湲?
    const bookInfo = BOOK_CHAPTERS.find(b => b.name === book);

    console.log('bookInfo:', bookInfo);

    if (bookInfo && bookInfo.chapters) {
      // 1遺??chapters源뚯? 諛곗뿴 ?앹꽦
      const chapters = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);
      setAvailableChapters(chapters);

      console.log("chapters loaded:", chapters.length);

      // 癒쇱? ???좏깮 ?붾㈃?쇰줈 ?꾪솚
      setSelectionStep('chapter');

      // 濡쒓렇???곹깭硫??쎄린 吏꾪뻾瑜?諛깃렇?쇱슫?쒕줈 遺덈윭?ㅺ린
      if (user) {
        loadReadingProgress(book, chapters);
      }
    } else {
      console.error('梨??뺣낫瑜?李얠쓣 ???놁뒿?덈떎:', book);
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
        // ?쎌? ?잛닔 ???(???좏깮?먯꽌 ?ъ슜)
        progressMap[key] = chapterCounts[ch] || 0;
      });

      // 沅??꾩껜 吏꾪뻾瑜?怨꾩궛 (?뚯닽??1?먮━源뚯?)
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

    // ?쎄린 ?꾨즺 ?곹깭 ?ㅼ젙 (??踰덉씠?쇰룄 ?쎌뿀?쇰㈃ true)
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
    console.log('loadRangePagesWithSelection ?쒖옉:', selection);
    setNoReadingForDate(false);

    if (!selection.start_book || !selection.start_chapter) {
      alert('?쒖옉 踰붿쐞瑜??좏깮?댁＜?몄슂.');
      return;
    }

    if (!selection.end_book || !selection.end_chapter) {
      alert('醫낅즺 踰붿쐞瑜??좏깮?댁＜?몄슂.');
      return;
    }

    // 沅??쒖꽌 ?뺤씤 (?쒖옉 沅뚯씠 醫낅즺 沅뚮낫???ㅼ뿉 ?덉쑝硫??덈맖)
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
      alert('?쒖옉 踰붿쐞媛 醫낅즺 踰붿쐞蹂대떎 ?ㅼ뿉 ?덉쓣 ???놁뒿?덈떎.');
      return;
    }

    const pages: any[] = [];

    // 媛숈? 沅뚯씤 寃쎌슦
    if (selection.start_book === selection.end_book) {
      for (let ch = selection.start_chapter; ch <= selection.end_chapter; ch++) {
        const { data, error } = await supabase
          .from('bible_verses')
          .select('*')
          .eq('book_name', selection.start_book)
          .eq('chapter', ch)
          .order('verse', { ascending: true });

        console.log(`${selection.start_book} ${ch}???곗씠??`, data, error);

        if (data && data.length > 0) {
          // 媛??덉쓣 verse 踰덊샇? ?④퍡 ?щ㎎??
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
      // ?ㅻⅨ 沅뚯씤 寃쎌슦 - ?쒖옉 沅뚮???醫낅즺 沅뚭퉴吏 紐⑤뱺 ??媛?몄삤湲?
      const { data: allBooks } = await supabase
        .from('bible_books')
        .select('*')
        .gte('book_order', startBookData?.book_order)
        .lte('book_order', endBookData?.book_order)
        .order('book_order', { ascending: true });

      if (allBooks) {
        for (const book of allBooks) {
          // 媛?沅뚯쓽 紐⑤뱺 ??媛?몄삤湲?
          const { data: chapters } = await supabase
            .from('bible_verses')
            .select('chapter')
            .eq('book_name', book.book_name)
            .order('chapter', { ascending: true });

          if (chapters) {
            const uniqueChapters = Array.from(new Set(chapters.map(c => c.chapter)));

            for (const ch of uniqueChapters) {
              // ?쒖옉 沅뚯쓽 寃쎌슦 ?쒖옉 ?λ???
              if (book.book_name === selection.start_book && ch < selection.start_chapter) continue;
              // 醫낅즺 沅뚯쓽 寃쎌슦 醫낅즺 ?κ퉴吏
              if (book.book_name === selection.end_book && ch > selection.end_chapter) continue;

              const { data, error } = await supabase
                .from('bible_verses')
                .select('*')
                .eq('book_name', book.book_name)
                .eq('chapter', ch)
                .order('verse', { ascending: true });

              console.log(`${book.book_name} ${ch}???곗씠??`, data, error);

              if (data && data.length > 0) {
                // 媛??덉쓣 verse 踰덊샇? ?④퍡 ?щ㎎??
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

    console.log('?앹꽦??pages:', pages);

    if (pages.length === 0) {
      alert('?좏깮??踰붿쐞???깃꼍 ?곗씠?곕? 李얠쓣 ???놁뒿?덈떎. ?곗씠?곕쿋?댁뒪瑜??뺤씤?댁＜?몄슂.');
      return;
    }

    setRangePages(pages);
    setCurrentPageIdx(0);
    setBibleData(pages[0]);
    setIsEditModalOpen(false);

    // ?좎뒪??硫붿떆吏濡?踰붿쐞 ?덈궡
    const message = selection.start_book === selection.end_book
      ? `${selection.start_book} ${selection.start_chapter}??~ ${selection.end_chapter}??留먯??낅땲??`
      : `${selection.start_book} ${selection.start_chapter}??~ ${selection.end_book} ${selection.end_chapter}??留먯??낅땲??`;

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
      .replace(/\d+/g, "")
      .replace(/[."'“”‘’]/g, "")
      .replace(/\.$/, "")
      .trim();
  };

  const setupAudioEvents = (audio: HTMLAudioElement, startTime: number, fromServer = false, isContinuous = false, currentIdx = 0) => {
    audioRef.current = audio;
    audio.currentTime = startTime;

    // ?꾩옱 ???곗씠??罹≪쿂 (?대줈?濡??명븳 stale state 諛⑹?)
    const currentChapterData = rangePages[currentIdx] || bibleData;

    // ?쒕쾭 ?뚯씪????duration 諛?吏꾪뻾 ?곹깭 ?낅뜲?댄듃
    setIsFromServer(fromServer);

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);

      // ?꾩껜 ?ъ깮 紐⑤뱶?????ㅼ쓬 ??誘몃━ 濡쒕뱶
      if (isContinuous && rangePages.length > 0 && currentIdx < rangePages.length - 1) {
        const nextChapter = rangePages[currentIdx + 1];
        preloadNextChapterAudio(nextChapter);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);

      // ?뚯꽦 ?깊겕: ?덈퀎 ?ㅽ겕濡?(?섏씠?쇱씠???쒓굅)
      if (verseRefs.current.length > 0 && audio.duration > 0) {
        const totalVerses = verseRefs.current.length;
        const estimatedVerseIndex = Math.floor((audio.currentTime / audio.duration) * totalVerses);
        const clampedIndex = Math.min(estimatedVerseIndex, totalVerses - 1);

        if (clampedIndex !== currentVerseIndex && verseRefs.current[clampedIndex]) {
          setCurrentVerseIndex(clampedIndex);
          // ?ㅽ겕濡ㅻ쭔 ?섑뻾 (?섏씠?쇱씠???쒓굅)
          verseRefs.current[clampedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    audio.onended = async () => {
      // ?먮룞 ?쎄린 ?꾨즺 泥섎━ (?꾩껜 ?ъ깮 紐⑤뱶?먯꽌??議곗슜??泥섎━)
      // ?꾩옱 ???곗씠?곕? ?꾨떖?섏뿬 ?щ컮瑜??μ뿉 湲곕줉
      await handleReadComplete(isContinuous, currentChapterData);

      // ?꾩껜 ?ъ깮 紐⑤뱶?????ㅼ쓬 ?μ쑝濡??먮룞 ?대룞
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
    // play()???ш린???몄텧?섏? ?딆쓬 - R2 ?뚯씪 loadeddata?먯꽌留??몄텧
    if (!fromServer) {
      // TTS ?앹꽦???뚯씪留?利됱떆 ?ъ깮
      audio.play().catch(e => console.log("?ъ깮 ?쒖옉 ?ㅻ쪟:", e));
    }
  };

  const handlePlayTTS = async (selectedVoice?: 'F' | 'M', skipPopup = false, isContinuous = false) => {
    if (!bibleData) return;

    if (window.navigator?.vibrate) window.navigator.vibrate(20);

    if (selectedVoice) {
      setVoiceType(selectedVoice);
      return;
    }

    // 2媛????댁긽?????ъ깮 諛⑹떇 ?좏깮 ?앹뾽
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

    // ?뚯씪 寃쎈줈 ?ㅼ젙 (reading ?대뜑)
    const bookOrder = bibleData.bible_books?.book_order || '0';
    const fileName = `reading/reading_b${bookOrder}_c${bibleData.chapter}_${targetVoice}.mp3`;

    try {
      // 1. R2?먯꽌 ?뚯씪 吏곸젒 濡쒕뱶 ?쒕룄
      const publicUrl = `https://pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev/${fileName}`;
      const savedAudio = new Audio(publicUrl);

      let errorOccurred = false;

      // 利됱떆 UI ?쒖떆
      audioRef.current = savedAudio;
      savedAudio.currentTime = lastTime;
      setShowAudioControl(true);
      setIsFromServer(true);

      // ?ㅻ뵒???대깽???ㅼ젙
      savedAudio.onloadedmetadata = () => {
        if (!errorOccurred) {
          setDuration(savedAudio.duration);
          // ?꾩껜 ?ъ깮 紐⑤뱶?????ㅼ쓬 ??誘몃━ 濡쒕뱶
          if (isContinuous && rangePages.length > 0 && currentPageIdx < rangePages.length - 1) {
            const nextChapter = rangePages[currentPageIdx + 1];
            preloadNextChapterAudio(nextChapter);
          }
        }
      };

      savedAudio.ontimeupdate = () => {
        if (!errorOccurred) {
          setCurrentTime(savedAudio.currentTime);
          // ?뚯꽦 ?깊겕: ?덈퀎 ?ㅽ겕濡?
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

      // ?먮윭 ?몃뱾???뺤쓽
      const errorHandler = async (e: Event) => {
        if (errorOccurred) return;
        errorOccurred = true;
        console.log('[Audio] R2 ?뚯씪 ?놁쓬, TTS ?앹꽦 ?쒖옉');

        // UI ?④린怨??ㅻ뵒???뺣━
        setShowAudioControl(false);
        setIsPlaying(false);
        audioRef.current = null;
        savedAudio.onloadedmetadata = null;
        savedAudio.ontimeupdate = null;
        savedAudio.onended = null;

        // TTS ?앹꽦
        await generateAndUploadTTS();
      };

      // ?뚯씪??濡쒕뱶?섎㈃ ?ъ깮 ?쒖옉
      savedAudio.addEventListener('loadeddata', () => {
        if (!errorOccurred) {
          savedAudio.removeEventListener('error', errorHandler); // error 由ъ뒪???쒓굅
          console.log('[Audio] R2 ?뚯씪 濡쒕뱶 ?깃났');
          setIsPlaying(true);
          savedAudio.play().catch(e => console.log('?ъ깮 ?쒖옉 ?ㅻ쪟:', e));
        }
      }, { once: true });

      // ?뚯씪???놁쑝硫?TTS ?앹꽦
      savedAudio.addEventListener('error', errorHandler, { once: true });

      return;

    } catch (error) {
      console.error("Audio ?ъ깮 ?먮윭:", error);
      setIsPlaying(false);
    }

    // TTS ?앹꽦 諛??낅줈???⑥닔
    async function generateAndUploadTTS() {
      try {
        // 2. ?レ옄 蹂??諛??띿뒪???뺤젣
        const toKorNum = (num: number | string) => {
          const n = Number(num);
          if (isNaN(n)) return String(num);
          return String(n);
        };

        // ??踰덊샇 ?쒓굅
        const mainContent = bibleData.content.replace(/\d+\.\s*/g, '');
        const unit = bibleData.bible_name === "시편" ? "편" : "장";
        const chapterKor = toKorNum(bibleData.chapter);
        // ?쒖꽌 蹂寃? 梨??대쫫 + ??癒쇱?, 洹??ㅼ쓬 留먯? ?댁슜 ('留먯?' ?쒓굅)
        const textToSpeak = `${bibleData.bible_name} ${chapterKor}${unit}. ${mainContent}.`;

        // 3. Azure API ?몄텧
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

        if (!response.ok) throw new Error("API ?몄텧 ?ㅽ뙣");

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const ttsAudio = new Audio(audioUrl);

        // 4. ?ㅻ뵒???ㅼ젙 諛??ъ깮
        setupAudioEvents(ttsAudio, lastTime, false, isContinuous, currentPageIdx);

        // R2 ?낅줈??(諛깃렇?쇱슫??
        (async () => {
          try {
            console.log('[R2 Upload] Uploading:', fileName);
            // 1. Presigned URL 諛쏄린
            const urlRes = await fetch('/api/audio/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName })
            });
            const { uploadUrl, publicUrl } = await urlRes.json();

            // 2. 吏곸젒 R2???낅줈??
            await fetch(uploadUrl, {
              method: 'PUT',
              body: audioBlob,
              headers: { 'Content-Type': 'audio/mp3' }
            });

            console.log('[R2 Upload] ??Success! URL:', publicUrl);
          } catch (error) {
            console.error('[R2 Upload] ??Failed:', error);
          }
        })();

      } catch (error) {
        console.error("Azure TTS ?먮윭:", error);
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
    let foundIdx = -1;
    for (let index = 0; index < verses.length; index++) {
      const verseNumber = Number(verses[index]);
      if (verseNumber >= targetVerse) {
        foundIdx = index;
        break;
      }
    }
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
      // R2?먯꽌 ?뚯씪 吏곸젒 濡쒕뱶 ?쒕룄
      const publicUrl = `https://pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev/${fileName}`;
      const savedAudio = new Audio(publicUrl);

      let errorOccurred = false;

      // 利됱떆 UI ?쒖떆
      audioRef.current = savedAudio;
      savedAudio.currentTime = 0;
      setShowAudioControl(true);
      setIsFromServer(true);

      // ?ㅻ뵒???대깽???ㅼ젙
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

      // ?먮윭 ?몃뱾???뺤쓽
      const errorHandlerContinuous = async (e: Event) => {
        if (errorOccurred) return;
        errorOccurred = true;
        console.log('[Audio Continuous] R2 ?뚯씪 ?놁쓬, TTS ?앹꽦 ?쒖옉');

        // UI ?④린怨??ㅻ뵒???뺣━
        setShowAudioControl(false);
        setIsPlaying(false);
        audioRef.current = null;
        savedAudio.onloadedmetadata = null;
        savedAudio.ontimeupdate = null;
        savedAudio.onended = null;

        // TTS ?앹꽦
        await generateContinuousTTS();
      };

      // ?뚯씪??濡쒕뱶?섎㈃ ?ъ깮 ?쒖옉
      savedAudio.addEventListener('loadeddata', () => {
        if (!errorOccurred) {
          savedAudio.removeEventListener('error', errorHandlerContinuous); // error 由ъ뒪???쒓굅
          console.log('[Audio Continuous] R2 ?뚯씪 濡쒕뱶 ?깃났');
          setIsPlaying(true);
          savedAudio.play().catch(e => console.log('?ъ깮 ?쒖옉 ?ㅻ쪟:', e));
        }
      }, { once: true });

      // ?뚯씪???놁쑝硫?TTS ?앹꽦
      savedAudio.addEventListener('error', errorHandlerContinuous, { once: true });

      return;

    } catch (error) {
      console.error("Audio ?ъ깮 ?먮윭:", error);
      setIsPlaying(false);
      setIsContinuousPlayMode(false);
    }

    async function generateContinuousTTS() {
      try {
        // ?쒕쾭???뚯씪???놁쑝硫?TTS API ?몄텧
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

        // R2 ?낅줈??(諛깃렇?쇱슫??
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

            console.log('[R2 Upload - Continuous] ??Success! URL:', publicUrl);
          } catch (error) {
            console.error('[R2 Upload - Continuous] ??Failed:', error);
          }
        })();

      } catch (error) {
        console.error("Azure TTS \uc5d0\ub7ec:", error);
        setIsPlaying(false);
        setIsContinuousPlayMode(false);
      }
    }
  };

  // ?ㅼ쓬 ???ㅻ뵒??誘몃━ 濡쒕뱶
  const preloadNextChapterAudio = async (nextChapter: any) => {
    if (!nextChapter) return;

    const targetVoice = voiceType;
    const bookOrder = nextChapter.bible_books?.book_order || '0';
    const fileName = `reading/reading_b${bookOrder}_c${nextChapter.chapter}_${targetVoice}.mp3`;

    try {
      // R2?먯꽌 ?뚯씪 吏곸젒 濡쒕뱶 ?쒕룄
      const publicUrl = `https://pub-240da6bd4a6140de8f7f6bfca3372b13.r2.dev/${fileName}`;
      const preloadAudio = new Audio(publicUrl);
      preloadAudio.preload = 'auto';

      let audioLoadFailed = false;
      let audioLoaded = false;

      preloadAudio.addEventListener('error', async () => {
        if (audioLoadFailed || audioLoaded) return;
        audioLoadFailed = true;
        console.log('[Audio Preload] R2 ?뚯씪 ?놁쓬, TTS ?앹꽦 ?쒖옉');

        // ?ㅽ뙣???ㅻ뵒???뺣━
        preloadAudio.pause();
        preloadAudio.src = '';

        // TTS ?앹꽦
        await generatePreloadTTS();
      }, { once: true });

      preloadAudio.addEventListener('canplay', () => {
        if (audioLoadFailed) return;
        audioLoaded = true;
        console.log('[Audio Preload] R2 ?뚯씪 濡쒕뱶 ?깃났');
        nextChapterAudioCache.current = preloadAudio;
      }, { once: true });

      // ?꾩떆濡?罹먯떆???좊떦 (canplay ?대깽?몄뿉???ы븷??
      nextChapterAudioCache.current = preloadAudio;
      return;

    } catch (error) {
      console.error("?ㅼ쓬 ??誘몃━ 濡쒕뱶 ?ㅽ뙣:", error);
    }

    async function generatePreloadTTS() {
      try {
        // ?쒕쾭???뚯씪???놁쑝硫?TTS API濡?誘몃━ ?앹꽦
        const toKorNum = (num: number | string) => {
          const n = Number(num);
          if (isNaN(n)) return String(num);
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

        if (!response.ok) throw new Error("API ?몄텧 ?ㅽ뙣");

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        nextChapterAudioCache.current = new Audio(audioUrl);
        nextChapterAudioCache.current.preload = 'auto';

        // R2 ?낅줈??(諛깃렇?쇱슫??
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

            console.log('[R2 Upload - Preload] ??Success! URL:', publicUrl);
          } catch (error) {
            console.error('[R2 Upload - Preload] ??Failed:', error);
          }
        })();

      } catch (error) {
        console.error("?ㅼ쓬 ??誘몃━ 濡쒕뱶 ?ㅽ뙣:", error);
      }
    }
  };

  const handleCopy = () => {
    if (bibleData) {
      navigator.clipboard.writeText(cleanContent(bibleData.content));

      // ?좎뒪??耳쒓퀬 2珥????꾧린
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);

      // ?낇떛 諛섏쓳
      if (window.navigator?.vibrate) window.navigator.vibrate(20);
    }
  };

  const handleShare = async () => {
    if (!bibleData) return;

    const unit = bibleData.bible_name === "시편" ? "편" : "장";
    const title = `${bibleData.bible_name} ${bibleData.chapter}${unit}`;

    // ??踰덊샇 ?ы븿???꾩껜 ?댁슜
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
        alert("留곹겕媛 ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("怨듭쑀 ?ㅽ뙣:", error);
      }
    }
  };

  // ?쎄린 ?꾨즺 痍⑥냼
  const handleBookmark = async () => {
    if (!bibleData) return;
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    const verseRef = `${bibleData.bible_name} ${bibleData.chapter}${bibleData.bible_name === "시편" ? "편" : "장"} ${bibleData.verse}`;
    const { error } = await supabase.from("verse_bookmarks").insert({
      user_id: user.id,
      source: "reading",
      verse_ref: verseRef,
      content: cleanContent(bibleData.content),
      memo: null,
    });

    if (error) {
      if (error.code === "23505") {
        alert("?대? ??λ맂 留먯??낅땲??");
        return;
      }
      alert("利먭꺼李얘린 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.");
      return;
    }

    alert("湲곕줉?⑥뿉 ??λ릺?덉뒿?덈떎.");
  };

  const handleReadCancel = useCallback(async () => {
    if (!user || !bibleData) return;

    try {
      // DB?먯꽌 read_count 1 媛먯냼 (理쒖냼 0)
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
          // 0???섎㈃ ?덉퐫????젣
          await supabase
            .from('user_reading_records')
            .delete()
            .eq('user_id', user.id)
            .eq('book_name', bibleData.bible_name)
            .eq('chapter', bibleData.chapter);
        } else {
          // 1 媛먯냼
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

        // 濡쒖뺄 ?곹깭 ?낅뜲?댄듃
        await checkCurrentChapterReadStatus();

        // ?낇떛 ?쇰뱶諛?(痍⑥냼 ?⑦꽩 - 3踰?吏꾨룞)
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        // 痍⑥냼 ?좎뒪???쒖떆
        setShowCancelToast(true);
        setTimeout(() => setShowCancelToast(false), 2000);
      }
    } catch (error) {
      console.error('?쎄린 ?꾨즺 痍⑥냼 ?ㅽ뙣:', error);
    }
  }, [user, bibleData]);

  const prepareReadingGroupLink = useCallback(
    async (sourceRowId: string, label: string) => {
      if (!user?.id) return;
      const groups = await fetchMyGroups(user.id);
      if (groups.length === 0) return;

      setPendingGroupLinkLabel(label);
      setShowGroupLinkModal(true);
    },
    [user?.id]
  );

  const closeReadingGroupLinkFlow = () => {
    setShowGroupLinkPrompt(false);
    setShowGroupLinkModal(false);
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
      alert("紐⑥엫 ?좎븰?앺솢???곌껐?섏뿀?듬땲??");
    } catch (error) {
      console.error("reading group link failed:", error);
      alert("紐⑥엫 ?곌껐???ㅽ뙣?덉뒿?덈떎.");
    } finally {
      setLinkingGroupId(null);
    }
  };

  const handleReadComplete = async (silent = false, chapterData = bibleData) => {
    // 留먯????놁쑝硫??쎄린 ?꾨즺 遺덇?
    if (!chapterData) {
      if (!silent) {
        setShowWarningToast(true);
        setTimeout(() => setShowWarningToast(false), 2000);
      }
      return;
    }

    // ??＝ ?④낵 (?꾩껜 ?ъ깮 紐⑤뱶媛 ?꾨땺 ?뚮쭔)
    if (!silent) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#f897c4', '#88B04B', '#FFD700']
      });

      // ?낇떛 ?쇰뱶諛?(吏㏃? 吏꾨룞)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }

    // 濡쒓렇???뺤씤
    // 鍮꾨줈洹몄씤 ?ъ슜?먮뒗 濡쒓렇??紐⑤떖 ?쒖떆
    if (!user) {
      console.log('?ъ슜???놁쓬 - 濡쒓렇??紐⑤떖 ?쒖떆');
      if (!silent) {
        // ??＝怨??숈떆??濡쒓렇???앹뾽 ?쒖떆
        setShowLoginModal(true);
      }
      return;
    }

    // 濡쒓렇???곹깭硫??쎄린 ?꾨즺 湲곕줉 ???(梨????⑥쐞)
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

        // upsert ?ъ슜: ?덉쑝硫??낅뜲?댄듃, ?놁쑝硫??앹꽦
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

        // 吏꾪뻾瑜??낅뜲?댄듃
        const key = `${chapterData.bible_name}_${chapterData.chapter}`;
        setReadingProgress(prev => ({ ...prev, [key]: 100 }));

        // ?쎄린 ?곹깭 ?ㅼ떆 ?뺤씤 (?잛닔 諛??곹깭 ?낅뜲?댄듃)
        await checkCurrentChapterReadStatus();

        if (!silent && savedRecord?.id) {
          await prepareReadingGroupLink(String(savedRecord.id), `${chapterData.bible_name} ${chapterData.chapter}장`);
        }
      } catch (error) {
        console.error('?쎄린 ?꾨즺 ????ㅽ뙣:', error);
      }
    }
  };

  // 濡깊봽?덉뒪 ?대깽??由ъ뒪??(?곗튂 ?쒖옉 利됱떆 ?먰삎 吏꾪뻾 諛??쒖떆)

  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) { // ?댁쟾 ?좎쭨
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      // 怨쇨굅 ?좎쭨濡??대룞?섎㈃ 踰붿쐞 ?좏깮 ?댁젣
      setRangePages([]);
      setBibleData(null);
      setNoReadingForDate(false); // 硫붿떆吏 源쒕컯??諛⑹?
      setCurrentDate(d);
    } else if (info.offset.x < -100) { // ?ㅼ쓬 ?좎쭨
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) {
        const isGoingToToday = d.toDateString() === today.toDateString();
        // ?ㅻ뒛濡??뚯븘媛??寃??꾨땲硫?踰붿쐞 ?좏깮 ?댁젣
        if (!isGoingToToday) {
          setRangePages([]);
          setBibleData(null);
          setNoReadingForDate(false); // 硫붿떆吏 源쒕컯??諛⑹?
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
              onClick={() => setShowCalendarModal(true)}
              className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform"
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
          <h2 className="font-black text-zinc-900 tracking-tighter shrink-0" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <div className="flex-1 flex justify-start pl-3">
            {currentDate.toDateString() === today.toDateString() ? (
              <div className="flex items-center gap-2">
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
              </div>
            ) : (
              <div className="w-[28px] h-[28px]" aria-hidden="true" />
            )}
          </div>
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
                {/* 異쒖쿂 ?곸뿭 - ?곷떒?쇰줈 ?대룞 */}
                <span className="self-center text-center font-bold text-[#4A6741] opacity-60 mb-6" style={{ fontSize: `${fontSize * 0.9}px` }}>
                  {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === "시편" ? "편" : "장"} {bibleData.verse ? `${bibleData.verse}절` : ""}
                </span>

                {/* 留먯? 蹂몃Ц ?곸뿭 - ?믪씠 怨좎젙 諛??ㅽ겕濡?異붽? */}
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
                  ?쎌? 留먯????놁뒿?덈떎
                </p>
              </div>
            ) : isLoadingVerse ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
                <Loader2 size={48} className="text-zinc-200 animate-spin" strokeWidth={1.5} />
                <p className="text-zinc-400 text-sm font-medium text-center">
                  ?쎌? 留먯? 遺덈윭?ㅻ뒗 以?..
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
                <NotebookPen size={48} className="text-zinc-200" strokeWidth={1.5} />
                <p className="text-zinc-400 text-sm font-medium text-center">
                  ?곗륫 ?곷떒 踰꾪듉???뚮윭<br />
                  ?쎌쓣 踰붿쐞瑜??좏깮?댁＜?몄슂
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
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>?뚯꽦 ?ъ깮</span>
        </button>
        <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>留먯? 蹂듭궗</span>
        </button>
        <button onClick={handleBookmark} className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>怨듭쑀</span></button>
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
            onClick={() => void handleReadComplete()}
            whileTap={{ scale: 0.9 }}
            className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500
              ${isReadCompleted ? 'bg-[#4A6741] text-white' : 'bg-white text-gray-400 border border-green-50'}`}
          >
            <Check className={`w-6 h-6 ${isReadCompleted ? 'text-white animate-pulse' : ''}`} strokeWidth={3} />
            <span className="font-bold" style={{ fontSize: `${fontSize * 0.85}px` }}>?쎄린?꾨즺</span>
            {user && readCount > 0 && (
              <span className="text-xs mt-0.5 opacity-80" style={{ fontSize: `${fontSize * 0.65}px` }}>
                {readCount}??
              </span>
            )}
          </motion.button>

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
      {isReadCompleted && (
        <div className="mt-1 pb-6 flex items-center justify-center gap-2">
          <div className="rounded-full border border-rose-200 bg-rose-50">
            <button
              onClick={() => void handleReadCancel()}
              className="px-3 py-1.5 text-xs font-bold text-rose-500 rounded-full transition-colors hover:bg-rose-100"
            >
              읽기 취소
            </button>
          </div>
          {currentDate.toDateString() === today.toDateString() && (
            <div className="rounded-full border border-[#4A6741]/20 bg-[#4A6741]/10">
              <button
                onClick={() => setShowGroupLinkModal(true)}
                className="px-3 py-1.5 text-xs font-bold text-[#4A6741] rounded-full transition-colors hover:bg-[#4A6741]/20 flex items-center gap-1"
              >
                <Share2 size={12} /> 모임에 연결
              </button>
            </div>
          )}
        </div>
      )}
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
              {/* ?좏깮 ?곹깭 ?쒖떆 諛??대┃ 媛?ν븳 ?몃뵒耳?댄꽣 */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {/* ?쒖옉 踰붿쐞 */}
                <div className="flex items-center gap-1 bg-green-50 py-2 px-4 rounded-full font-bold text-[#4A6741]" style={{ fontSize: `${fontSize * 0.625}px` }}>
                  <span className="opacity-60">?쒖옉:</span>
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
                      ??
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
                      ??
                      <button
                        onClick={() => { setSelectionPhase('start'); setSelectionStep('chapter'); loadChapters(tempSelection.start_book); }}
                        className="underline underline-offset-2 hover:text-[#4A6741]"
                      >
                        {tempSelection.start_chapter}??
                      </button>
                    </>
                  )}
                </div>

                {/* 醫낅즺 踰붿쐞 */}
                {tempSelection.start_chapter > 0 && (
                  <div className="flex items-center gap-1 bg-blue-50 py-2 px-4 rounded-full font-bold text-blue-700" style={{ fontSize: `${fontSize * 0.625}px` }}>
                    <span className="opacity-60">醫낅즺:</span>
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
                        ??
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
                        ??
                        <button
                          onClick={() => { setSelectionPhase('end'); setSelectionStep('chapter'); loadChapters(tempSelection.end_book); }}
                          className="underline underline-offset-2 hover:text-blue-700"
                        >
                          {tempSelection.end_chapter}??
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ?ㅼ떆 ?뺥븯湲?踰꾪듉 */}
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
                      // localStorage 珥덇린??
                      localStorage.removeItem('reading_selection');
                      localStorage.removeItem('reading_pages');
                      localStorage.removeItem('reading_page_idx');
                    }}
                    className="py-2 px-4 bg-red-50 text-red-600 rounded-full"
                    style={{ fontSize: `${fontSize * 0.625}px` }}
                  >
                    ?ㅼ떆 ?뺥븯湲?
                  </button>
                )}
              </div>

              {/* ?④퀎蹂??쒕ぉ */}
              <h3 className="text-xl font-black mb-6 text-zinc-900">
                {selectionPhase === 'start' && '시작 범위를 정해주세요'}
                {selectionPhase === 'end' && '종료 범위를 정해주세요'}
              </h3>

              <h4 className="text-sm font-bold mb-3 text-zinc-500">
                {selectionStep === 'testament' && '구약 또는 신약을 선택하세요'}
                {selectionStep === 'book' && '권을 선택하세요'}
                {selectionStep === 'chapter' && '장을 선택하세요'}
              </h4>

              <div className="grid grid-cols-4 gap-2">
                {/* ?좎빟/援ъ빟 ?좏깮 */}
                {selectionStep === 'testament' &&
                  ['구약', '신약'].map(t => {
                    // 援ъ빟/?좎빟 ?꾩껜 吏꾪뻾瑜?怨꾩궛 (紐⑤뱺 梨??ы븿)
                    const testamentBooks = BIBLE_BOOKS[t as '구약' | '신약'] || [];
                    let totalProgress = 0;

                    testamentBooks.forEach(book => {
                      const bookProgress = readingProgress[`${book}_total`];
                      // ?쎄린 ?대젰???녿뒗 梨낆? 0%濡?怨꾩궛
                      totalProgress += (bookProgress || 0);
                    });

                    // ?뚯닽??1?먮━源뚯? 怨꾩궛 (?꾩껜 梨??섎줈 ?섎닎)
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
                        className={`py-5 rounded-2xl font-bold col-span-4 text-lg ${hasProgress
                          ? 'bg-green-100 text-[#4A6741] border-2 border-green-300 hover:bg-green-200'
                          : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>{t}</span>
                          {user && (
                            <span className={`text-xs font-bold ${hasProgress ? 'text-[#4A6741]' : 'text-zinc-400'
                              }`}>
                              {avgProgress}%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                {/* 沅??좏깮 */}
                {selectionStep === 'book' && (() => {
                  const testament = selectionPhase === 'start' ? tempSelection.start_testament : tempSelection.end_testament;
                  const startBookOrder = tempSelection.start_book ? bookOrderMap[tempSelection.start_book] : null;

                  return BIBLE_BOOKS[testament as '구약' | '신약']?.map(b => {
                    const bookProgress = readingProgress[`${b}_total`];
                    const displayProgress = bookProgress !== undefined ? bookProgress : 0;
                    const hasProgress = displayProgress > 0;

                    // 醫낅즺 踰붿쐞 ?좏깮 ???쒖옉 沅뚮낫???욎뿉 ?덈뒗 沅뚯? 鍮꾪솢?깊솕
                    const currentBookOrder = bookOrderMap[b];
                    const isDisabled = selectionPhase === 'end' && startBookOrder !== null &&
                      currentBookOrder < startBookOrder;

                    return (
                      <button
                        key={b}
                        disabled={isDisabled}
                        onClick={() => loadChapters(b)}
                        className={`py-3 rounded-xl text-sm font-bold relative ${isDisabled
                          ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                          : hasProgress
                            ? 'bg-green-100 text-[#4A6741] border-2 border-green-300 hover:bg-green-200'
                            : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{b}</span>
                          {user && !isDisabled && (
                            <span className={`text-[9px] font-bold ${hasProgress ? 'text-[#4A6741]' : 'text-zinc-400'
                              }`}>
                              {displayProgress}%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  });
                })()}

                {/* ???좏깮 */}
                {selectionStep === 'chapter' &&
                  availableChapters.map(ch => {
                    const currentBook = selectionPhase === 'start' ? tempSelection.start_book : tempSelection.end_book;
                    const progressKey = `${currentBook}_${ch}`;
                    const readCount = readingProgress[progressKey] || 0;
                    const hasBeenRead = readCount > 0;

                    // 醫낅즺 踰붿쐞 ?좏깮 ???쒖옉 ?λ낫???묒? ?μ? 鍮꾪솢?깊솕
                    const isDisabled = selectionPhase === 'end' &&
                      tempSelection.start_book === tempSelection.end_book &&
                      ch < tempSelection.start_chapter;

                    // ?쒖옉/醫낅즺 ???쒖떆
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
                              end_testament: tempSelection.start_testament, // 醫낅즺 踰붿쐞???숈씪?섍쾶 ?ㅼ젙
                              end_book: tempSelection.start_book // 醫낅즺 梨낅룄 ?쒖옉 梨낃낵 ?숈씪?섍쾶 ?ㅼ젙
                            };
                            setTempSelection(updatedSelection);
                            setSelectionPhase('end');
                            // 醫낅즺 踰붿쐞??諛붾줈 ???좏깮?쇰줈 (媛숈? 梨낆씠誘濡?
                            // ?ㅻⅨ 梨??좏깮?섎젮硫??ㅻ줈媛湲?媛??
                            loadChapters(tempSelection.start_book);
                          } else {
                            // 醫낅즺 踰붿쐞 ?좏깮 ?꾨즺 -> ?뺤씤 紐⑤떖 ?쒖떆
                            const updatedSelection = {
                              ...tempSelection,
                              end_chapter: ch
                            };
                            setTempSelection(updatedSelection);
                            setPendingSelection(updatedSelection);
                            setShowConfirmModal(true);
                          }
                        }}
                        className={`py-3 rounded-xl font-bold relative overflow-hidden transition-all ${isDisabled
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
                            {isStartChapter && <span className="text-[9px]">?쒖옉</span>}
                            <span>{ch}</span>
                            {isEndChapter && <span className="text-[9px]">醫낅즺</span>}
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
                ?リ린
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ActivityCalendarModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        selectedDate={currentDate}
        onSelectDate={handleDateChange}
        highlightedDateKeys={activityDateKeys}
        maxDate={today}
        title="?듬룆 ?좎쭨 ?좏깮"
      />

      <ActivityGroupLinkModal
        open={showGroupLinkModal}
        onOpenChange={setShowGroupLinkModal}
        user={user ? { id: user.id } : null}
        activityType="reading"
        activityDate={currentDate}
      />

      {/* 濡쒓렇??紐⑤떖 */}
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />

      {/* 留먯? 踰붿쐞 ?뺤씤 紐⑤떖 */}
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
              <h3 className="text-lg font-bold mb-4 text-center">?좏깮?섏떊 留먯? 踰붿쐞</h3>
              <div className="bg-zinc-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">?쒖옉:</span>
                  <span className="font-bold">
                    {pendingSelection.start_book} {pendingSelection.start_chapter}??
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">醫낅즺:</span>
                  <span className="font-bold">
                    {pendingSelection.end_book} {pendingSelection.end_chapter}??
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-bold hover:bg-zinc-200 transition-colors"
                >
                  痍⑥냼
                </button>
                <button
                  onClick={() => {
                    loadRangePagesWithSelection(pendingSelection);
                    setShowConfirmModal(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3d5536] transition-colors"
                >
                  ?뺤씤
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ?ъ깮 諛⑹떇 ?좏깮 ?앹뾽 */}
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
                ?ъ깮 諛⑹떇???좏깮?댁＜?몄슂
              </h3>
              <p className="text-sm text-zinc-500 mb-6 text-center">
                {currentPageIdx === 0 ? `${rangePages.length}개의 말씀이 있습니다` : `현재 절 포함 ${rangePages.length - currentPageIdx}개의 말씀이 있습니다`}
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
                  {currentPageIdx === 0 ? `전체 범위 재생 (${rangePages.length}개)` : `나머지 범위 재생 (${rangePages.length - currentPageIdx}개)`}
                </button>

                <button
                  onClick={() => {
                    setShowPlayModePopup(false);
                    setIsContinuousPlayMode(false);
                    handlePlayServerAudio({ continuous: false, skipSelector: true });
                  }}
                  className="w-full py-4 bg-white border-2 border-[#4A6741] text-[#4A6741] rounded-2xl font-bold text-base hover:bg-green-50 transition-colors"
                >
                  ?꾩옱 ?λ쭔 ?ъ깮 (1?μ뵫)
                </button>

                <button
                  onClick={() => setShowPlayModePopup(false)}
                  className="w-full py-3 text-zinc-400 font-medium text-sm"
                >
                  痍⑥냼
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* 留먯? 蹂듭궗 ?좎뒪??*/}
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
            留먯???蹂듭궗?섏뿀?듬땲??
          </motion.div>
        )}
      </AnimatePresence>

      {/* 踰붿쐞 ?좏깮 ?꾨즺 ?좎뒪??*/}
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

      {/* 濡쒓렇???덈궡 ?좎뒪??*/}
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
            濡쒓렇?명븯?쒕㈃ ?쎌? 留먯???湲곕줉?섍퀬 愿由ы븷 ???덉뒿?덈떎!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ?쎄린 ?꾨즺 痍⑥냼 ?좎뒪??(鍮④컙?? */}
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
            ?쎄린 ?꾨즺媛 痍⑥냼?섏뿀?듬땲??
          </motion.div>
        )}
      </AnimatePresence>

      {/* 寃쎄퀬 ?좎뒪??(鍮④컙?? */}
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
            ?쎌쓣 留먯???癒쇱? ?뺥빐二쇱꽭??
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
