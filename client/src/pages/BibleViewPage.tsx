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

  // URL에서 파라미터 추출 (wouter는 pathname을 다루므로 search에서 추출)
  const queryParams = new URLSearchParams(window.location.search);
  const highlightVerse = queryParams.get('verse');
  const keyword = queryParams.get('keyword');

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

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-white">
      {/* 뒤로가기 버튼 */}
      <div className="fixed top-16 left-0 right-0 z-50 bg-white border-b px-4 py-3">
        <button
          onClick={() => setLocation('/search')}
          className="flex items-center gap-2 text-zinc-700 hover:text-zinc-900 font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>검색으로 돌아가기</span>
        </button>
      </div>

      {/* 로딩 메시지 - 화면 중앙 */}
      <div className="fixed inset-0 flex items-center justify-center" style={{ top: '56px' }}>
        <p className="text-zinc-500 font-medium text-lg">말씀을 불러오는 중...</p>
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
          {verses[0]?.book_name} {verses[0]?.book_name === '시편' ? `${verses[0]?.chapter || cleanChapter}편` : `${verses[0]?.chapter || cleanChapter}장`}
        </h2>

        {verses.map((v) => {
          const isHighlighted = highlightVerse && v.verse.toString() === highlightVerse;

          const renderContent = (text: string) => {
            if (!keyword || keyword.length < 2) return text;
            const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
            return parts.map((part, i) =>
              part.toLowerCase() === keyword.toLowerCase()
                ? <mark key={i} className="bg-yellow-300 font-bold px-1 rounded shadow-sm border-b-2 border-yellow-500 text-zinc-900">{part}</mark>
                : part
            );
          };

          return (
            <div
              key={v.id}
              id={`verse-${v.verse}`}
              className={`leading-relaxed transition-all duration-300 p-3 rounded ${isHighlighted
                ? 'bg-yellow-50 border-l-4 border-[#4A6741] font-medium shadow-sm'
                : ''
                }`}
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily
              }}
            >
              <sup className={`mr-2 text-xs font-bold ${isHighlighted ? 'text-[#4A6741]' : 'text-blue-500'}`}>
                {v.verse}
              </sup>
              {renderContent(v.content)}
            </div>
          );
        })}
      </div>

      {/* 최상단 스크롤 버튼 */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#4A6741] text-white rounded-full shadow-lg hover:bg-[#3d5636] flex items-center justify-center z-50 transition-all"
          aria-label="최상단으로"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
