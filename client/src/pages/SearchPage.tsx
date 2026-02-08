import React, { useState, useEffect } from 'react';
import { useLocation, useSearch } from "wouter"; 
import { Search, ChevronDown } from "lucide-react";

// sessionStorage quota 문제로 캐시 제거 - 매번 1-2초 다운로드

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [allVerses, setAllVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [selectedBook, setSelectedBook] = useState<string>('ALL');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');

  // 검색어로 필터링된 결과
  const searchFilteredVerses = React.useMemo(() => {
    if (!keyword) return allVerses;
    return allVerses.filter(v => v.content.includes(keyword));
  }, [allVerses, keyword]);

  // 구약/신약으로 필터링
  const testamentFilteredVerses = React.useMemo(() => {
    if (testamentFilter === 'ALL') return searchFilteredVerses;
    return searchFilteredVerses.filter(v => {
      const testament = v.testament?.toUpperCase();
      return testament === testamentFilter;
    });
  }, [searchFilteredVerses, testamentFilter]);

  // 사용 가능한 권 목록
  const availableBooks = React.useMemo(() => {
    const bookMap = new Map();
    testamentFilteredVerses.forEach(v => {
      if (!bookMap.has(v.book_id)) {
        bookMap.set(v.book_id, { id: v.book_id, name: v.book_name });
      }
    });
    return Array.from(bookMap.values()).sort((a, b) => Number(a.id) - Number(b.id));
  }, [testamentFilteredVerses]);

  // 권으로 필터링
  const bookFilteredVerses = React.useMemo(() => {
    if (selectedBook === 'ALL') return testamentFilteredVerses;
    return testamentFilteredVerses.filter(v => v.book_id.toString() === selectedBook);
  }, [testamentFilteredVerses, selectedBook]);

  // 사용 가능한 장 목록
  const availableChapters = React.useMemo(() => {
    const chapters = new Set<number>();
    bookFilteredVerses.forEach(v => chapters.add(v.chapter));
    return Array.from(chapters).sort((a, b) => a - b);
  }, [bookFilteredVerses]);

  // 최종 결과 (장으로 필터링)
  const finalResults = React.useMemo(() => {
    if (selectedChapter === 'ALL') return bookFilteredVerses;
    return bookFilteredVerses.filter(v => v.chapter.toString() === selectedChapter);
  }, [bookFilteredVerses, selectedChapter]);

  // 성경 전체 데이터 로드 (캐시 없음 - 매번 다운로드)
  const loadBibleData = async () => {
    setLoading(true);
    const startTime = performance.now();
    
    try {
      console.log('📥 성경 데이터 다운로드 중...');
      const response = await fetch('/bible.json');
      if (!response.ok) throw new Error('bible.json 로드 실패');
      const data = await response.json();
      
      const downloadTime = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ 다운로드 완료 (${downloadTime}초, 31,102절)`);
      
      setAllVerses(data);
    } catch (err: any) {
      console.error('bible.json 로드 에러:', err);
      alert('성경 데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 실행
  const performSearch = () => {
    const searchWord = searchInput.trim();
    setKeyword(searchWord);
    setSelectedBook('ALL');
    setSelectedChapter('ALL');
    
    // URL에 검색어 저장
    if (searchWord) {
      window.history.replaceState(null, '', `#/search?q=${encodeURIComponent(searchWord)}`);
    } else {
      window.history.replaceState(null, '', '#/search');
    }
  };

  // URL에서 검색어 및 필터 복원 (wouter location 변화 감지)
  useEffect(() => {
    const hash = window.location.hash; // #/search?q=사랑&testament=NT&book=42
    const queryStart = hash.indexOf('?');
    const queryString = queryStart !== -1 ? hash.substring(queryStart + 1) : '';
    const params = new URLSearchParams(queryString);
    
    const q = params.get('q');
    const testament = params.get('testament') as 'ALL' | 'OT' | 'NT' | null;
    const book = params.get('book');
    const chapter = params.get('chapter');
    
    console.log('🔄 URL 복원 (location 변화):', { hash, q, testament, book, chapter });
    
    // 검색어 복원
    setSearchInput(q || '');
    setKeyword(q || '');
    
    // 필터 복원
    setTestamentFilter(testament || 'ALL');
    setSelectedBook(book || 'ALL');
    setSelectedChapter(chapter || 'ALL');
  }, [location]); // wouter location이 변경될 때마다 실행

  // 초기 로드 (전체 성경)
  useEffect(() => {
    loadBibleData();
  }, []);

  // 검색어 하이라이트
  const highlightKeyword = (text: string) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === keyword.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 font-bold">{part}</mark>
        : part
    );
  };

  // 필터 변경 시 하위 선택 초기화 - 제거됨 (뒤로가기 시 URL state 복원 방해)

  // URL 업데이트 (keyword나 필터가 변경될 때마다)
  useEffect(() => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (testamentFilter !== 'ALL') params.set('testament', testamentFilter);
    if (selectedBook !== 'ALL') params.set('book', selectedBook);
    if (selectedChapter !== 'ALL') params.set('chapter', selectedChapter);
    
    const queryString = params.toString();
    const url = queryString ? `#/search?${queryString}` : '#/search';
    window.history.replaceState(null, '', url);
  }, [keyword, testamentFilter, selectedBook, selectedChapter]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 검색 + 필터 영역 - 하나로 통합 */}
      <div className="fixed top-14 left-0 right-0 z-[100] bg-white shadow-md">
        <div className="px-4 pt-3 pb-3 space-y-3">
          {/* 검색 입력 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
              placeholder="검색어 입력 (없으면 전체 조회)"
              className="flex-1 h-10 px-4 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
            />
            <button
              onClick={performSearch}
              disabled={loading}
              className="w-10 h-10 flex items-center justify-center bg-[#4A6741] text-white rounded-lg hover:bg-[#3d5636] disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSearchInput('');
                setKeyword('');
                setTestamentFilter('ALL');
                setSelectedBook('ALL');
                setSelectedChapter('ALL');
                window.history.replaceState(null, '', '#/search');
              }}
              className="w-10 h-10 flex items-center justify-center bg-zinc-500 text-white rounded-lg hover:bg-zinc-600"
              title="초기화"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 전체/구약/신약 */}
          <div className="flex gap-2">
            {(['ALL', 'OT', 'NT'] as const).map((f) => (
              <button 
                key={f} 
                onClick={() => setTestamentFilter(f)}
                className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${
                  testamentFilter === f 
                    ? 'bg-[#4A6741] text-white' 
                    : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                {f === 'ALL' ? `전체 (${searchFilteredVerses.length})` : 
                 f === 'OT' ? `구약 (${searchFilteredVerses.filter(v => v.testament?.toUpperCase() === 'OT').length})` : 
                 `신약 (${searchFilteredVerses.filter(v => v.testament?.toUpperCase() === 'NT').length})`}
              </button>
            ))}
          </div>

          {/* 권/장 선택 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select 
                className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none appearance-none font-bold text-zinc-700 pr-8"
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
              >
                <option value="ALL">전체 권 ({availableBooks.length}권)</option>
                {availableBooks.map(book => (
                  <option key={book.id} value={book.id}>
                    {book.name} ({testamentFilteredVerses.filter(v => v.book_id === book.id).length})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
            </div>

            {selectedBook !== 'ALL' && (
              <div className="relative flex-1">
                <select 
                  className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none appearance-none font-bold text-zinc-700 pr-8"
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                >
                  <option value="ALL">전체 장 ({availableChapters.length}장)</option>
                  {availableChapters.map(ch => (
                    <option key={ch} value={ch}>
                      {ch}장 ({bookFilteredVerses.filter(v => v.chapter === ch).length}절)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 결과 리스트 */}
      <div className="pt-[200px] px-4">
        {loading && <p className="text-center py-10 text-zinc-500 text-sm">검색 중...</p>}
        
        {!loading && finalResults.length === 0 && (
          <p className="text-center py-20 text-zinc-400 text-sm">결과가 없습니다.</p>
        )}

        {!loading && finalResults.map((v, idx) => {
          // 이전 절과 연속되는지 확인
          const prevVerse = finalResults[idx - 1];
          const isNewChapter = !prevVerse || prevVerse.book_id !== v.book_id || prevVerse.chapter !== v.chapter;
          const isContinuousVerse = prevVerse && 
            prevVerse.book_id === v.book_id && 
            prevVerse.chapter === v.chapter && 
            prevVerse.verse + 1 === v.verse;

          return (
            <div key={v.id}>
              {/* 새로운 장 시작 - 권 장 표시 */}
              {isNewChapter && (
                <div className="mt-6 mb-3 border-t-2 border-zinc-300 pt-4">
                  <h3 className="text-base font-extrabold text-[#4A6741]">
                    {v.book_name} {v.chapter}장
                  </h3>
                </div>
              )}
              
              {/* 절 번호 + 본문 */}
              <div 
                className="mb-4 cursor-pointer hover:bg-zinc-50 p-2 rounded"
                onClick={() => {
                  // 현재 필터 상태를 URL에 포함하여 이동
                  const params = new URLSearchParams();
                  if (keyword) params.set('q', keyword);
                  if (testamentFilter !== 'ALL') params.set('testament', testamentFilter);
                  if (selectedBook !== 'ALL') params.set('book', selectedBook);
                  if (selectedChapter !== 'ALL') params.set('chapter', selectedChapter);
                  params.set('verse', v.verse.toString());
                  
                  const queryString = params.toString();
                  const targetUrl = `/bible/${v.book_id}/${v.chapter}?${queryString}`;
                  
                  console.log('📤 절 클릭 - 이동 URL:', targetUrl);
                  console.log('📤 파라미터:', Object.fromEntries(params));
                  
                  // window.location.hash를 직접 설정
                  window.location.hash = targetUrl;
                }}
              >
                <p className="text-xs font-bold text-zinc-500 mb-1">{v.verse}절</p>
                <p className="text-sm leading-relaxed text-zinc-700">
                  {highlightKeyword(v.content)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
