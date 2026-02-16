import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from "wouter";
import { Search, ChevronDown, ArrowUp, RotateCcw, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { BIBLE_BOOKS } from "../lib/bibleData";
import { useAuth } from "../hooks/use-auth";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import confetti from 'canvas-confetti';
import { motion } from "framer-motion";

// 페이지당 불러올 개수
const PAGE_SIZE = 50;

// 정규식 특수문자 이스케이프 함수
const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

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

  // 검색 결과 통계 상태
  const [searchStats, setSearchStats] = useState<{
    total: number;
    ot: number;
    nt: number;
    bookCounts: Record<number, number>;
  } | null>(null);

  // 뷰 모드 및 정보
  const [viewMode, setViewMode] = useState<'SEARCH' | 'CHAPTER'>('SEARCH');
  const [currentChapterInfo, setCurrentChapterInfo] = useState<{ bookName: string, bookId: number, chapter: number } | null>(null);
  const [isRead, setIsRead] = useState(false);
  const [readCount, setReadCount] = useState(0);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollObserver = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const readCompleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const longPressStartTimeRef = useRef<number>(0);
  const isLongPressingRef = useRef(false);
  const pressStartedRef = useRef(false);
  const longPressCancelledRef = useRef(false);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // 성경 서적 데이터 맵핑
  const bookAliasMap = useMemo(() => {
    const map: Record<string, { id: number, name: string }> = {};
    BIBLE_BOOKS.forEach((b, idx) => {
      const id = idx + 1;
      map[b.name] = { id, name: b.name };
      map[b.name.substring(0, 1)] = { id, name: b.name };
      map[b.name.substring(0, 2)] = { id, name: b.name };
      const commonAlts: Record<string, string> = {
        "창세기": "창", "출애굽기": "출", "레위기": "레", "민수기": "민", "신명기": "신",
        "여호수아": "여", "사사기": "삿", "마태복음": "마", "마가복음": "막", "누가복음": "눅",
        "요한복음": "요", "사도행전": "행", "고린도전서": "고전", "고린도후서": "고후"
      };
      if (commonAlts[b.name]) map[commonAlts[b.name]] = { id, name: b.name };
    });
    return map;
  }, []);

  // 검색어에서 책 정보 미리 추출
  const identifiedBook = useMemo(() => {
    const input = searchInput.trim();
    if (!input) return null;
    const refMatch = input.match(/^([가-힣]{1,5})\s*(\d+)?(?::(\d+))?\s*(장|편)?$/);
    if (refMatch) {
      const bookName = refMatch[1];
      return bookAliasMap[bookName] || null;
    }
    return null;
  }, [searchInput, bookAliasMap]);

  // 키워드 기반 전체 통계 및 검색 가능 책 필터링
  useEffect(() => {
    const fetchStats = async () => {
      const input = searchInput.trim();
      if (!input || input.length < 2 || identifiedBook) {
        setSearchStats(null); return;
      }
      try {
        // 모든 검색 결과의 book_id와 testament를 가져옴 (데이터가 아주 많지 않으므로 가능)
        const { data, error } = await supabase
          .from('bible_verses')
          .select('book_id, testament')
          .ilike('content', `%${input}%`);

        if (data && !error) {
          const stats = {
            total: data.length,
            ot: data.filter(d => d.testament === 'OT').length,
            nt: data.filter(d => d.testament === 'NT').length,
            bookCounts: data.reduce((acc: Record<number, number>, d) => {
              acc[d.book_id] = (acc[d.book_id] || 0) + 1;
              return acc;
            }, {})
          };
          setSearchStats(stats);
        } else {
          setSearchStats(null);
        }
      } catch (e) {
        console.error(e);
        setSearchStats(null);
      }
    };
    const tid = setTimeout(fetchStats, 500);
    return () => clearTimeout(tid);
  }, [searchInput, identifiedBook]);

  // 세션 스토리지 복원
  useEffect(() => {
    const saved = sessionStorage.getItem('searchPageState');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSearchInput(s.searchInput || '');
        setResults(s.results || []);
        setViewMode(s.viewMode || 'SEARCH');
        setPage(s.page || 0);
        setHasMore(s.hasMore || false);
        setTestamentFilter(s.testamentFilter || 'ALL');
        setSelectedBook(s.selectedBook || 'ALL');
        setCurrentChapterInfo(s.currentChapterInfo || null);
        if (s.scrollPos) setTimeout(() => window.scrollTo(0, s.scrollPos), 100);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    const state = { searchInput, results, viewMode, page, hasMore, testamentFilter, selectedBook, currentChapterInfo, scrollPos: window.scrollY };
    sessionStorage.setItem('searchPageState', JSON.stringify(state));
  }, [searchInput, results, viewMode, page, hasMore, testamentFilter, selectedBook, currentChapterInfo]);

  // 성경 읽기 상태 체크
  const checkReadStatus = useCallback(async (bookName: string, chapter: number) => {
    if (!user) return;
    try {
      const { data } = await supabase.from('user_reading_records').select('read_count').eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter).maybeSingle();
      const count = data?.read_count || 0;
      setReadCount(count); setIsRead(count > 0);
    } catch (e) { console.error(e); }
  }, [user]);

  const handleReadComplete = async () => {
    if (!currentChapterInfo || !user) return;
    const { bookName, chapter } = currentChapterInfo;
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#f897c4', '#88B04B', '#FFD700'] });
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
    try {
      const { data: ex } = await supabase.from('user_reading_records').select('read_count').eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter).maybeSingle();
      const newCount = ex ? ex.read_count + 1 : 1;
      await supabase.from('user_reading_records').upsert({ user_id: user.id, date: new Date().toISOString().split('T')[0], book_name: bookName, chapter: chapter, read_count: newCount, updated_at: new Date().toISOString() });
      await checkReadStatus(bookName, chapter);
    } catch (e) { console.error(e); }
  };

  const handleReadCancel = async () => {
    if (!user || !currentChapterInfo) return;
    const { bookName, chapter } = currentChapterInfo;
    try {
      const { data: ex } = await supabase.from('user_reading_records').select('read_count').eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter).maybeSingle();
      if (ex && ex.read_count > 0) {
        const nc = ex.read_count - 1;
        if (nc === 0) await supabase.from('user_reading_records').delete().eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter);
        else await supabase.from('user_reading_records').update({ read_count: nc, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('book_name', bookName).eq('chapter', chapter);
        await checkReadStatus(bookName, chapter);
        if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
      }
    } catch (e) { console.error(e); }
  };

  // 롱프레스 이벤트 핸들러
  useEffect(() => {
    const btn = readCompleteButtonRef.current;
    if (!btn) return;
    const start = () => {
      pressStartedRef.current = true; longPressStartTimeRef.current = Date.now();
      if (!isRead) return;
      isLongPressingRef.current = true; setIsLongPressing(true);
      const loop = () => {
        if (Date.now() - longPressStartTimeRef.current >= 1000) {
          handleReadCancel(); longPressCancelledRef.current = true; setIsLongPressing(false); isLongPressingRef.current = false;
        } else if (isLongPressingRef.current) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };
    const end = () => {
      if (pressStartedRef.current && !longPressCancelledRef.current) handleReadComplete();
      pressStartedRef.current = false; isLongPressingRef.current = false; setIsLongPressing(false); longPressCancelledRef.current = false;
    };
    btn.addEventListener('touchstart', start); btn.addEventListener('touchend', end);
    btn.addEventListener('mousedown', start); btn.addEventListener('mouseup', end); btn.addEventListener('mouseleave', end);
    return () => {
      btn.removeEventListener('touchstart', start); btn.removeEventListener('touchend', end);
      btn.removeEventListener('mousedown', start); btn.removeEventListener('mouseup', end); btn.removeEventListener('mouseleave', end);
    };
  }, [isRead, currentChapterInfo, user, handleReadComplete, handleReadCancel]);

  // 검색 로직
  const performSearch = useCallback(async (newSearch: boolean = true, overrideFilters?: any) => {
    const input = searchInput.trim();
    const tFilter = overrideFilters?.testament || testamentFilter;
    const bFilter = overrideFilters?.book || selectedBook;

    if (!input && bFilter === 'ALL' && tFilter === 'ALL') {
      setResults([]); setViewMode('SEARCH'); return;
    }
    setLoading(true);
    const startPage = newSearch ? 0 : page + 1;
    try {
      const qBook = identifiedBook;
      let qChapter = null, qVerse = null;
      if (qBook) {
        const m = input.match(/^([가-힣]{1,5})\s*(\d+)?(?::(\d+))?\s*(장|편)?$/);
        if (m) { qChapter = m[2] ? parseInt(m[2]) : null; qVerse = m[3] ? parseInt(m[3]) : null; }
      }

      let query = supabase.from('bible_verses').select('*', { count: 'exact' });

      if (qBook && qChapter && !qVerse) {
        setViewMode('CHAPTER'); setCurrentChapterInfo({ bookName: qBook.name, bookId: qBook.id, chapter: qChapter });
        checkReadStatus(qBook.name, qChapter);
        query = query.eq('book_id', qBook.id).eq('chapter', qChapter);
        const { data, error } = await query.order('verse', { ascending: true });
        if (error) throw error;
        setResults(data || []); setHasMore(false); setPage(0);
      } else {
        setViewMode('SEARCH'); setCurrentChapterInfo(null);
        if (qBook) query = query.eq('book_id', qBook.id);
        if (qChapter) query = query.eq('chapter', qChapter);
        if (qVerse) query = query.eq('verse', qVerse);

        let kw = input;
        if (qBook) {
          const reg = new RegExp(`^${qBook.name}|^${input.match(/^([가-힣]{1,5})/)?.[1]}`, 'g');
          kw = kw.replace(reg, '').replace(/\s*\d*(장|편)?(:(\d+))?/, '').trim();
        }
        if (kw) query = query.ilike('content', `%${kw}%`);

        if (!qBook) {
          if (tFilter !== 'ALL') query = query.eq('testament', tFilter);
          if (bFilter !== 'ALL') query = query.eq('book_id', parseInt(bFilter));
        }

        const from = startPage * PAGE_SIZE, to = from + PAGE_SIZE - 1;
        const { data, error, count } = await query.order('book_id', { ascending: true }).order('chapter', { ascending: true }).order('verse', { ascending: true }).range(from, to);
        if (error) throw error;
        const nr = newSearch ? (data || []) : [...results, ...(data || [])];
        setResults(nr); setHasMore(count ? nr.length < count : false); setPage(startPage);
      }
      if (newSearch) window.scrollTo({ top: 0 });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [searchInput, identifiedBook, testamentFilter, selectedBook, page, results, checkReadStatus]);

  const handleTestamentChange = (f: 'ALL' | 'OT' | 'NT') => {
    setTestamentFilter(f);
    performSearch(true, { testament: f, book: selectedBook });
  };
  const handleBookChange = (b: string) => {
    setSelectedBook(b);
    performSearch(true, { testament: testamentFilter, book: b });
  };

  useEffect(() => {
    if (loading || !hasMore || viewMode === 'CHAPTER') return;
    if (scrollObserver.current) scrollObserver.current.disconnect();
    scrollObserver.current = new IntersectionObserver(es => { if (es[0].isIntersecting) performSearch(false); });
    if (bottomRef.current) scrollObserver.current.observe(bottomRef.current);
    return () => scrollObserver.current?.disconnect();
  }, [loading, hasMore, viewMode, performSearch]);

  useEffect(() => {
    const fn = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const highlightKeyword = (text: string) => {
    if (!text || viewMode === 'CHAPTER' || !searchInput) return text;
    const rawKw = identifiedBook ? searchInput.replace(/[가-힣]{1,5}\s*\d*(장|편)?(:(\d+))?/, '').trim() : searchInput.trim();
    if (!rawKw || rawKw.length < 1) return text;
    const escaped = escapeRegExp(rawKw);
    try {
      const ps = text.split(new RegExp(`(${escaped})`, 'gi'));
      return ps.map((p, i) => p.toLowerCase() === rawKw.toLowerCase() ? <mark key={i} className="bg-yellow-200 font-bold px-0.5 rounded shadow-sm">{p}</mark> : p);
    } catch (e) { return text; }
  };

  const resetAll = () => {
    setSearchInput(''); setTestamentFilter('ALL'); setSelectedBook('ALL'); setResults([]); setViewMode('SEARCH'); setSearchStats(null);
    sessionStorage.removeItem('searchPageState');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <div className="fixed top-14 left-0 right-0 z-[100] bg-white border-b border-zinc-100 shadow-sm">
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          <div className="flex gap-2 h-11">
            <div className="relative group flex-1">
              <input
                type="text" value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch(true)}
                placeholder="예: 시편 1, 요 3:16, 사랑, 은혜..."
                className="w-full h-full pl-12 pr-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-[15px] outline-none focus:border-[#4A6741] focus:ring-4 focus:ring-[#4A6741]/5 transition-all"
              />
              <Search className="absolute left-4 top-3 w-5 h-5 text-zinc-400 group-focus-within:text-[#4A6741]" />
            </div>
            <div className="flex gap-1.5 shrink-0 h-full">
              <button onClick={() => performSearch(true)} className="h-full px-6 bg-[#4A6741] text-white text-sm font-bold rounded-xl active:scale-95 shadow-sm">검색</button>
              <button onClick={resetAll} className="w-11 h-11 flex items-center justify-center bg-zinc-100 text-zinc-500 rounded-xl active:rotate-180 transition-all"><RotateCcw className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex gap-2 items-center justify-between h-11">
            <div className="flex gap-2 h-full">
              {(['ALL', 'OT', 'NT'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => handleTestamentChange(f)}
                  className={`px-5 h-full rounded-xl text-xs font-bold transition-all border ${testamentFilter === f ? 'bg-[#4A6741] text-white border-[#4A6741]' : 'bg-white text-zinc-500 border-zinc-200'} ${identifiedBook ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={!!identifiedBook}
                >
                  {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 h-full">
              <div className="h-6 w-[1px] bg-zinc-200 mx-1" />
              <div className="relative h-full">
                <select
                  disabled={!!identifiedBook}
                  className={`h-full pl-4 pr-10 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 outline-none appearance-none w-[130px] ${!!identifiedBook ? 'opacity-40' : ''}`}
                  value={selectedBook}
                  onChange={(e) => handleBookChange(e.target.value)}
                >
                  <option value="ALL">권 선택</option>
                  {BIBLE_BOOKS.map((b, idx) => {
                    const bid = idx + 1;
                    const count = searchStats?.bookCounts[bid];
                    if (searchStats && !count) return null;
                    return (
                      <option key={b.name} value={bid}>
                        {b.name}{count ? ` (${count})` : ''}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-[210px] px-4 max-w-2xl mx-auto">
        {/* 검색 결과 요약 바 */}
        {viewMode === 'SEARCH' && searchStats && (
          <div className="mb-6 py-3 px-5 bg-[#4A6741]/5 border border-[#4A6741]/10 rounded-2xl shadow-sm flex items-center justify-between animate-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6741]" />
              <span className="text-zinc-500 font-bold" style={{ fontSize: `${fontSize * 0.8}px` }}>
                총 <span className="text-zinc-900">{searchStats.total.toLocaleString()}건</span>의 말씀이 검색되었습니다.
              </span>
            </div>
            <div className="flex items-center gap-3 border-l pl-4 border-zinc-100">
              <div className={`flex items-center gap-1.5 ${testamentFilter === 'OT' ? 'text-[#4A6741] font-black scale-105 transition-all' : 'text-zinc-400'}`} style={{ fontSize: `${fontSize * 0.75}px` }}>
                <span>구약</span>
                <span className={testamentFilter === 'OT' ? 'bg-[#4A6741] text-white px-1.5 rounded-md' : ''}>{searchStats.ot}</span>
              </div>
              <div className={`flex items-center gap-1.5 ${testamentFilter === 'NT' ? 'text-[#4A6741] font-black scale-105 transition-all' : 'text-zinc-400'}`} style={{ fontSize: `${fontSize * 0.75}px` }}>
                <span>신약</span>
                <span className={testamentFilter === 'NT' ? 'bg-[#4A6741] text-white px-1.5 rounded-md' : ''}>{searchStats.nt}</span>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'CHAPTER' && currentChapterInfo && (
          <div className="mt-4 mb-10 text-center animate-in zoom-in-95 duration-300">
            <h1 className="text-2xl font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.25}px` }}>{currentChapterInfo.bookName} {currentChapterInfo.bookName === '시편' ? `${currentChapterInfo.chapter}편` : `${currentChapterInfo.chapter}장`}</h1>
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
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6"><Search className="w-8 h-8 text-zinc-300" /></div>
              <h2 className="text-xl font-bold text-zinc-800 mb-2 font-dm-sans">어떤 말씀을 찾으시나요?</h2>
              <p className="text-zinc-400 text-sm px-10">키워드나 성경 구절(창 1:1)을 입력하여<br />하나님의 말씀을 검색해보세요.</p>
            </div>
          )}
          {!loading && results.length === 0 && (searchInput || selectedBook !== 'ALL') && (
            <div className="py-20 text-center text-zinc-400 font-medium">검색 결과가 없습니다.</div>
          )}

          {results.map((v, idx) => {
            const isNew = idx === 0 || results[idx - 1].book_id !== v.book_id || results[idx - 1].chapter !== v.chapter;
            return (
              <div key={v.id}>
                {viewMode === 'SEARCH' && isNew && (
                  <div className="flex items-center gap-3 mb-4 mt-8">
                    <div className="h-[1px] flex-1 bg-zinc-100" />
                    <span className="font-black text-zinc-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-zinc-100" style={{ fontSize: `${fontSize * 0.75}px` }}>{v.book_name} {v.chapter}</span>
                    <div className="h-[1px] flex-1 bg-zinc-100" />
                  </div>
                )}
                <div
                  className={`group transition-all ${viewMode === 'CHAPTER' ? 'px-4 py-1 hover:bg-zinc-100' : 'p-4 bg-white border border-zinc-100 shadow-sm hover:shadow-md rounded-2xl cursor-pointer active:scale-[0.98]'}`}
                  onClick={() => {
                    if (viewMode === 'SEARCH') {
                      const kw = identifiedBook ? searchInput.replace(/[가-힣]{1,5}\s*\d*(장|편)?(:(\d+))?/, '').trim() : searchInput.trim();
                      setLocation(`/bible/${v.book_id}/${v.chapter}?verse=${v.verse}${kw ? `&keyword=${encodeURIComponent(kw)}` : ''}`);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`font-dm-sans font-black min-w-[32px] text-center pt-1 ${viewMode === 'CHAPTER' ? 'text-[#4A6741]/40' : 'text-zinc-400'}`}
                      style={{ fontSize: `${fontSize * 0.75}px` }}
                    >
                      {v.verse}
                    </span>
                    <p className={`leading-relaxed text-zinc-700 flex-1 ${viewMode === 'CHAPTER' ? 'font-medium' : ''}`} style={{ fontSize: `${fontSize * 0.9}px` }}>{highlightKeyword(v.content)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} className="h-20" />
        {viewMode === 'CHAPTER' && currentChapterInfo && (
          <div className="mt-8 mb-20 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3"><div className="w-1 h-1 rounded-full bg-[#4A6741] opacity-30" /><span className="text-xs font-bold text-zinc-400 tracking-wider">성경 읽기 연동</span><div className="w-1 h-1 rounded-full bg-[#4A6741] opacity-30" /></div>
            <div className="relative flex flex-col items-center">
              <motion.button ref={readCompleteButtonRef} whileTap={{ scale: 0.9 }} className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all border-4 ${isRead ? 'bg-[#4A6741] text-white' : 'bg-white text-gray-400 border-green-50'}`}>
                <Check className={`w-8 h-8 mb-1 ${isRead ? 'text-white' : 'text-zinc-200'}`} strokeWidth={3} />
                <span className="font-bold text-[13px]">읽기 완료</span>
                {user && readCount > 0 && <span className="text-[10px] mt-0.5 opacity-80">{readCount}회</span>}
                {isLongPressing && <svg className="absolute inset-0 w-full h-full -rotate-90"><circle cx="48" cy="48" r="46" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeDasharray="290" className="animate-[progress_1s_linear_infinite]" /></svg>}
              </motion.button>
              {isRead && <span className="text-[10px] text-zinc-400 mt-4 opacity-60 font-bold">길게 누르면 취소</span>}
            </div>
          </div>
        )}
      </div>
      {showScrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-24 right-6 w-14 h-14 bg-white text-[#4A6741] rounded-2xl shadow-xl flex items-center justify-center z-[110] border border-zinc-100"><ArrowUp className="w-6 h-6" strokeWidth={2.5} /></button>}
    </div>
  );
}
