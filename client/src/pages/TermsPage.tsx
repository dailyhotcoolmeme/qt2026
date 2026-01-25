import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react"; // 아이콘 라이브러리 (없으면 제거 가능)
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function TermsPage() {
  const [, params] = useRoute("/terms/:type");
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const [term, setTerm] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTerm() {
      setLoading(true);
      const { data } = await supabase
        .from('terms_metadata')
        .select('title, content')
        .eq('type', params?.type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) setTerm(data);
      setLoading(false);
    }
    if (params?.type) fetchTerm();
  }, [params?.type]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div className="animate-pulse text-zinc-400 font-medium">내용을 불러오고 있습니다...</div>
      </div>
    );
  }

  if (!term) return <div className="p-10 text-center">약관을 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 상단 헤더: 앱 스타일의 뒤로가기 바 */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-zinc-50 flex items-center px-4 z-10">
        <button 
          onClick={() => window.history.back()}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-zinc-600" />
        </button>
        <span 
          className="ml-2 font-bold text-zinc-900"
          style={{ fontSize: `${fontSize * 1.1}px` }}
        >
          {term.title}
        </span>
      </header>

      {/* 본문 영역 */}
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 px-6 pt-24 pb-12 max-w-2xl mx-auto w-full"
      >
        <div 
          className="text-zinc-600 leading-[1.8] tracking-tight whitespace-pre-wrap break-keep"
          style={{ fontSize: `${fontSize * 0.95}px` }}
        >
          {term.content}
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="mt-16 pt-8 border-t border-zinc-100 text-center">
          <button 
            onClick={() => window.history.back()}
            className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold shadow-sm active:scale-95 transition-all"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            확인하였습니다
          </button>
        </div>
      </motion.main>
    </div>
  );
}