import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from "wouter";
import { Search, ChevronDown, ArrowUp, BookOpen, CheckCircle2, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BIBLE_BOOKS } from "@/lib/bibleData";
import { useAuth } from "@/hooks/use-auth";

// 페이지당 불러올 개수
const PAGE_SIZE = 50;

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // 상태 관리
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // 필터 상태
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [selectedBook, setSelectedBook] = useState<string>('ALL');

  // 뷰 모드 및 정보
  const [viewMode, setViewMode] = useState<'SEARCH' | 'CHAPTER'>('SEARCH'); // SEARCH: 검색 결과, CHAPTER: 특정 장 전체 읽기
  const [currentChapterInfo, setCurrentChapterInfo] = useState<{ bookName: string, bookId: number, chapter: number } | null>(null);
  const [isRead, setIsRead] = useState(false);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollObserver = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 성경 서적 데이터 맵핑 (이름 -> ID, 약어 지원)
  const bookAliasMap = React.useMemo(() => {
    const map: Record<string, { id: number, name: string }> = {};
    BIBLE_BOOKS.forEach((b, idx) => {
      const id = idx + 1;
      map[b.name] = { id, name: b.name };
      // 약어 추가 (앞 두 글자, 한 글자 등)
      map[b.name.substring(0, 1)] = { id, name: b.name };
      map[b.name.substring(0, 2)] = { id, name: b.name };
      // 특별 약어 처리 (예: 창세기 -> 창)
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

  // 통독 여부 확인
  const checkReadStatus = async (bookName: string, chapter: number) => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('bible_progress')
        .select('is_completed')
        .eq('user_id', user.id)
        .eq('book_name', bookName)
        .eq('chapter_number', chapter)
        .single();
      setIsRead(data?.is_completed || false);
    } catch (err) {
      console.error('Check read status failed', err);
    }
  };

  // 통독 체크 토글
  const toggleReadStatus = async () => {
    if (!user || !currentChapterInfo) return;
    const { bookName, chapter } = currentChapterInfo;
    const newStatus = !isRead;

    try {
      if (newStatus) {
        await supabase.from('bible_progress').upsert({
          user_id: user.id,
          book_name: bookName,
          chapter_number: chapter,
          is_completed: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,book_name,chapter_number' });
      } else {
        await supabase.from('bible_progress')
          .update({ is_completed: false })
          .eq('user_id', user.id)
          .eq('book_name', bookName)
          .eq('chapter_number', chapter);
      }
      setIsRead(newStatus);
    } catch (err) {
      console.error('Toggle read status failed', err);
    }
  };

  // 메인 검색/조회 함수
  const performSearch = async (newSearch: boolean = true) => {
    const input = searchInput.trim();
    if (!input && selectedBook === 'ALL' && testamentFilter === 'ALL') {
      setResults([]);
      setViewMode('SEARCH');
      return;
    }

    setLoading(true);
    const startPage = newSearch ? 0 : page + 1;

    try {
      // 1. 스마트 쿼리 파싱 (창세기 1장, 요 3:16 등)
      const refMatch = input.match(/^([가-힣]{1,5})\s*(\d+)?(?::(\d+))?\s*(장|편)?$/);
      let queryBook = null;
      let queryChapter = null;
      let queryVerse = null;

      if (refMatch) {
        const bookName = refMatch[1];
        const bookInfo = bookAliasMap[bookName] || Object.values(bookAliasMap).find(b => b.name.includes(bookName));
        if (bookInfo) {
          queryBook = bookInfo;
          queryChapter = refMatch[2] ? parseInt(refMatch[2]) : null;
          queryVerse = refMatch[3] ? parseInt(refMatch[3]) : null;
        }
      }

      // 2. 쿼리 구성
      let query = supabase.from('bible_verses').select('*', { count: 'exact' });

      // 단일 장 모드로 전환할지 판단 (책과 장이 정확히 명시된 경우)
      if (queryBook && queryChapter && !queryVerse) {
        setViewMode('CHAPTER');
        setCurrentChapterInfo({ bookName: queryBook.name, bookId: queryBook.id, chapter: queryChapter });
        checkReadStatus(queryBook.name, queryChapter);

        query = query.eq('book_id', queryBook.id).eq('chapter', queryChapter);
        // 장 전체 조회는 한 번에 다 가져옴
        const { data, error } = await query.order('verse', { ascending: true });
        if (error) throw error;
        setResults(data || []);
        setHasMore(false);
      } else {
        // 일반 검색 모드
        setViewMode('SEARCH');
        setCurrentChapterInfo(null);

        if (queryBook) query = query.eq('book_id', queryBook.id);
        if (queryChapter) query = query.eq('chapter', queryChapter);
        if (queryVerse) query = query.eq('verse', queryVerse);

        // 키워드 검색 (책 이름/장 번호를 제외한 텍스트가 있을 경우)
        const isRefOnly = !!queryBook;
        if (!isRefOnly && input) {
          query = query.ilike('content', `%${input}%`);
        }

        // 필터 적용
        if (testamentFilter !== 'ALL') query = query.eq('testament', testamentFilter);
        if (selectedBook !== 'ALL') query = query.eq('book_id', selectedBook);

        const from = startPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error, count } = await query
          .order('book_id', { ascending: true })
          .order('chapter', { ascending: true })
          .order('verse', { ascending: true })
          .range(from, to);

        if (error) throw error;

        const newResults = newSearch ? (data || []) : [...results, ...(data || [])];
        setResults(newResults);
        setHasMore(count ? newResults.length < count : false);
        setPage(startPage);
      }

      if (newSearch) window.scrollTo({ top: 0 });
    } catch (err) {
      console.error('검색 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // 무한 스크롤 관찰자
  useEffect(() => {
    if (loading || !hasMore || viewMode === 'CHAPTER') return;

    if (scrollObserver.current) scrollObserver.current.disconnect();

    scrollObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        performSearch(false);
      }
    });

    if (bottomRef.current) scrollObserver.current.observe(bottomRef.current);

    return () => scrollObserver.current?.disconnect();
  }, [loading, hasMore, results, viewMode]);

  // 스크롤 감지 및 초기 검색어 복원
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);

    const lastSearch = localStorage.getItem('lastSearch');
    if (lastSearch) {
      setSearchInput(lastSearch);
      // 검색 버튼을 누른 것처럼 동작하게 하려면 별도 flag나 useEffect 필요
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 폰트 강조
  const highlightKeyword = (text: string) => {
    if (viewMode === 'CHAPTER' || !searchInput) return text;
    // 간단한 키워드 추출 (책 이름 제외)
    const keyword = searchInput.replace(/[가-힣]{1,5}\s*\d*(장|편)?/g, '').trim();
    if (!keyword || keyword.length < 2) return text;

    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 font-bold">{part}</mark>
        : part
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* 헤더 섹션 */}
      <div className="fixed top-14 left-0 right-0 z-[100] bg-white border-b border-zinc-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* 통합 검색창 */}
          <div className="relative group">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch(true)}
              placeholder="예: 창세기 1, 요 3:16, 사랑, 은혜..."
              className="w-full h-12 pl-12 pr-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-[15px] outline-none focus:border-[#4A6741] focus:ring-4 focus:ring-[#4A6741]/5 transition-all"
            />
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400 group-focus-within:text-[#4A6741] transition-colors" />
            <button
              onClick={() => performSearch(true)}
              className="absolute right-2 top-2 h-8 px-4 bg-[#4A6741] text-white text-xs font-bold rounded-xl hover:bg-[#3d5636] transition-colors"
            >
              검색
            </button>
          </div>

          {/* 필터 칩 */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['ALL', 'OT', 'NT'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setTestamentFilter(f);
                  setResults([]); // 필터 변경 시 결과 초기화
                }}
                className={`px-5 h-9 rounded-full text-xs font-dm-sans font-bold whitespace-nowrap transition-all border ${testamentFilter === f
                  ? 'bg-[#4A6741] text-white border-[#4A6741] shadow-md shadow-[#4A6741]/20'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                  }`}
              >
                {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
              </button>
            ))}

            <div className="h-6 w-[1px] bg-zinc-200 my-auto shrink-0 mx-1" />

            <div className="relative shrink-0">
              <select
                className="h-9 pl-4 pr-10 bg-white border border-zinc-200 rounded-full text-xs font-bold text-zinc-700 outline-none appearance-none hover:border-zinc-300 transition-colors"
                value={selectedBook}
                onChange={(e) => {
                  setSelectedBook(e.target.value);
                  setResults([]);
                }}
              >
                <option value="ALL">권 선택</option>
                {BIBLE_BOOKS.map((book, idx) => (
                  <option key={book.name} value={idx + 1}>{book.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
            </div>

            <button
              onClick={() => {
                setSearchInput('');
                setTestamentFilter('ALL');
                setSelectedBook('ALL');
                setResults([]);
                setViewMode('SEARCH');
              }}
              className="px-4 h-9 flex items-center gap-1.5 bg-zinc-100 text-zinc-500 rounded-full text-xs font-bold whitespace-nowrap hover:bg-zinc-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="pt-48 px-4 max-w-2xl mx-auto">
        {/* 장 정보 및 통독 체크 (CHAPTER 모드일 때만 노출) */}
        {viewMode === 'CHAPTER' && currentChapterInfo && (
          <div className="mb-8 p-6 bg-white rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between animate-in zoom-in-95 duration-300">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-[#4A6741]" />
                <span className="text-sm font-bold text-[#4A6741]/60 uppercase tracking-wider font-dm-sans">Bible Reading</span>
              </div>
              <h1 className="text-2xl font-black text-zinc-900">
                {currentChapterInfo.bookName} {currentChapterInfo.bookName === '시편' ? `${currentChapterInfo.chapter}편` : `${currentChapterInfo.chapter}장`}
              </h1>
            </div>
            <button
              onClick={toggleReadStatus}
              className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all duration-500 ${isRead
                ? 'bg-green-50 text-green-600 scale-105 border-green-100'
                : 'bg-zinc-50 text-zinc-300 border-zinc-100 hover:border-zinc-200'
                } border`}
            >
              <CheckCircle2 className={`w-8 h-8 ${isRead ? 'animate-bounce' : ''}`} />
              <span className="text-[10px] font-bold mt-1.5">{isRead ? '읽음 완료' : '표시하기'}</span>
            </button>
          </div>
        )}

        {/* 결과 리스트 */}
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
              <h2 className="text-xl font-bold text-zinc-800 mb-2">어떤 말씀을 찾으시나요?</h2>
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
              <div key={v.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 챕터 구분선 (SEARCH 모드이거나 첫 번째 요소를 제외한 새 챕터일 때) */}
                {viewMode === 'SEARCH' && isNewChapter && (
                  <div className={`flex items-center gap-3 mb-4 mt-8`}>
                    <div className="h-[1px] flex-1 bg-zinc-100" />
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-zinc-100">
                      {v.book_name} {v.chapter}
                    </span>
                    <div className="h-[1px] flex-1 bg-zinc-100" />
                  </div>
                )}

                <div
                  className={`group p-4 rounded-2xl transition-all ${viewMode === 'CHAPTER'
                    ? 'hover:bg-white underline-offset-8 decoration-green-100'
                    : 'bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-[#4A6741]/20'
                    }`}
                  onClick={() => {
                    if (viewMode === 'SEARCH') {
                      setLocation(`/bible/${v.book_id}/${v.chapter}?verse=${v.verse}`);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-[11px] font-dm-sans font-black px-2 py-0.5 rounded-md ${viewMode === 'CHAPTER' ? 'text-[#4A6741]/40' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                      {v.verse}
                    </span>
                    <p className={`text-[15px] leading-relaxed text-zinc-700 flex-1 ${viewMode === 'CHAPTER' ? 'font-medium' : ''}`}>
                      {highlightKeyword(v.content)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 무한 스크롤 하단 감지 */}
        <div ref={bottomRef} className="h-20 flex items-center justify-center">
          {loading && hasMore && (
            <div className="w-6 h-6 border-3 border-[#4A6741]/20 border-t-[#4A6741] rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* 최상단 스크롤 버튼 */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 w-14 h-14 bg-white text-[#4A6741] rounded-2xl shadow-xl shadow-zinc-200 hover:scale-110 active:scale-95 flex items-center justify-center z-50 transition-all border border-zinc-100"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
