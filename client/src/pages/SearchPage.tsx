import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from "wouter";
import { Search, ChevronDown, ArrowUp, CheckCircle2, RotateCcw, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BIBLE_BOOKS } from "@/lib/bibleData";
import { useAuth } from "@/hooks/use-auth";
import { useDisplaySettings } from "@/components/DisplaySettingsProvider";
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from "framer-motion";

// 페이지당 불러올 개수
const PAGE_SIZE = 50;

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { fontSize } = useDisplaySettings();

  // 상태 관리
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // 필터 상태
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [selectedBook, setSelectedBook] = useState<string>('ALL');
  const [availableBookIds, setAvailableBookIds] = useState<number[] | null>(null);

  // 뷰 모드 및 정보
  const [viewMode, setViewMode] = useState<'SEARCH' | 'CHAPTER'>('SEARCH');
  const [currentChapterInfo, setCurrentChapterInfo] = useState<{ bookName: string, bookId: number, chapter: number } | null>(null);
  const [isRead, setIsRead] = useState(false);
  const [readCount, setReadCount] = useState(0);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollObserver = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 롱프레스 관련 refs
  const readCompleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const longPressStartTimeRef = useRef<number>(0);
  const isLongPressingRef = useRef(false);
  const pressStartedRef = useRef(false);
  const longPressCancelledRef = useRef(false);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // 성경 서적 데이터 맵핑
  const bookAliasMap = React.useMemo(() => {
    const map: Record<string, { id: number, name: string }> = {};
    BIBLE_BOOKS.forEach((b, idx) => {
      const id = idx + 1;
      map[b.name] = { id, name: b.name };
      map[b.name.substring(0, 1)] = { id, name: b.name };
      map[b.name.substring(0, 2)] = { id, name: b.name };
      if (b.name === "창세기") map["창"] = { id, name: b.name };
      if (b.name === "출애굽기") map["출"] = { id, name: b.name };
      if (b.name === "레위기") map["레"] = { id, name: b.name };
      if (b.name === "민수기") map["민"] = { id, name: b.name };
      if (b.name === "신명기") map["신"] = { id, name: b.name };
      if (b.name === "여호수아") map["여"] = { id, name: b.name };
      if (b.name === "사사기") map["삿"] = { id, name: b.name };
      if (b.name === "마태복음") map["마"] = { id, name: b.name };
      if (b.name === "마가복음") map["막"] = { id, name: b.name };
      if (b.name === "누가복음") map["눅"] = { id, name: b.name };
      if (b.name === "요한복음") map["요"] = { id, name: b.name };
      if (b.name === "사도행전") map["행"] = { id, name: b.name };
      if (b.name === "고린도전서") map["고전"] = { id, name: b.name };
      if (b.name === "고린도후서") map["고후"] = { id, name: b.name };
    });
    return map;
  }, []);

  // 검색어에서 책 정보 추출
  const identifiedBook = React.useMemo(() => {
    const input = searchInput.trim();
    if (!input) return null;
    const refMatch = input.match(/^([가-힣]{1,5})\s*(\d+)?(?::(\d+))?\s*(장|편)?$/);
    if (refMatch) {
      const bookName = refMatch[1];
      return bookAliasMap[bookName] || null;
    }
    return null;
  }, [searchInput, bookAliasMap]);

  // 키워드 기반 성경권 필터링
  useEffect(() => {
    const fetchFilteredBooks = async () => {
      const pureKeyword = identifiedBook ? searchInput.replace(/[가-힣]{1,5}\s*\d*(장|편)?(:(\d+))?/, '').trim() : searchInput.trim();

      // 검색어가 짧거나 없으면 필터링 해제
      if (!pureKeyword || pureKeyword.length < 2) {
        setAvailableBookIds(null);
        return;
      }

      try {
        // 키워드가 포함된 절들의 book_id를 추출 (RPC 사용이 가장 좋으나, 여기선 간단히 쿼리)
        // 너무 많은 전체 조회를 피하기 위해 book_id만 가져옴
        const { data, error } = await supabase
          .from('bible_verses')
          .select('book_id')
          .ilike('content', `%${pureKeyword}%`)
          .limit(1000); // 어느 정도 샘플링

        if (data && !error) {
          const ids = Array.from(new Set(data.map(d => d.book_id)));
          setAvailableBookIds(ids);
        }
      } catch (err) {
        console.error('Book filtering error:', err);
      }
    };

    const debounce = setTimeout(fetchFilteredBooks, 500);
    return () => clearTimeout(debounce);
  }, [searchInput, identifiedBook]);

  // 세션 스토리지 복원
  useEffect(() => {
    const savedState = sessionStorage.getItem('searchPageState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setSearchInput(state.searchInput || '');
        setResults(state.results || []);
        setViewMode(state.viewMode || 'SEARCH');
        setPage(state.page || 0);
        setHasMore(state.hasMore || false);
        setTestamentFilter(state.testamentFilter || 'ALL');
        setSelectedBook(state.selectedBook || 'ALL');
        setCurrentChapterInfo(state.currentChapterInfo || null);
        if (state.scrollPos) setTimeout(() => window.scrollTo(0, state.scrollPos), 100);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    const state = { searchInput, results, viewMode, page, hasMore, testamentFilter, selectedBook, currentChapterInfo, scrollPos: window.scrollY };
    sessionStorage.setItem('searchPageState', JSON.stringify(state));
  }, [searchInput, results, viewMode, page, hasMore, testamentFilter, selectedBook, currentChapterInfo]);

  // 통독 상태 확인
  const checkReadStatus = async (bookName: string, chapter: number) => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_reading_records')
        .select('read_count')
        .eq('user_id', user.id)
        .eq('book_name', bookName)
        .eq('chapter', chapter)
        .maybeSingle();
      const count = data?.read_count || 0;
      setReadCount(count);
      setIsRead(count > 0);
    } catch (err) { console.error(err); }
  };

  const handleReadComplete = async (silent = false) => {
    if (!currentChapterInfo) return;
    const { bookName, chapter } = currentChapterInfo;
    if (!silent) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#f897c4', '#88B04B', '#FFD700'] });
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
    }
    if (!user) return;
    try {
      const { data: existing } = await supabase.from('user_reading_records').select('read_count').eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter).maybeSingle();
      const newCount = existing ? existing.read_count + 1 : 1;
      await supabase.from('user_reading_records').upsert({ user_id: user.id, date: new Date().toISOString().split('T')[0], book_name: bookName, chapter: chapter, read_count: newCount, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book_name,chapter' });
      await checkReadStatus(bookName, chapter);
    } catch (e) { console.error(e); }
  };

  const handleReadCancel = async () => {
    if (!user || !currentChapterInfo) return;
    const { bookName, chapter } = currentChapterInfo;
    try {
      const { data: existing } = await supabase.from('user_reading_records').select('read_count').eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter).maybeSingle();
      if (existing && existing.read_count > 0) {
        const newCount = existing.read_count - 1;
        if (newCount === 0) {
          await supabase.from('user_reading_records').delete().eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter);
        } else {
          await supabase.from('user_reading_records').update({ read_count: newCount, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter);
        }
        await checkReadStatus(bookName, chapter);
        if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
      }
    } catch (e) { console.error(e); }
  };

  // 롱프레스 로직
  useEffect(() => {
    const button = readCompleteButtonRef.current;
    if (!button) return;
    const handleStart = (e: any) => {
      pressStartedRef.current = true;
      longPressStartTimeRef.current = Date.now();
      if (!isRead) return;
      isLongPressingRef.current = true;
      setIsLongPressing(true);
      const animate = () => {
        const elapsed = Date.now() - longPressStartTimeRef.current;
        if (elapsed >= 1000) {
          handleReadCancel();
          longPressCancelledRef.current = true;
          isLongPressingRef.current = false;
          setIsLongPressing(false);
        } else if (isLongPressingRef.current) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    };
    const handleEnd = () => {
      if (pressStartedRef.current && !longPressCancelledRef.current) handleReadComplete();
      pressStartedRef.current = false;
      isLongPressingRef.current = false;
      setIsLongPressing(false);
      longPressCancelledRef.current = false;
    };
    button.addEventListener('touchstart', handleStart);
    button.addEventListener('touchend', handleEnd);
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
  }, [isRead, currentChapterInfo]);

  const performSearch = async (newSearch: boolean = true) => {
    const input = searchInput.trim();
    if (!input && selectedBook === 'ALL' && testamentFilter === 'ALL') {
      setResults([]); setViewMode('SEARCH'); return;
    }
    setLoading(true);
    const startPage = newSearch ? 0 : page + 1;
    try {
      const queryBook = identifiedBook;
      let queryChapter = null;
      let queryVerse = null;
      if (queryBook) {
        const refMatch = input.match(/^([가-힣]{1,5})\s*(\d+)?(?::(\d+))?\s*(장|편)?$/);
        if (refMatch) {
          queryChapter = refMatch[2] ? parseInt(refMatch[2]) : null;
          queryVerse = refMatch[3] ? parseInt(refMatch[3]) : null;
        }
        const bookObj = BIBLE_BOOKS.find(b => b.name === queryBook.name);
        if (bookObj) {
          setTestamentFilter(bookObj.testament as any);
          setSelectedBook(queryBook.id.toString());
        }
      }
      let query = supabase.from('bible_verses').select('*', { count: 'exact' });
      if (queryBook && queryChapter && !queryVerse) {
        setViewMode('CHAPTER');
        setCurrentChapterInfo({ bookName: queryBook.name, bookId: queryBook.id, chapter: queryChapter });
        checkReadStatus(queryBook.name, queryChapter);
        query = query.eq('book_id', queryBook.id).eq('chapter', queryChapter);
        const { data, error } = await query.order('verse', { ascending: true });
        if (error) throw error;
        setResults(data || []); setHasMore(false);
      } else {
        setViewMode('SEARCH'); setCurrentChapterInfo(null);
        if (queryBook) query = query.eq('book_id', queryBook.id);
        if (queryChapter) query = query.eq('chapter', queryChapter);
        if (queryVerse) query = query.eq('verse', queryVerse);

        let pureKeyword = input;
        if (identifiedBook) {
          const bookRegex = new RegExp(`^${identifiedBook.name}|^${input.match(/^([가-힣]{1,5})/)?.[1]}`, 'g');
          pureKeyword = pureKeyword.replace(bookRegex, '').replace(/\s*\d*(장|편)?(:(\d+))?/, '').trim();
        }
        if (pureKeyword) query = query.ilike('content', `%${pureKeyword}%`);
        if (!queryBook) {
          if (testamentFilter !== 'ALL') query = query.eq('testament', testamentFilter);
          if (selectedBook !== 'ALL') query = query.eq('book_id', selectedBook);
        }
        const from = startPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error, count } = await query.order('book_id', { ascending: true }).order('chapter', { ascending: true }).order('verse', { ascending: true }).range(from, to);
        if (error) throw error;
        const newResults = newSearch ? (data || []) : [...results, ...(data || [])];
        setResults(newResults); setHasMore(count ? newResults.length < count : false); setPage(startPage);
      }
      if (newSearch) window.scrollTo({ top: 0 });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (loading || !hasMore || viewMode === 'CHAPTER') return;
    if (scrollObserver.current) scrollObserver.current.disconnect();
    scrollObserver.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting) performSearch(false); });
    if (bottomRef.current) scrollObserver.current.observe(bottomRef.current);
    return () => scrollObserver.current?.disconnect();
  }, [loading, hasMore, results, viewMode]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const highlightKeyword = (text: string) => {
    if (viewMode === 'CHAPTER' || !searchInput) return text;
    const keyword = identifiedBook ? searchInput.replace(/[가-힣]{1,5}\s*\d*(장|편)?(:(\d+))?/, '').trim() : searchInput.trim();
    if (!keyword || keyword.length < 1) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) => part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} className="bg-yellow-200 font-bold">{part}</mark> : part);
  };

  const resetAll = () => {
    setSearchInput('');
    setTestamentFilter('ALL');
    setSelectedBook('ALL');
    setResults([]);
    setViewMode('SEARCH');
    setAvailableBookIds(null);
    sessionStorage.removeItem('searchPageState');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* 헤더 섹션 */}
      <div className="fixed top-14 left-0 right-0 z-[100] bg-white border-b border-zinc-100 shadow-sm">
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* 상단 레이어: 검색바 세트 */}
          <div className="flex gap-2 h-11">
            <div className="relative group flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch(true)}
                placeholder="예: 창세기 1, 요 3:16, 사랑, 은혜..."
                className="w-full h-full pl-12 pr-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-[15px] outline-none focus:border-[#4A6741] focus:ring-4 focus:ring-[#4A6741]/5 transition-all"
              />
              <Search className="absolute left-4 top-3 w-5 h-5 text-zinc-400 group-focus-within:text-[#4A6741] transition-colors" />
            </div>
            <div className="flex gap-1.5 shrink-0 h-full">
              <button
                onClick={() => performSearch(true)}
                className="h-full px-6 bg-[#4A6741] text-white text-sm font-bold rounded-xl hover:bg-[#3d5636] transition-colors shadow-sm"
              >
                검색
              </button>
              <button
                onClick={resetAll}
                className="w-11 h-11 flex items-center justify-center bg-zinc-100 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-colors"
                title="초기화"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 하단 레이어: 필터 세트 (양측 정렬) */}
          <div className="flex gap-2 items-center justify-between h-11">
            {/* 왼쪽: 구약/신약/전체 */}
            <div className="flex gap-2 h-full">
              {(['ALL', 'OT', 'NT'] as const).map((f) => {
                const isDisabled = !!identifiedBook;
                return (
                  <button
                    key={f}
                    disabled={isDisabled}
                    onClick={() => { setTestamentFilter(f); setResults([]); }}
                    className={`px-5 h-full rounded-full text-xs font-dm-sans font-bold transition-all border ${testamentFilter === f ? 'bg-[#4A6741] text-white border-[#4A6741] shadow-md shadow-[#4A6741]/20' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
                  </button>
                );
              })}
            </div>

            {/* 오른쪽: 구분선 + 권 선택 */}
            <div className="flex items-center gap-2 h-full">
              <div className="h-6 w-[1px] bg-zinc-200 mx-1 shrink-0" />
              <div className="relative h-full">
                <select
                  disabled={!!identifiedBook}
                  className={`h-full pl-4 pr-10 bg-white border border-zinc-200 rounded-full text-xs font-bold text-zinc-700 outline-none appearance-none w-[130px] hover:border-zinc-300 transition-all ${identifiedBook ? 'opacity-40 cursor-not-allowed' : ''}`}
                  value={selectedBook}
                  onChange={(e) => { setSelectedBook(e.target.value); setResults([]); }}
                >
                  <option value="ALL">권 선택</option>
                  {BIBLE_BOOKS.map((book, idx) => {
                    // 키워드가 있는 경우 매칭되는 권만 표시 (identifiedBook이 아닌 키워드 검색 시)
                    const bookId = idx + 1;
                    const isAvailable = !availableBookIds || availableBookIds.includes(bookId);
                    if (!isAvailable) return null;
                    return <option key={book.name} value={bookId}>{book.name}</option>;
                  })}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="pt-48 px-4 max-w-2xl mx-auto">
        {viewMode === 'CHAPTER' && currentChapterInfo && (
          <div className="mt-4 mb-10 text-center animate-in zoom-in-95 duration-300">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {currentChapterInfo.bookName} {currentChapterInfo.bookName === '시편' ? `${currentChapterInfo.chapter}편` : `${currentChapterInfo.chapter}장`}
            </h1>
          </div>
        )}

        <div className="space-y-4">
          {loading && results.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-[#4A6741]/20 border-t-[#4A6741] rounded-full animate-spin" />
              <p className="text-zinc-400 font-bold">말씀을 찾고 있습니다...</p>
            </div>
          )}

          {!loading && results.length === 0 && !searchInput && selectedBook === 'ALL' && (
            <div className="py-20 text-center animate-in fade-in duration-1000">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-zinc-300" />
              </div>
              <h2 className="text-xl font-bold text-zinc-800 mb-2 font-dm-sans">어떤 말씀을 찾으시나요?</h2>
              <p className="text-zinc-400 text-sm leading-relaxed px-10">
                키워드나 성경 구절(창 1:1)을 입력하여<br />하나님의 말씀을 검색해보세요.
              </p>
            </div>
          )}

          {!loading && results.length === 0 && (searchInput || selectedBook !== 'ALL') && (
            <div className="py-20 text-center text-zinc-400">
              검색 결과가 없습니다. 다른 검색어를 입력해보세요.
            </div>
          )}

          {results.map((v, idx) => {
            const isNewChapter = idx === 0 || results[idx - 1].book_id !== v.book_id || results[idx - 1].chapter !== v.chapter;
            return (
              <div key={v.id}>
                {viewMode === 'SEARCH' && isNewChapter && (
                  <div className="flex items-center gap-3 mb-4 mt-8">
                    <div className="h-[1px] flex-1 bg-zinc-100" />
                    <span className="font-black text-zinc-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-zinc-100" style={{ fontSize: `${fontSize * 0.7}px` }}>
                      {v.book_name} {v.chapter}
                    </span>
                    <div className="h-[1px] flex-1 bg-zinc-100" />
                  </div>
                )}
                <div
                  className={`group transition-all ${viewMode === 'CHAPTER' ? 'px-4 py-1 hover:bg-zinc-50' : 'p-4 bg-white border border-zinc-100 shadow-sm hover:shadow-md rounded-2xl'}`}
                  onClick={() => {
                    if (viewMode === 'SEARCH') {
                      const keyword = identifiedBook ? searchInput.replace(/[가-힣]{1,5}\s*\d*(장|편)?(:(\d+))?/, '').trim() : searchInput.trim();
                      setLocation(`/bible/${v.book_id}/${v.chapter}?verse=${v.verse}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className={`text-[11px] pt-1.5 font-dm-sans font-black min-w-[24px] text-center ${viewMode === 'CHAPTER' ? 'text-[#4A6741]/40' : 'text-zinc-400'}`}>
                      {v.verse}
                    </span>
                    <p className={`leading-relaxed text-zinc-700 flex-1 ${viewMode === 'CHAPTER' ? 'font-medium' : ''}`} style={{ fontSize: `${fontSize * 0.9}px` }}>
                      {highlightKeyword(v.content)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={bottomRef} className="h-20" />

        {/* 성경 읽기 연동 섹션 (맨 하단 위치) */}
        {viewMode === 'CHAPTER' && currentChapterInfo && (
          <div className="mt-8 mb-20 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="w-1 h-1 rounded-full bg-[#4A6741] opacity-30" />
              <span className="text-xs font-bold text-zinc-400 tracking-wider">성경 읽기 연동</span>
              <div className="w-1 h-1 rounded-full bg-[#4A6741] opacity-30" />
            </div>

            <div className="relative flex flex-col items-center">
              <motion.button
                ref={readCompleteButtonRef}
                whileTap={{ scale: 0.9 }}
                className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 border-4
                  ${isRead ? 'bg-[#4A6741] text-white' : 'bg-white text-gray-400 border-green-50'}`}
              >
                <Check className={`w-8 h-8 mb-1 ${isRead ? 'text-white' : 'text-zinc-200'}`} strokeWidth={3} />
                <span className="font-bold text-[13px]">읽기 완료</span>
                {user && readCount > 0 && <span className="text-[10px] mt-0.5 opacity-80">{readCount}회</span>}

                {isLongPressing && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="46" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeDasharray="290" className="animate-[progress_1s_linear_infinite]" />
                  </svg>
                )}
              </motion.button>

              {isRead && (
                <span className="text-[10px] text-zinc-400 mt-4 opacity-60 font-bold">길게 누르면 취소</span>
              )}
            </div>
          </div>
        )}
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 w-14 h-14 bg-white text-[#4A6741] rounded-2xl shadow-xl flex items-center justify-center z-[110] transition-all border border-zinc-100"
        >
          <ArrowUp className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
