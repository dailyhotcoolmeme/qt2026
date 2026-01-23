import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { BarChart3, ChevronRight, X, CheckCircle2, ChevronLeft, Play, Volume2, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function ReadingPage() {
  // 1. 상태 관리
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  
  const [progressStep, setProgressStep] = useState<'TAB' | 'BOOKS' | 'CHAPTERS'>('TAB');
  const [rangeStep, setRangeStep] = useState<'BOOK' | 'CHAPTER'>('BOOK');
  
  const [activeTab, setActiveTab] = useState<'OLD' | 'NEW'>('OLD');
  const [selectedBook, setSelectedBook] = useState<any>(null); // 진척도용
  const [tempBook, setTempBook] = useState<any>(null); // 목표설정용
  
  const [books, setBooks] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  
  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기" },
    startChapter: 1,
    endBook: { id: 1, name: "창세기" },
    endChapter: 3
  });

  // 2. 데이터 로드
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 테이블명과 정렬 기준을 SQL 생성 시와 일치시킴
        const [booksRes, progressRes] = await Promise.all([
          supabase.from('bible_books').select('*').order('id', { ascending: true }),
          supabase.from('bible_progress').select('*').eq('user_id', user.id)
        ]);

        if (booksRes.data) setBooks(booksRes.data);
        if (progressRes.data) setUserProgress(progressRes.data);
      } catch (err) {
        console.error("데이터 로딩 에러:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 3. 진척도 계산 로직 (정밀 매핑)
  const getBookStats = (book: any) => {
    if (!book) return { percent: 0, read: 0, total: 0, completedList: [] };
    
    // bible_progress의 book_id와 bible_books의 id를 비교
    const prog = userProgress.find(p => Number(p.book_id) === Number(book.id));
    const total = Number(book.total_chapters) || 0;
    const read = prog ? Number(prog.read_chapters) : 0;
    const percent = total > 0 ? Math.round((read / total) * 100) : 0;
    const completedList = Array.isArray(prog?.completed_chapters) ? prog.completed_chapters : [];

    return { percent, read, total, completedList };
  };

  const getTestamentStats = (type: 'OLD' | 'NEW') => {
    const testamentBooks = books.filter(b => type === 'OLD' ? b.id <= 39 : b.id > 39);
    if (testamentBooks.length === 0) return 0;

    let totalChapters = 0;
    let readChapters = 0;

    testamentBooks.forEach(b => {
      const stats = getBookStats(b);
      totalChapters += stats.total;
      readChapters += stats.read;
    });

    return totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0;
  };

  const totalReadChapters = userProgress.reduce((acc, cur) => acc + (Number(cur.read_chapters) || 0), 0);
  const totalPercent = Math.round((totalReadChapters / 1189) * 100);

  // 4. 목표 설정 핸들러
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
    setShowRangeModal({ show: false, type: 'START' });
    setRangeStep('BOOK');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-[#5D7BAF]">데이터를 불러오고 있습니다...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 pt-16 pb-24 text-zinc-900 font-sans">
      {/* --- 상단 전체 진척도 카드 --- */}
      <div className="px-4 py-2">
        <Card className="border-none bg-[#5D7BAF] text-white shadow-lg rounded-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight">성경 읽기</h2>
                <p className="text-[11px] opacity-70 font-bold uppercase tracking-wider">성경 완독까지 매일 성경 읽기</p>
              </div>
              <Button 
                onClick={() => { setProgressStep('TAB'); setShowProgressModal(true); }}
                className="bg-white/20 hover:bg-white/30 border-none rounded-full gap-2 font-bold text-sm h-10 px-4"
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
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${totalPercent}%` }} 
                  className="h-full bg-white rounded-full shadow-[0_0_8px_white]" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- 오늘의 목표 설정 카드 --- */}
      <div className="px-4 mt-2">
        <div className="bg-white rounded-sm p-6 border border-zinc-100 shadow-sm">
          <h3 className="font-black text-zinc-800 mb-6 flex items-center gap-2">
            <Settings2 size={18} className="text-[#5D7BAF]" /> 오늘의 말씀 읽기 목표
          </h3>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-400 ml-1 uppercase">Start Point</p>
              <button onClick={() => { setShowRangeModal({ show: true, type: 'START' }); setRangeStep('BOOK'); }}
                className="w-full p-4 bg-zinc-50 rounded-xl text-left border border-zinc-100 active:scale-[0.98] transition-all">
                <p className="text-[11px] font-bold text-[#5D7BAF]">{goal.startBook.name}</p>
                <p className="text-xl font-black text-zinc-800">{goal.startChapter}장</p>
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-400 ml-1 uppercase">End Point</p>
              <button onClick={() => { setShowRangeModal({ show: true, type: 'END' }); setRangeStep('BOOK'); }}
                className="w-full p-4 bg-blue-50/50 rounded-xl text-left border border-blue-100 active:scale-[0.98] transition-all">
                <p className="text-[11px] font-bold text-[#5D7BAF]">{goal.endBook.name}</p>
                <p className="text-xl font-black text-zinc-800">{goal.endChapter}장</p>
              </button>
            </div>
          </div>

          <Button className="w-full h-14 bg-[#5D7BAF] hover:bg-[#4A648C] text-white rounded-xl font-black text-lg shadow-lg">
            목표 확정 및 읽기 시작
          </Button>
        </div>
      </div>

      {/* --- 상세 진척도 모달 --- */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end justify-center">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
              className="bg-white w-full max-w-md rounded-t-[40px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  {progressStep !== 'TAB' && (
                    <button onClick={() => setProgressStep(progressStep === 'CHAPTERS' ? 'BOOKS' : 'TAB')} className="p-1 text-zinc-400"><ChevronLeft size={24} /></button>
                  )}
                  <h3 className="text-xl font-black">
                    {progressStep === 'TAB' ? "상세 진척도" : progressStep === 'BOOKS' ? (activeTab === 'OLD' ? "구약 성경" : "신약 성경") : selectedBook?.book_name}
                  </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowProgressModal(false)}><X size={24} /></Button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 pb-10">
                {progressStep === 'TAB' && (
                  <div className="space-y-4">
                    {(['OLD', 'NEW'] as const).map((type) => {
                      const percent = getTestamentStats(type);
                      return (
                        <button key={type} onClick={() => { setActiveTab(type); setProgressStep('BOOKS'); }} 
                          className="w-full p-6 bg-zinc-50 rounded-[24px] text-left border border-zinc-100 hover:bg-zinc-100 transition-colors">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <p className="text-xl font-black text-zinc-800">{type === 'OLD' ? '구약 성경' : '신약 성경'}</p>
                              <p className="text-xs font-bold text-zinc-400">{type === 'OLD' ? '1~39권' : '40~66권'}</p>
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

                {progressStep === 'BOOKS' && (
                  <div className="grid grid-cols-1 gap-3">
                    {books.filter(b => activeTab === 'OLD' ? b.id <= 39 : b.id > 39).map(b => {
                      const stats = getBookStats(b);
                      return (
                        <button key={b.id} onClick={() => { setSelectedBook(b); setProgressStep('CHAPTERS'); }} 
                          className="w-full p-4 bg-zinc-50 rounded-2xl flex items-center justify-between border hover:border-[#5D7BAF] transition-all group">
                          <div className="text-left">
                            <p className="font-bold text-zinc-800 text-sm group-hover:text-[#5D7BAF]">{b.book_name}</p>
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

                {progressStep === 'CHAPTERS' && (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(selectedBook?.total_chapters || 0)].map((_, i) => {
                      const stats = getBookStats(selectedBook);
                      const isCompleted = stats.completedList.includes(i + 1);
                      return (
                        <div key={i} className={`aspect-square rounded-2xl flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                          isCompleted ? 'bg-blue-50 text-[#5D7BAF] border-2 border-blue-100' : 'bg-zinc-50 text-zinc-300 border border-zinc-100'
                        }`}>
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

      {/* --- 시작/종료 범위 설정 모달 --- */}
      <AnimatePresence>
        {showRangeModal.show && (
          <div className="fixed inset-0 z-[400] bg-black/60 flex items-end justify-center">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
              className="bg-white w-full max-w-md rounded-t-[40px] max-h-[80vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  {rangeStep === 'CHAPTER' && <button onClick={() => setRangeStep('BOOK')} className="p-1 text-zinc-400"><ChevronLeft size={24} /></button>}
                  <h3 className="text-xl font-black">{rangeStep === 'BOOK' ? "성경 권 선택" : `${tempBook?.book_name} 장 선택`}</h3>
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
