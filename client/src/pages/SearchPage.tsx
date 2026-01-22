import React, { useState, useEffect } from 'react';
import { useSearch, useLocation } from "wouter"; 
import { supabase } from '../lib/supabase'; 
import { ChevronDown } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function SearchPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const { fontSize, fontFamily } = useDisplaySettings();
  
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
      {/* 상단 필터 영역: 버튼을 큼직하게 수정 */}
      <div className="fixed top-14 left-0 right-0 z-[100] bg-white border-b px-4 py-4 space-y-4 shadow-sm">
        {/* 전체/구약/신약 버튼: 높이와 폰트 크기 대폭 확대 */}
        <div className="flex gap-2 w-full">
          {(['ALL', 'OT', 'NT'] as const).map((f) => (
            <button 
              key={f} 
              onClick={() => { setTestamentFilter(f); setSelectedBook('ALL'); }}
              className={`flex-1 py-3 rounded-xl text-[15px] font-extrabold transition-all active:scale-95 ${
                testamentFilter === f 
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-100' 
                  : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
              }`}
            >
              {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
            </button>
          ))}
        </div>
        
        {/* 콤보박스: 높이를 버튼과 맞춰 밸런스 조정 */}
        <div className="relative">
          <select 
            className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-[15px] outline-none appearance-none font-bold text-zinc-700 pr-10"
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value)}
          >
            <option value="ALL">
              {testamentFilter === 'ALL' ? '모든 성경' : testamentFilter === 'OT' ? '검색된 구약' : '검색된 신약'} ({availableBooks.length}권)
            </option>
            {availableBooks.map(book => <option key={book.id} value={book.id}>{book.name}</option>)}
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* 결과 리스트: 상단바가 두꺼워졌으므로 pt-48로 간격 조정 */}
      <div className="pt-52 pb-10 px-4">
        {loading && <p className="text-center py-10 text-zinc-500 font-bold">검색 중...</p>}
        
        {!loading && finalResults.map((v) => (
          <div key={v.id} className="py-5 border-b border-zinc-100 active:bg-zinc-50"
            onClick={() => setLocation(`/view/${v.book_id}/${v.chapter}?verse=${v.verse}`)}>
            <p className="text-xs font-bold text-blue-600 mb-1.5 bg-blue-50 w-fit px-2 py-0.5 rounded">
              {v.book_name} {v.chapter}:{v.verse}
            </p>
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
