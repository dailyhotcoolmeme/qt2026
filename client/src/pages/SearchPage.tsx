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

  // 상단바에서 검색어 입력 후 넘어왔을 때 바로 검색 실행
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
      let query = supabase
        .from('bible_verses')
        .select('*')
        .ilike('content', `%${searchWord}%`)
        .order('book_id', { ascending: true })
        .order('chapter', { ascending: true })
        .order('verse', { ascending: true })
        .limit(100);

      if (testamentFilter !== 'ALL') {
        query = query.eq('testament', testamentFilter);
      }

      const { data, error } = await query;
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
    performSearch(keyword);
  };

  return (
    <div className="min-h-screen bg-white relative z-[200]">
      {/* 상단 검색바 및 필터 */}
      <div className="fixed top-0 left-0 right-0 z-[210] bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ChevronLeft className="w-6 h-6 text-zinc-600" />
            </Button>
          </Link>
          <form onSubmit={handleSearch} className="flex-1 flex items-center bg-zinc-100 rounded-lg px-3 h-10">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="말씀 검색..."
              className="flex-1 bg-transparent border-none outline-none text-[16px]"
              autoFocus
            />
            <button type="submit"><Search className="w-5 h-5 text-zinc-500" /></button>
          </form>
        </div>

        <div className="flex px-4 pb-2 gap-2 overflow-x-auto">
          {(['ALL', 'OT', 'NT'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setTestamentFilter(f);
                if (keyword) performSearch(keyword);
              }}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-colors ${
                testamentFilter === f ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {f === 'ALL' ? '전체' : f === 'OT' ? '구약' : '신약'}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 결과 리스트 */}
      <div className="pt-32 pb-10 px-4">
        {loading && <p className="text-center py-10 text-zinc-500 font-bold">검색 중...</p>}
        
        {!loading && results.map((v) => (
          <div 
            key={v.id} 
            className="py-4 border-b border-zinc-100 active:bg-zinc-50 cursor-pointer"
            onClick={() => {
              // ★ 이 부분이 핵심입니다! 클릭 시 상세 보기 페이지로 이동합니다.
              setLocation(`/view/${v.book_id}/${v.chapter}?verse=${v.verse}`);
            }}
          >
            <p className="text-xs font-bold text-blue-600 mb-1">
              [{v.testament === 'OT' ? '구약' : '신약'}] {v.book_name} {v.chapter}:{v.verse}
            </p>
            <p className="text-sm text-zinc-800 leading-relaxed">{v.content}</p>
          </div>
        ))}
        
        {!loading && results.length === 0 && keyword && (
          <p className="text-center py-20 text-zinc-400 text-sm">검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
