import React, { useState } from 'react';
import { Link } from "wouter";
import { supabase } from '../lib/supabase'; 
import { Search, ChevronLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export default function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    
    try {
      // .like()는 수파베이스 SQL 실행과 가장 비슷한 결과를 보여줍니다.
      const { data, error } = await supabase
        .from('bible_verses')
        .select('*')
        .filter('content', 'like', `%${keyword}%`) 
        .limit(50);

      if (error) throw error;
      setResults(data || []);
      
    } catch (err: any) {
      alert("데이터를 가져오는 중 오류 발생: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative z-[200]">
      <div className="fixed top-0 left-0 right-0 z-[210] bg-white border-b px-4 py-3 flex items-center gap-2 shadow-sm">
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
            placeholder="성경 검색 (예: 사랑)"
            className="flex-1 bg-transparent border-none outline-none text-[16px] text-zinc-900" 
            autoFocus
          />
          <button type="submit" className="p-1">
            <Search className="w-5 h-5 text-zinc-500" />
          </button>
        </form>
      </div>

      <div className="pt-24 pb-10 px-4">
        {loading && <p className="text-center py-10 text-zinc-500">검색 중...</p>}
        
        {!loading && results.map((v) => (
          <div key={v.id} className="py-4 border-b border-zinc-100">
            <p className="text-xs font-bold text-blue-600 mb-1">
              {v.book_name} {v.chapter}:{v.verse}
            </p>
            <p className="text-sm text-zinc-800 leading-relaxed">
              {v.content}
            </p>
          </div>
        ))}

        {!loading && results.length === 0 && keyword && (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-sm">"{keyword}" 검색 결과가 없습니다.</p>
            <p className="text-xs text-zinc-300 mt-2">데이터가 있는지 Supabase 대시보드를 다시 확인해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
