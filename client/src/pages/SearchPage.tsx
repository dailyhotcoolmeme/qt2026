import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter"; 
import { Search, ChevronDown, ArrowUp } from "lucide-react";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [allVerses, setAllVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [selectedBook, setSelectedBook] = useState<string>('ALL');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [showScrollTop, setShowScrollTop] = useState(false);

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
    
    // localStorage에 저장 (캐시)
    if (searchWord) {
      localStorage.setItem('lastSearch', searchWord);
    } else {
      localStorage.removeItem('lastSearch');
    }
    
    if (!searchWord) {
      setKeyword('');
      setSelectedBook('ALL');
      setSelectedChapter('ALL');
      return;
    }
    
    // 책 이름 + 장 번호 자동 필터링
    // 예: "갈라디아서 5장", "데살로니가전서", "창세기 1"
    
    // 모든 책 목록 추출
    const bookList = Array.from(new Set(allVerses.map(v => ({
      id: v.book_id,
      name: v.book_name,
      testament: v.testament
    })).map(b => JSON.stringify(b)))).map(b => JSON.parse(b));
    
    // 검색어에서 책 이름 찾기
    const foundBook = bookList.find(book => 
      searchWord.includes(book.name) || book.name.includes(searchWord)
    );
    
    if (foundBook) {
      // 책 찾음 - testament와 book 자동 설정
      setTestamentFilter(foundBook.testament as 'OT' | 'NT');
      setSelectedBook(foundBook.id.toString());
      
      // "숫자장" 또는 "숫자" 패턴 찾기
      const chapterMatch = searchWord.match(/(\d+)\s*장/) || searchWord.match(/\s(\d+)$/);
      if (chapterMatch) {
        const chapterNum = chapterMatch[1];
        // 해당 책의 장 목록에서 확인
        const hasChapter = allVerses.some(v => 
          v.book_id === foundBook.id && v.chapter.toString() === chapterNum
        );
        if (hasChapter) {
          setSelectedChapter(chapterNum);
        } else {
          setSelectedChapter('ALL');
        }
      } else {
        setSelectedChapter('ALL');
      }
      
      // 검색어가 "책이름" 또는 "책이름 숫자장"만 있는 경우 keyword는 빈 문자열
      const bookNamePattern = new RegExp(`^${foundBook.name}(\\s*\\d+\\s*장?)?$`);
      if (bookNamePattern.test(searchWord)) {
        setKeyword(''); // 책 이름으로만 필터링, 내용 검색 안 함
      } else {
        // 책 이름 외의 키워드가 있으면 그것으로 검색
        const remainingKeyword = searchWord.replace(foundBook.name, '').replace(/\d+\s*장?/, '').trim();
        setKeyword(remainingKeyword || searchWord);
      }
    } else {
      // 책 이름이 없으면 일반 검색
      setKeyword(searchWord);
      setSelectedBook('ALL');
      setSelectedChapter('ALL');
    }
  };

  // 초기 로드
  useEffect(() => {
    // 성경 데이터 로드
    loadBibleData();
    
    // 마지막 검색어 복원
    const lastSearch = localStorage.getItem('lastSearch');
    if (lastSearch) {
      setSearchInput(lastSearch);
      setKeyword(lastSearch);
    }
    
    // 스크롤 감지
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  // 필터 변경 시 하위 선택 초기화
  useEffect(() => {
    setSelectedBook('ALL');
    setSelectedChapter('ALL');
  }, [testamentFilter]);

  useEffect(() => {
    setSelectedChapter('ALL');
  }, [selectedBook]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 검색 + 필터 영역 - 하나로 통합 */}
      <div className="fixed top-14 left-0 right-0 z-[100] bg-white shadow-md">
        <div className="px-4 pt-5 pb-3 space-y-3">
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
                localStorage.removeItem('lastSearch');
              }}
              className="px-4 h-10 flex items-center justify-center bg-zinc-500 text-white rounded-lg hover:bg-zinc-600 font-bold text-sm whitespace-nowrap"
            >
              초기화
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
      <div className="pt-[230px] px-4 pb-20">
        {loading && (
          <div className="fixed inset-0 flex items-center justify-center" style={{ top: '56px' }}>
            <p className="text-zinc-500 font-bold text-lg">성경을 불러오는 중...</p>
          </div>
        )}
        
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
                  // verse 파라미터를 URL에 포함하여 이동
                  window.location.hash = `/bible/${v.book_id}/${v.chapter}?verse=${v.verse}`;
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
      
      {/* 최상단 스크롤 버튼 */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#4A6741] text-white rounded-full shadow-lg hover:bg-[#3d5636] flex items-center justify-center z-50 transition-all"
          aria-label="최상단으로"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
