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
  
  // 폰트 설정 가져오기 (이 부분이 없으면 에러로 인해 흰 화면이 뜰 수 있습니다)
  const { fontSize, fontFamily } = useDisplaySettings();

  // URL에서 쿼리 파라미터 추출 (검색어 및 절 번호)
  const hash = window.location.hash; // #/bible/1/1?q=사랑&verse=1
  const queryStart = hash.indexOf('?');
  const queryString = queryStart !== -1 ? hash.substring(queryStart + 1) : '';
  const queryParams = new URLSearchParams(queryString);
  const highlightVerse = queryParams.get('verse');
  const searchKeyword = queryParams.get('q');

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
    if (!loading && highlightVerse && verses.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`verse-${highlightVerse}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [loading, highlightVerse, verses]);

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
            // 검색어가 있으면 유지하면서 돌아가기
            const backUrl = searchKeyword ? `/search?q=${encodeURIComponent(searchKeyword)}` : '/search';
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
            className={`leading-relaxed transition-colors p-1 ${
              v.verse.toString() === highlightVerse 
                ? 'bg-yellow-100 rounded font-bold shadow-sm' 
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
