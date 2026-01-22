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
  const [books, setBooks] = useState<any[]>([]); 
  const [selectedBook, setSelectedBook] = useState<string>('ALL');

  // 1. 성경 권 리스트 가져오기 (가장 확실한 방법으로 수정)
  useEffect(() => {
    async function fetchBooks() {
      // 모든 구절을 다 가져오면 무거우므로, 대표 구절들만 빠르게 훑어서 권 목록을 만듭니다.
      const { data, error } = await supabase
        .from('bible_verses')
        .select('book_id, book_name, testament')
        .eq('verse', 1)
        .eq('chapter', 1)
        .order('book_id', { ascending: true });
      
      if (data) {
        setBooks(data);
      } else if (error) {
        console.error("목록 로딩 에러:", error);
      }
    }
    fetchBooks();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const q = params.get('q');
    if (q) {
      setKeyword(q);
      performSearch(q, testamentFilter, selectedBook);
    }
  }, [searchString]);

  const performSearch = async (searchWord: string, testament: string, bookId: string) => {
    if (!searchWord.trim()) return;
    setLoading(true);
    try {
      let query = supabase.from('bible_verses').select('*').ilike('content', `%${searchWord}%`);

      if (testament !== 'ALL') {
        query = query.ilike('testament', testament);
      }
      if (bookId !== 'ALL') {
        query = query.eq('book_id', bookId);
      }

      const { data, error } = await query.order('book_id').order('chapter').order('verse').limit(100);
      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      alert("검색 오류: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(keyword, testamentFilter, selectedBook);
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
              <button key={f} onClick={() => { setTestamentFilter(f); setSelectedBook('ALL'); if (keyword) performSearch(keyword, f, 'ALL'); }}
                className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap ${testamentFilter === f ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
              </button>
            ))}
          </div>
          
          {/* 성경 권 선택 드롭다운 */}
          <select 
            className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded text-[15px] outline-none appearance-none"
            value={selectedBook}
            onChange={(e) => { 
              const newBook = e.target.value;
              setSelectedBook(newBook); 
              if (keyword) performSearch(keyword, testamentFilter, newBook); 
            }}
          >
            <option value="ALL">모든 권 선택</option>
            {books
              .filter(b => testamentFilter === 'ALL' || b.testament?.toUpperCase() === testamentFilter)
              .map(book => (
                <option key={book.book_id} value={book.book_id}>
                  {book.book_name}
                </option>
              ))
            }
          </select>
        </div>
      </div>

      <div className="pt-40 pb-10 px-4">
        {loading && <p className="text-center py-10 text-zinc-500">검색 중...</p>}
        {!loading && results.map((v) => (
          <div key={v.id} className="py-4 border-b border-zinc-100 active:bg-zinc-50"
            onClick={() => setLocation(`/view/${v.book_id}/${v.chapter}?verse=${v.verse}`)}>
            <p className="text-xs font-bold text-blue-600 mb-1">[{v.book_name}] {v.chapter}:{v.verse}</p>
            <p className="text-sm text-zinc-800 leading-relaxed">{v.content}</p>
          </div>
        ))}
        {!loading && results.length === 0 && keyword && (
          <p className="text-center py-20 text-zinc-400">검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
