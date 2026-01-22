import React, { useEffect, useState } from 'react';
import { useRoute, Link } from "wouter";
import { supabase } from '../lib/supabase';
import { ChevronLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export default function BibleViewPage() {
  // 주소창에서 book_id와 chapter 번호를 가져옵니다.
  const [, params] = useRoute("/view/:bookId/:chapter");
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 검색 페이지에서 넘어온 '강조할 절' 번호
  const queryParams = new URLSearchParams(window.location.search);
  const highlightVerse = queryParams.get('verse');

  useEffect(() => {
    async function fetchChapter() {
      if (!params?.bookId || !params?.chapter) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('bible_verses')
        .select('*')
        .eq('book_id', params.bookId)
        .eq('chapter', params.chapter)
        .order('verse', { ascending: true });

      if (!error && data) {
        setVerses(data);
      }
      setLoading(false);
    }
    fetchChapter();
  }, [params?.bookId, params?.chapter]);

  if (loading) return <div className="p-10 text-center">말씀을 불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 바 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h2 className="text-lg font-bold">
          {verses[0]?.book_name} {params?.chapter}장
        </h2>
      </div>

      {/* 본문 내용 */}
      <div className="pt-20 pb-10 px-5 space-y-4">
        {verses.map((v) => (
          <div 
            key={v.id} 
            id={`verse-${v.verse}`}
            className={`leading-relaxed text-lg ${v.verse.toString() === highlightVerse ? 'bg-yellow-100 rounded p-1 font-bold' : ''}`}
          >
            <sup className="text-blue-500 mr-2 text-xs">{v.verse}</sup>
            {v.content}
          </div>
        ))}
      </div>
    </div>
  );
}
