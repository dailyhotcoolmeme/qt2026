import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { BarChart3, ChevronRight, X, CheckCircle2, ChevronLeft, Play, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function ReadingPage() {
  // 1. 상태 관리
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressStep, setProgressStep] = useState<'TAB' | 'BOOKS' | 'CHAPTERS'>('TAB');
  const [activeTab, setActiveTab] = useState<'OLD' | 'NEW'>('OLD');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  
  const [books, setBooks] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);

  // 2. 데이터 로드 (성경 목록 + 내 진척도)
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [booksRes, progressRes] = await Promise.all([
        supabase.from('bible_books').select('*').order('book_order'),
        supabase.from('bible_progress').select('*').eq('user_id', user.id)
      ]);

      if (booksRes.data) setBooks(booksRes.data);
      if (progressRes.data) setUserProgress(progressRes.data);
      setLoading(false);
    }
    loadInitialData();
  }, []);

  // 3. 진척율 계산 로직
  // 전체 진척도 (성경 전체 1189장 기준)
  const totalReadChapters = userProgress.reduce((acc, cur) => acc + (cur.read_chapters || 0), 0);
  const totalPercent = Math.round((totalReadChapters / 1189) * 100);

  // 구약/신약별 진척도 계산
  const getTestamentStats = (type: 'OLD' | 'NEW') => {
    const testamentBooks = books.filter(b => type === 'OLD' ? b.id <= 39 : b.id > 39);
    const totalChapters = testamentBooks.reduce((acc, cur) => acc + (cur.total_chapters || 0), 0);
    const readChapters = userProgress
      .filter(p => testamentBooks.some(b => b.id === p.book_id))
      .reduce((acc, cur) => acc + (cur.read_chapters || 0), 0);
    return totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0;
  };

  // 개별 권 진척도 계산
  const getBookStats = (bookId: number) => {
    const prog = userProgress.find(p => p.book_id === bookId);
    const book = books.find(b => b.id === bookId);
    if (!prog || !book) return { percent: 0, read: 0, total: book?.total_chapters || 0 };
    return {
      percent: Math.round((prog.read_chapters / book.total_chapters) * 100),
      read: prog.read_chapters,
      total: book.total_chapters,
      completedList: prog.completed_chapters || []
    };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-[#5D7BAF]">데이터 로딩 중...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 pt-16 pb-24 text-zinc-900">
      {/* --- 상단 전체 진척도 카드 --- */}
      <div className="px-4 py-2">
        <Card className="border-none bg-[#5D7BAF] text-white shadow-xl rounded-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight">성경 통독</h2>
                <p className="text-[11px] opacity-70 font-bold">말씀이 삶의 중심</p>
              </div>
              <Button 
                onClick={() => { setProgressStep('TAB'); setShowProgressModal(true); }}
                className="bg-white/20 hover:bg-white/30 border-none rounded-2xl gap-2 font-bold text-sm h-10 px-4"
              >
                <BarChart3 size={18} /> 상세 진척도
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold opacity-80">전체 완료율</span>
                <span className="text-2xl font-black">{totalPercent}%</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div className="h-full bg-white rounded-full shadow-[0_0_8px_white]" animate={{ width: `${totalPercent}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- 상세 진척도 팝업 --- */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end justify-center">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[40px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  {progressStep !== 'TAB' && (
                    <button onClick={() => setProgressStep(progressStep === 'CHAPTERS' ? 'BOOKS' : 'TAB')} className="p-1 text-zinc-400"><ChevronLeft size={24} /></button>
                  )}
                  <h3 className="text-xl font-black">{progressStep === 'TAB' ? "상세 진척도" : progressStep === 'BOOKS' ? (activeTab === 'OLD' ? "구약 성경" : "신약 성경") : selectedBook?.book_name}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowProgressModal(false)}><X size={24} /></Button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* 1단계: 구약/신약 탭 */}
                {progressStep === 'TAB' && (
                  <div className="space-y-4">
                    {['OLD', 'NEW'].map((id) => {
                      const percent = getTestamentStats(id as 'OLD' | 'NEW');
                      return (
                        <button key={id} onClick={() => { setActiveTab(id as 'OLD' | 'NEW'); setProgressStep('BOOKS'); }} className="w-full p-6 bg-zinc-50 rounded-[24px] text-left border border-zinc-100">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-xl font-black text-zinc-800">{id === 'OLD' ? '구약 성경' : '신약 성경'}</p>
                                <p className="text-xs font-bold text-zinc-400">{id === 'OLD' ? '1~39권' : '40~66권'}</p>
                            </div>
                            <span className="text-xl font-black text-[#5D7BAF]">{percent}%</span>
                          </div>
                          <div className="h-3 bg-zinc-200 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-[#5D7BAF]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2단계: 권 리스트 */}
                {progressStep === 'BOOKS' && (
                  <div className="grid grid-cols-1 gap-3">
                    {books.filter(b => activeTab === 'OLD' ? b.id <= 39 : b.id > 39).map(b => {
                      const stats = getBookStats(b.id);
                      return (
                        <button key={b.id} onClick={() => { setSelectedBook(b); setProgressStep('CHAPTERS'); }} className="w-full p-4 bg-zinc-50 rounded-2xl flex items-center justify-between border active:bg-zinc-100 transition-all">
                          <div className="text-left">
                            <p className="font-bold text-zinc-800 text-sm">{b.book_name}</p>
                            <p className="text-[10px] font-bold text-[#5D7BAF] mt-0.5">{stats.read}/{stats.total}장 ({stats.percent}%)</p>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="w-20 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                               <div className="h-full bg-yellow-400" style={{ width: `${stats.percent}%` }} />
                             </div>
                             <ChevronRight size={16} className="text-zinc-300" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3단계: 장 상세 */}
                {progressStep === 'CHAPTERS' && (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(selectedBook?.total_chapters || 0)].map((_, i) => {
                      const stats = getBookStats(selectedBook.id);
                      const isCompleted = stats.completedList.includes(i + 1);
                      return (
                        <div key={i} className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-bold text-xs ${isCompleted ? 'bg-blue-50 text-[#5D7BAF] border-2 border-blue-100' : 'bg-zinc-50 text-zinc-300 border border-zinc-100'}`}>
                          {isCompleted ? <CheckCircle2 size={18} /> : i + 1}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
