import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter"; 
import { Search, ChevronDown } from "lucide-react";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  
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

  // 성경 전체 데이터 로드
  const loadBibleData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/bible.json');
      if (!response.ok) throw new Error('bible.json 로드 실패');
      const data = await response.json();
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
  };

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
      {/* 검색 입력 영역 */}
      <div className="fixed top-14 left-0 right-0 z-[100] bg-white border-b px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="검색어 입력 (없으면 전체 조회)"
            className="flex-1 h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400"
          />
          <button
            onClick={performSearch}
            disabled={loading}
            className="w-11 h-11 flex items-center justify-center bg-[#4A6741] text-white rounded-xl hover:bg-[#3d5636] disabled:opacity-50"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="fixed top-[122px] left-0 right-0 z-[99] bg-white border-b px-4 py-3 space-y-2">
        {/* 전체/구약/신약 */}
        <div className="flex gap-2">
          {(['ALL', 'OT', 'NT'] as const).map((f) => (
            <button 
              key={f} 
              onClick={() => setTestamentFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
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

        {/* 권 선택 */}
        <div className="relative">
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

        {/* 장 선택 */}
        {selectedBook !== 'ALL' && (
          <div className="relative">
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

      {/* 결과 리스트 */}
      <div className="pt-[260px] px-4">
        {loading && <p className="text-center py-10 text-zinc-500 text-sm">검색 중...</p>}
        
        {!loading && finalResults.length === 0 && (
          <p className="text-center py-20 text-zinc-400 text-sm">결과가 없습니다.</p>
        )}

        {!loading && finalResults.map((v, idx) => {
          // 이전 절과 연속되는지 확인
          const prevVerse = finalResults[idx - 1];
          const isContinuous = prevVerse && 
            prevVerse.book_id === v.book_id && 
            prevVerse.chapter === v.chapter && 
            prevVerse.verse === v.verse - 1;

          return (
            <div 
              key={v.id} 
              className={`py-3 ${!isContinuous ? 'border-t border-zinc-200' : ''} cursor-pointer hover:bg-zinc-50`}
              onClick={() => setLocation(`/bible/${v.book_id}/${v.chapter}?verse=${v.verse}`)}
            >
              {/* 새로운 구절 그룹 시작 */}
              {!isContinuous && (
                <p className="text-xs font-bold text-[#4A6741] mb-1">
                  {v.book_name} {v.chapter}:{v.verse}
                </p>
              )}
              
              {/* 연속된 절은 절 번호만 표시 */}
              {isContinuous && (
                <p className="text-xs font-bold text-zinc-400 mb-1">
                  {v.verse}절
                </p>
              )}
              
              {/* 본문 */}
              <p className="text-sm leading-relaxed text-zinc-700">
                {highlightKeyword(v.content)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
