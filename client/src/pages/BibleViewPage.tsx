import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from "wouter";
import { supabase } from '../lib/supabase';
import { ArrowLeft } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function BibleViewPage() {
  const [, params] = useRoute("/bible/:bookId/:chapter");
  const [, setLocation] = useLocation();
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { fontSize, fontFamily } = useDisplaySettings();

  // URL에서 verse 파라미터 추출
  const hash = window.location.hash;
  const queryStart = hash.indexOf('?');
  const queryString = queryStart !== -1 ? hash.substring(queryStart + 1) : '';
  const queryParams = new URLSearchParams(queryString);
  const highlightVerse = queryParams.get('verse');
  
  // params.chapter에서 query string 제거 (wouter 버그)
  const cleanChapter = params?.chapter?.split('?')[0] || params?.chapter;

  // 성경 구절 로드
  useEffect(() => {
    async function fetchChapter() {
      if (!params?.bookId || !cleanChapter) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bible_verses')
          .select('*')
          .eq('book_id', params.bookId)
          .eq('chapter', cleanChapter)
          .order('verse', { ascending: true });

        if (error) throw error;
        if (data) setVerses(data);
      } catch (err) {
        console.error("데이터 로딩 에러:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChapter();
  }, [params?.bookId, cleanChapter]);

  // 하이라이트된 절로 스크롤
  useEffect(() => {
    if (!loading && verses.length > 0 && highlightVerse) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`verse-${highlightVerse}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loading, verses, highlightVerse]);

  if (loading) return (
    <div className="min-h-screen bg-white">
      {/* 뒤로가기 버튼 */}
      <div className="fixed top-14 left-0 right-0 z-50 bg-white border-b px-4 py-3">
        <button
          onClick={() => setLocation('/search')}
          className="flex items-center gap-2 text-zinc-700 hover:text-zinc-900 font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>검색으로 돌아가기</span>
        </button>
      </div>
      
      {/* 로딩 메시지 */}
      <div className="pt-32 text-center text-zinc-500 font-bold">
        말씀을 불러오는 중...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* 뒤로가기 버튼 */}
      <div className="fixed top-14 left-0 right-0 z-50 bg-white border-b px-4 py-3">
        <button
          onClick={() => setLocation('/search')}
          className="flex items-center gap-2 text-zinc-700 hover:text-zinc-900 font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>검색으로 돌아가기</span>
        </button>
      </div>

      {/* 본문 내용 */}
      <div className="pt-[108px] pb-10 px-5 space-y-5">
        <h2 className="text-xl font-extrabold text-zinc-900 mb-6 border-b pb-2">
          {verses[0]?.book_name} {cleanChapter}장
        </h2>

        {verses.map((v) => {
          const isHighlighted = highlightVerse && v.verse.toString() === highlightVerse;
          
          return (
            <div 
              key={v.id}
              id={`verse-${v.verse}`}
              className={`leading-relaxed transition-all duration-300 p-3 rounded ${
                isHighlighted
                  ? 'bg-yellow-200 border-2 border-yellow-500 font-bold shadow-lg' 
                  : ''
              }`}
              style={{ 
                fontSize: `${fontSize}px`, 
                fontFamily: fontFamily 
              }}
            >
              <sup className="text-blue-500 mr-2 text-xs font-bold">{v.verse}</sup>
              {v.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
