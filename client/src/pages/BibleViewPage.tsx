import React, { useEffect, useState, useRef } from 'react';
import { useRoute } from "wouter";
import { supabase } from '../lib/supabase';
import { ChevronLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export default function BibleViewPage() {
  const [, params] = useRoute("/view/:bookId/:chapter");
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const queryParams = new URLSearchParams(window.location.search);
  const highlightVerse = queryParams.get('verse');

  useEffect(() => {
    async function fetchChapter() {
      if (!params?.bookId || !params?.chapter) return;
      setLoading(true);
      const { data } = await supabase.from('bible_verses').select('*')
        .eq('book_id', params.bookId).eq('chapter', params.chapter).order('verse');
      if (data) setVerses(data);
      setLoading(false);
    }
    fetchChapter();
  }, [params?.bookId, params?.chapter]);

  // 데이터 로딩 후 하이라이트된 절로 스크롤 이동
  useEffect(() => {
    if (!loading && highlightVerse) {
      setTimeout(() => {
        const element = document.getElementById(`verse-${highlightVerse}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300); // 렌더링 시간을 고려해 약간의 지연 후 실행
    }
  }, [loading, highlightVerse]);

  if (loading) return <div className="p-10 text-center">불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}><ChevronLeft className="w-6 h-6" /></Button>
        <h2 className="text-lg font-bold">{verses[0]?.book_name} {params?.chapter}장</h2>
      </div>

      <div className="pt-20 pb-10 px-5 space-y-4">
        {verses.map((v) => (
          <div key={v.id} id={`verse-${v.verse}`}
            className={`leading-relaxed text-lg p-1 transition-colors ${v.verse.toString() === highlightVerse ? 'bg-yellow-100 rounded font-bold' : ''}`}>
            style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }} // 이 줄 추가
            <sup className="text-blue-500 mr-2 text-xs">{v.verse}</sup>
            {v.content}
          </div>
        ))}
      </div>
    </div>
  );
}
