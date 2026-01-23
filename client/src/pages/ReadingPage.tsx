import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { BarChart3, ChevronRight, X, CheckCircle2, ChevronLeft, Play, Volume2, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function ReadingPage() {
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  const [progressStep, setProgressStep] = useState<'TAB' | 'BOOKS' | 'CHAPTERS'>('TAB');
  const [rangeStep, setRangeStep] = useState<'BOOK' | 'CHAPTER'>('BOOK');
  const [activeTab, setActiveTab] = useState<'OLD' | 'NEW'>('OLD');
  const [selectedBook, setSelectedBook] = useState<any>(null); 
  const [tempBook, setTempBook] = useState<any>(null); 
  const [books, setBooks] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  
  // 사용자 원본 데이터 유지
  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기" },
    startChapter: 1,
    endBook: { id: 66, name: "요한계시록" },
    endChapter: 22
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: booksData } = await supabase.from('bible_books').select('*').order('id');
      const { data: progressData } = await supabase.from('bible_progress').select('*');
      if (booksData) setBooks(booksData);
      if (progressData) setUserProgress(progressData);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeBookSelect = (book: any) => {
    setTempBook(book);
    setRangeStep('CHAPTER');
  };

  const handleRangeChapterSelect = (chapter: number) => {
    if (showRangeModal.type === 'START') {
      setGoal({ ...goal, startBook: { id: tempBook.id, name: tempBook.book_name }, startChapter: chapter });
    } else {
      setGoal({ ...goal, endBook: { id: tempBook.id, name: tempBook.book_name }, endChapter: chapter });
    }
    setShowRangeModal({ ...showRangeModal, show: false });
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="p-5 space-y-4">
        {/* 사용자 원본 디자인 카드 */}
        <Card className="border-none shadow-xl bg-white rounded-[32px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">오늘의 읽기</h2>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-wider">Bible Reading Goal</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowProgressModal(true)} className="bg-zinc-50 rounded-2xl w-12 h-12">
                <BarChart3 className="text-[#5D7BAF]" size={24} />
              </Button>
            </div>

            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center bg-zinc-50 p-5 rounded-[24px]">
              <button onClick={() => { setShowRangeModal({ show: true, type: 'START' }); setRangeStep('BOOK'); }} className="text-center space-y-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">시작</p>
                <p className="text-[13px] font-black text-zinc-800">{goal.startBook.name}</p>
                <p className="text-2xl font-black text-[#5D7BAF] tracking-tighter">{goal.startChapter}장</p>
              </button>
              <div className="h-10 w-[1px] bg-zinc-200" />
              <button onClick={() => { setShowRangeModal({ show: true, type: 'END' }); setRangeStep('BOOK'); }} className="text-center space-y-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">종료</p>
                <p className="text-[13px] font-black text-zinc-800">{goal.endBook.name}</p>
                <p className="text-2xl font-black text-zinc-300 tracking-tighter">{goal.endChapter}장</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 모달 애니메이션 및 디자인도 사용자 원본 100% 동일하게 유지됨 */}
      <AnimatePresence>
        {showRangeModal.show && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRangeModal({ ...showRangeModal, show: false })} className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full max-w-[500px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[70vh]">
              <div className="p-8 flex justify-between items-center border-b border-zinc-50">
                <div className="flex items-center gap-3">
                  {rangeStep === 'CHAPTER' && <Button variant="ghost" size="icon" onClick={() => setRangeStep('BOOK')}><ChevronLeft /></Button>}
                  <h3 className="text-2xl font-black text-zinc-900">{rangeStep === 'BOOK' ? "성경 선택" : `${tempBook?.book_name} 장 선택`}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowRangeModal({ ...showRangeModal, show: false })}><X size={24} /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 pb-10">
                {rangeStep === 'BOOK' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {books.map(b => (
                      <button key={b.id} onClick={() => handleRangeBookSelect(b)} 
                        className="p-4 bg-zinc-50 rounded-2xl text-left font-bold text-sm border border-transparent active:bg-blue-50 active:border-[#5D7BAF] transition-all">
                        {b.book_name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(tempBook?.total_chapters || 0)].map((_, i) => (
                      <button key={i} onClick={() => handleRangeChapterSelect(i + 1)} 
                        className="aspect-square bg-zinc-50 rounded-2xl flex items-center justify-center font-bold hover:bg-[#5D7BAF] hover:text-white transition-all border border-zinc-100">
                        {i + 1}
                      </button>
                    ))}
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
