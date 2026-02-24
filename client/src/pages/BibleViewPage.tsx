import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from "wouter";
import { supabase } from '../lib/supabase';
import { ArrowLeft, ArrowUp } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function BibleViewPage() {
  const [, params] = useRoute("/bible/:bookId/:chapter");
  const [, setLocation] = useLocation();
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { fontSize, fontFamily } = useDisplaySettings();

  // URL에서 파라미터 추출 (해시 기반 라우팅 대응)
  // 예: #/bible/1/4?verse=40&keyword=상기
  const getQueryParams = () => {
    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    if (queryIdx === -1) return new URLSearchParams();
    return new URLSearchParams(hash.substring(queryIdx + 1));
  };

  const queryParams = getQueryParams();
  const highlightVerse = queryParams.get('verse');
  const keyword = queryParams.get('keyword');

  // params.chapter에서 query string 제거 (wouter/hash-location 대응)
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

  // 하이라이트된 절로 스크롤 (강화된 로직)
  useEffect(() => {
    if (!loading && verses.length > 0 && highlightVerse) {
      // 렌더링 후 DOM에 요소가 생길 시간을 줌
      const executeScroll = () => {
        const element = document.getElementById(`verse-${highlightVerse}`);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'center' });
          // 약간의 시간차를 두고 한 번 더 정밀하게 위치 조정
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }
      };

      const timer = setTimeout(executeScroll, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, verses, highlightVerse]);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-14 left-0 right-0 z-50 bg-white border-b px-4 py-3 h-14">
        <button onClick={() => setLocation('/search')} className="flex items-center gap-2 text-zinc-700 font-bold h-full">
          <ArrowLeft className="w-5 h-5" />
          <span>검색으로 돌아가기</span>
        </button>
      </div>
      <div className="fixed inset-0 flex items-center justify-center pt-14 text-zinc-400 font-medium">
        말씀을 불러오는 중...
      </div>
    </div>
  );

  const displayBookName = verses[0]?.book_name || "";
  const displayChapter = verses[0]?.chapter || cleanChapter;

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-16 left-0 right-0 z-50 bg-white border-b px-4 py-3 h-14 shadow-sm">
        <button onClick={() => setLocation('/search')} className="flex items-center gap-2 text-zinc-700 font-bold h-full">
          <ArrowLeft className="w-5 h-5" />
          <span>검색으로 돌아가기</span>
        </button>
      </div>

      <div className="pt-[150px] pb-5 px-5 space-y-2 max-w-2xl mx-auto">
        <h2 className="font-bold text-zinc-800 mb-6 pb-4" style={{ fontSize: `${fontSize * 1.1}px` }}>
          {displayBookName} {displayBookName === '시편' ? `${displayChapter}편` : `${displayChapter}장`}
        </h2>

        {verses.map((v) => {
          const isHighlighted = highlightVerse && v.verse.toString() === highlightVerse;

          const renderContent = (text: string) => {
            if (!keyword || keyword.length < 2) return text;
            try {
              const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
              return parts.map((part, i) =>
                part.toLowerCase() === keyword.toLowerCase()
                  ? <mark key={i} className="bg-yellow-300 font-bold px-1 rounded shadow-sm border-b-2 border-yellow-500 text-zinc-900">{part}</mark>
                  : part
              );
            } catch (e) { return text; }
          };

          return (
            <div
              key={v.id}
              id={`verse-${v.verse}`}
              className={`leading-relaxed transition-all duration-500 p-4 rounded-xl ${isHighlighted ? 'bg-yellow-50 border-l-4 border-[#4A6741] font-medium shadow-md scale-[1.02]' : ''}`}
              style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }}
            >
              <sup
                className={`mr-2 font-bold ${isHighlighted ? 'text-[#4A6741]' : 'text-gray-500'}`}
                style={{ fontSize: `${fontSize * 0.9}px` }}
              >
                {v.verse}
              </sup>
              {renderContent(v.content)}
            </div>
          );
        })}
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#4A6741] text-white rounded-full shadow-lg flex items-center justify-center z-50 active:scale-90 transition-transform"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
