import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRoute } from "wouter";

export default function TermsPage() {
  const [, params] = useRoute("/terms/:type");
  const [term, setTerm] = useState<{title: string, content: string} | null>(null);

  useEffect(() => {
    async function fetchTerm() {
      const { data } = await supabase
        .from('terms_metadata')
        .select('title, content')
        .eq('type', params?.type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setTerm(data);
    }
    fetchTerm();
  }, [params?.type]);

  if (!term) return <div className="p-10 text-center">불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-white p-8 pt-20">
      <h1 className="text-2xl font-bold mb-6">{term.title}</h1>
      <div className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
        {term.content}
      </div>
      <button onClick={() => window.history.back()} className="mt-10 text-[#4A6741] font-bold">
        뒤로가기
      </button>
    </div>
  );
}