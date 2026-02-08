import React, { useEffect, useState, useRef } from 'react';
import { useRoute, useLocation } from "wouter";
import { supabase } from '../lib/supabase';
import { ChevronLeft, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { useDisplaySettings } from "../components/DisplaySettingsProvider"; // 폰트 설정을 위해 필수

export default function BibleViewPage() {
  const [, params] = useRoute("/bible/:bookId/:chapter");
  const [, setLocation] = useLocation();
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightVerse, setHighlightVerse] = useState<string | null>(null);
  const [queryString, setQueryString] = useState('');
  
  // 폰트 설정 가져오기 (이 부분이 없으면 에러로 인해 흰 화면이 뜰 수 있습니다)
  const { fontSize, fontFamily } = useDisplaySettings();

  // URL에서 쿼리 파라미터 추출
  useEffect(() => {
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    const qs = queryStart !== -1 ? hash.substring(queryStart + 1) : '';
    setQueryString(qs);
    
    const queryParams = new URLSearchParams(qs);
    const verse = queryParams.get('verse');
    setHighlightVerse(verse);
    
    console.log('🔍 BibleViewPage - verse 파라미터:', verse);
  }, []);

  useEffect(() => {
    async function fetchChapter() {
      if (!params?.bookId || !params?.chapter) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bible_verses')
          .select('*')
          .eq('book_id', params.bookId)
          .eq('chapter', params.chapter)
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
  }, [params?.bookId, params?.chapter]);

  // 하이라이트된 절로 스크롤 이동
  useEffect(() => {
    if (!loading && verses.length > 0 && highlightVerse) {
      console.log('📍 스크롤 시도 - verse:', highlightVerse);
      setTimeout(() => {
        const element = document.getElementById(`verse-${highlightVerse}`);
        console.log('📍 찾은 요소:', element);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [loading, verses.length, highlightVerse]);

  if (loading) return (
    <div className="min-h-screen bg-white pt-20 text-center text-zinc-500 font-bold">
      말씀을 불러오는 중...
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* 뒤로가기 버튼 */}
      <div className="fixed top-14 left-0 right-0 z-50 bg-white border-b px-4 py-3">
        <button
          onClick={() => {
            // URL의 모든 파라미터를 유지하면서 돌아가기
            const params = new URLSearchParams(queryString);
            params.delete('verse'); // verse만 제거
            
            const backQuery = params.toString();
            const backUrl = backQuery ? `/search?${backQuery}` : '/search';
            setLocation(backUrl);
          }}
          className="flex items-center gap-2 text-zinc-700 hover:text-zinc-900 font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>검색으로 돌아가기</span>
        </button>
      </div>

      {/* 본문 내용: 상단바(h-14) + 뒤로가기(h-[52px]) 만큼 띄워줍니다. */}
      <div className="pt-[108px] pb-10 px-5 space-y-5">
        <h2 className="text-xl font-extrabold text-zinc-900 mb-6 border-b pb-2">
          {verses[0]?.book_name} {params?.chapter}장
        </h2>

        {verses.map((v) => (
          <div 
            key={v.id} 
            id={`verse-${v.verse}`}
            className={`leading-relaxed transition-colors p-2 rounded ${
              highlightVerse && v.verse.toString() === highlightVerse
                ? 'bg-yellow-200 font-bold shadow-md border-2 border-yellow-400' 
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
        ))}
      </div>
    </div>
  );
}
