import React, { useState, useEffect } from 'react';
import { useSearch, useLocation } from "wouter"; 
import { supabase } from '../lib/supabase'; 
import { ChevronDown } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider"; // 추가

export default function SearchPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const { fontSize, fontFamily } = useDisplaySettings(); // 설정값 가져오기
  
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [selectedBook, setSelectedBook] = useState<string>('ALL');

  const filteredByTestament = React.useMemo(() => {
    return results.filter(v => testamentFilter === 'ALL' || v.testament?.toUpperCase() === testamentFilter);
  }, [results, testamentFilter]);

  const availableBooks = React.useMemo(() => {
    const bookMap = new Map();
    filteredByTestament.forEach(v => {
      if (!bookMap.has(v.book_id)) bookMap.set(v.book_id, v.book_name);
    });
    return Array.from(bookMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => Number(a.id) - Number(b.id));
  }, [filteredByTestament]);

  const finalResults = React.useMemo(() => {
    return filteredByTestament.filter(v => selectedBook === 'ALL' || v.book_id.toString() === selectedBook);
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
      const { data, error } = await query.order('book_id').order('chapter').order('verse').limit(500);
      if (error) throw error;
      setResults(data || []);
      setSelectedBook('ALL'); 
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 필터 영역: TopBar 아래에 위치하도록 pt-14 */}
      <div className="fixed top-14 left-0 right-0 z-[100] bg-white border-b px-4 py-3 space-y-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['ALL', 'OT', 'NT'] as const).map((f) => (
            <button key={f} onClick={() => { setTestamentFilter(f); setSelectedBook('ALL'); }}
              className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${testamentFilter === f ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
              {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <select 
            className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[14px] outline-none appearance-none font-semibold text-zinc-700 pr-10"
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value)}
          >
            <option value="ALL">
              {testamentFilter === 'ALL' ? '검색된 모든 권' : testamentFilter === 'OT' ? '검색된 구약' : '검색된 신약'} ({availableBooks.length}개)
            </option>
            {availableBooks.map(book => <option key={book.id} value={book.id}>{book.name}</option>)}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* 결과 리스트: 필터 영역 높이만큼 여유 있게 padding-top 조절 */}
      <div className="pt-44 pb-10 px-4">
        {loading && <p className="text-center py-10 text-zinc-500 font-bold">검색 중...</p>}
        
        {!loading && finalResults.map((v) => (
          <div key={v.id} className="py-4 border-b border-zinc-100 active:bg-zinc-50"
            onClick={() => setLocation(`/view/${v.book_id}/${v.chapter}?verse=${v.verse}`)}>
            <p className="text-xs font-bold text-blue-600 mb-1">[{v.book_name}] {v.chapter}:{v.verse}</p>
            {/* 설정된 폰트 크기와 글씨체 적용 */}
            <p 
              className="leading-relaxed text-zinc-800"
              style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }}
            >
              {v.content}
            </p>
          </div>
        ))}

        {!loading && keyword && finalResults.length === 0 && (
          <p className="text-center py-20 text-zinc-400">결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
