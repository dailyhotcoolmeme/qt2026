import React, { useState, useEffect } from 'react';
import { Link, useSearch, useLocation } from "wouter"; 
import { supabase } from '../lib/supabase'; 
import { Search, ChevronLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export default function SearchPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [selectedBook, setSelectedBook] = useState<string>('ALL');

  // [중요] 검색 결과(results)에서 실제로 존재하는 권 이름들만 중복 없이 뽑아내기
  const availableBooks = React.useMemo(() => {
    const bookMap = new Map();
    results.forEach(v => {
      if (!bookMap.has(v.book_id)) {
        bookMap.set(v.book_id, v.book_name);
      }
    });
    // book_id 순서대로 정렬해서 반환
    return Array.from(bookMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [results]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const q = params.get('q');
    if (q) {
      setKeyword(q);
      performSearch(q, testamentFilter);
    }
  }, [searchString]);

  // 권 필터가 바뀌면 화면에 보여줄 결과만 필터링하도록 수정
  const filteredResults = results.filter(v => {
    const matchTestament = testamentFilter === 'ALL' || v.testament?.toUpperCase() === testamentFilter;
    const matchBook = selectedBook === 'ALL' || v.book_id.toString() === selectedBook;
    return matchTestament && matchBook;
  });

  const performSearch = async (searchWord: string, testament: string) => {
    if (!searchWord.trim()) return;
    setLoading(true);
    try {
      // 1. 먼저 키워드에 맞는 전체 결과를 가져옵니다.
      let query = supabase.from('bible_verses').select('*').ilike('content', `%${searchWord}%`);
      
      const { data, error } = await query
        .order('book_id', { ascending: true })
        .order('chapter', { ascending: true })
        .order('verse', { ascending: true })
        .limit(300); // 넉넉히 가져와서 클라이언트에서 필터링

      if (error) throw error;
      setResults(data || []);
      setSelectedBook('ALL'); // 새 검색 시 권 선택 초기화
    } catch (err: any) {
      alert("검색 오류: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(keyword, testamentFilter);
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
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['ALL', 'OT', 'NT'] as const).map((f) => (
              <button key={f} onClick={() => { setTestamentFilter(f); setSelectedBook('ALL'); }}
                className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap ${testamentFilter === f ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
              </button>
            ))}
          </div>
          
          {/* [수정] 현재 검색 결과에 있는 권만 보여주는 콤보박스 */}
          <select 
            className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded text-[15px] outline-none appearance-none font-medium"
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value)}
          >
            <option value="ALL">검색된 모든 권 ({availableBooks.length}개)</option>
            {availableBooks
              .filter(b => {
                const bookData = results.find(r => r.book_id === b.id);
                return testamentFilter === 'ALL' || bookData?.testament?.toUpperCase() === testamentFilter;
              })
              .map(book => (
                <option key={book.id} value={book.id}>
                  {book.name}
                </option>
              ))
            }
          </select>
        </div>
      </div>

      <div className="pt-40 pb-10 px-4">
        {loading && <p className="text-center py-10 text-zinc-500 font-bold">검색 중...</p>}
        
        {!loading && filteredResults.map((v) => (
          <div key={v.id} className="py-4 border-b border-zinc-100 active:bg-zinc-50"
            onClick={() => setLocation(`/view/${v.book_id}/${v.chapter}?verse=${v.verse}`)}>
            <p className="text-xs font-bold text-blue-600 mb-1">[{v.book_name}] {v.chapter}:{v.verse}</p>
            <p className="text-sm text-zinc-800 leading-relaxed">{v.content}</p>
          </div>
        ))}

        {!loading && keyword && filteredResults.length === 0 && (
          <p className="text-center py-20 text-zinc-400">결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
