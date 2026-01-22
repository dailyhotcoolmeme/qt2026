import React, { useState, useEffect } from 'react';
import { Link, useSearch, useLocation } from "wouter"; 
import { supabase } from '../lib/supabase'; 
import { Search, ChevronLeft, ChevronDown } from "lucide-react"; // ChevronDown 추가
import { Button } from "../components/ui/button";

export default function SearchPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [selectedBook, setSelectedBook] = useState<string>('ALL');

  // [중요] 1. 현재 필터(전체/구약/신약)에 맞는 검색 결과만 먼저 걸러냅니다.
  const filteredByTestament = React.useMemo(() => {
    return results.filter(v => 
      testamentFilter === 'ALL' || v.testament?.toUpperCase() === testamentFilter
    );
  }, [results, testamentFilter]);

  // [중요] 2. 걸러진 결과(filteredByTestament)에서만 권 목록과 숫자를 추출합니다.
  const availableBooks = React.useMemo(() => {
    const bookMap = new Map();
    filteredByTestament.forEach(v => {
      if (!bookMap.has(v.book_id)) {
        bookMap.set(v.book_id, v.book_name);
      }
    });
    return Array.from(bookMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [filteredByTestament]);

  // 3. 최종적으로 화면에 뿌려줄 결과 (권 선택까지 포함)
  const finalResults = React.useMemo(() => {
    return filteredByTestament.filter(v => 
      selectedBook === 'ALL' || v.book_id.toString() === selectedBook
    );
  }, [filteredByTestament, selectedBook]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const q = params.get('q');
    if (q) {
      setKeyword(q);
      performSearch(q);
    }
  }, [searchString]);

  const performSearch = async (searchWord: string) => {
    if (!searchWord.trim()) return;
    setLoading(true);
    try {
      let query = supabase.from('bible_verses').select('*').ilike('content', `%${searchWord}%`);
      const { data, error } = await query
        .order('book_id', { ascending: true })
        .order('chapter', { ascending: true })
        .order('verse', { ascending: true })
        .limit(500);

      if (error) throw error;
      setResults(data || []);
      setSelectedBook('ALL'); 
    } catch (err: any) {
      alert("검색 오류: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(keyword);
  };

  return (
    <div className="min-h-screen bg-white relative z-[200]">
      <div className="fixed top-0 left-0 right-0 z-[210] bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center gap-2">
          <Link href="/"><Button variant="ghost" size="icon" className="h-10 w-10"><ChevronLeft className="w-6 h-6" /></Button></Link>
          <form onSubmit={handleSearch} className="flex-1 flex items-center bg-zinc-100 rounded-lg px-3 h-10">
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색어..." className="flex-1 bg-transparent border-none outline-none text-[16px]" autoFocus />
            <button type="submit"><Search className="w-5 h-5 text-zinc-500" /></button>
          </form>
        </div>

        <div className="px-4 pb-3 space-y-2">
          {/* 구약/신약 탭 */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['ALL', 'OT', 'NT'] as const).map((f) => (
              <button key={f} onClick={() => { setTestamentFilter(f); setSelectedBook('ALL'); }}
                className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${testamentFilter === f ? 'bg-blue-600 text-white shadow-md' : 'bg-zinc-100 text-zinc-500'}`}>
                {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
              </button>
            ))}
          </div>
          
          {/* 권 선택 콤보박스 (우측 삼각형 아이콘 추가) */}
          <div className="relative">
            <select 
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[15px] outline-none appearance-none font-semibold text-zinc-700 pr-10"
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
            >
              <option value="ALL">
                {testamentFilter === 'ALL' ? '검색된 모든 권' : testamentFilter === 'OT' ? '검색된 구약' : '검색된 신약'} ({availableBooks.length}개)
              </option>
              {availableBooks.map(book => (
                <option key={book.id} value={book.id}>{book.name}</option>
              ))}
            </select>
            {/* 삼각형 아이콘 위치 */}
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 결과 리스트 */}
      <div className="pt-40 pb-10 px-4">
        {loading && <p className="text-center py-10 text-zinc-500 font-bold">검색 중...</p>}
        
        {!loading && finalResults.map((v) => (
          <div key={v.id} className="py-4 border-b border-zinc-100 active:bg-zinc-50"
            onClick={() => setLocation(`/view/${v.book_id}/${v.chapter}?verse=${v.verse}`)}>
            <p className="text-xs font-bold text-blue-600 mb-1">[{v.book_name}] {v.chapter}:{v.verse}</p>
            <p className="text-sm text-zinc-800 leading-relaxed">{v.content}</p>
          </div>
        ))}

        {!loading && keyword && finalResults.length === 0 && (
          <p className="text-center py-20 text-zinc-400">해당 조건의 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
