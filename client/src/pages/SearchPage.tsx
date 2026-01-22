import React, { useState } from 'react';
import { Link } from "wouter";
import { supabase } from '../lib/supabase'; 
import { Search, ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // 에러 확인용

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setErrorMessage('');
    
    try {
      // 1. 가장 단순한 검색 방식으로 시도
      const { data, error } = await supabase
        .from('bible_verses')
        .select('*')
        .filter('content', 'ilike', `%${keyword}%`) // 'content' 컬럼에서 키워드 포함 찾기
        .limit(30);

      if (error) {
        // 만약 'content' 컬럼이 없어서 에러가 나면 'text' 컬럼으로 재시도
        console.log("content 컬럼 검색 실패, text로 재시도...");
        const { data: secondData, error: secondError } = await supabase
          .from('bible_verses')
          .select('*')
          .filter('text', 'ilike', `%${keyword}%`)
          .limit(30);

        if (secondError) throw secondError;
        setResults(secondData || []);
      } else {
        setResults(data || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '검색 중 오류가 발생했습니다.');
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
            placeholder="성경 구절 검색 (예: 사랑)"
            className="flex-1 bg-transparent border-none outline-none text-base text-zinc-900" 
            style={{ fontSize: '16px' }}
          />
          <button type="submit" className="p-1">
            <Search className="w-5 h-5 text-zinc-500" />
          </button>
        </form>
      </div>

      <div className="pt-24 pb-10 px-4">
        {/* 에러가 날 경우 화면에 빨간색으로 표시 */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </div>
        )}

        {loading && <p className="text-center py-10 text-zinc-500">말씀을 찾는 중...</p>}
        
        {!loading && results.length > 0 && (
          <p className="text-xs text-zinc-400 mb-4">{results.length}개의 구절을 찾았습니다.</p>
        )}

        {!loading && results.map((verse) => (
          <div key={verse.id} className="py-4 border-b border-zinc-100 active:bg-zinc-50">
            <p className="text-xs font-bold text-blue-600 mb-1">
              {verse.book_name || verse.kor} {verse.chapter}:{verse.verse}
            </p>
            <p className="text-sm text-zinc-800 leading-relaxed">
              {verse.content || verse.text}
            </p>
          </div>
        ))}

        {!loading && results.length === 0 && keyword && !errorMessage && (
          <p className="text-center py-20 text-zinc-400 text-sm">
            "{keyword}"에 대한 검색 결과가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
