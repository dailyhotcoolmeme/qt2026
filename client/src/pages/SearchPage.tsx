import React, { useState } from 'react';
import { Link } from "wouter";
import { supabase } from '../lib/supabase'; // 경로가 다르면 ../supabaseClient 등으로 수정
import { Search, ChevronLeft } from "lucide-react";
import { Button } from "../components/ui/button";

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    // 가장 확실한 검색 방식인 ilike를 사용합니다.
    const { data, error } = await supabase
      .from('bible_verses')
      .select('*')
      .ilike('content', `%${keyword}%`)
      .limit(50);

    if (error) {
      console.error(error);
    } else {
      setResults(data || []);
    }
    setLoading(false);
  };

  return (
    // z-index를 추가하여 TopBar보다 위에 오거나 겹치지 않게 합니다.
    <div className="min-h-screen bg-white relative z-[200]">
      {/* 검색 바 영역: fixed로 고정하고 클릭 가능하게 z-index 부여 */}
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
            placeholder="성경 구절 검색..."
            className="flex-1 bg-transparent border-none outline-none text-base text-zinc-900" 
            style={{ fontSize: '16px' }} // 모바일 줌 방지를 위해 16px 권장
            autoFocus
          />
          <button type="submit" className="p-1">
            <Search className="w-5 h-5 text-zinc-500" />
          </button>
        </form>
      </div>

      {/* 결과 리스트 영역: 위쪽 바에 가려지지 않게 여백 조정 */}
      <div className="pt-20 pb-10 px-4">
        {loading && <p className="text-center py-10 text-zinc-500">검색 중입니다...</p>}
        
        {!loading && results.map((verse) => (
          <div key={verse.id} className="py-4 border-b border-zinc-100 active:bg-zinc-50">
            <p className="text-xs font-bold text-blue-600 mb-1">
              {verse.book_name} {verse.chapter}:{verse.verse}
            </p>
            <p className="text-sm text-zinc-800 leading-relaxed">
              {verse.content}
            </p>
          </div>
        ))}

        {!loading && results.length === 0 && keyword && (
          <p className="text-center py-20 text-zinc-400 text-sm">
            검색 결과가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
