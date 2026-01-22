import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  BarChart3, Settings2, ChevronRight, X, Zap, CheckCircle2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  
  // UI 상태
  const [step, setStep] = useState<'SETTING' | 'READING'>('SETTING');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  
  // 상세 진척도 드릴다운 상태
  const [progressView, setProgressView] = useState<'TAB' | 'CHAPTERS'>('TAB');
  const [activeTab, setActiveTab] = useState<'OLD' | 'NEW'>('OLD');
  const [selectedBookForProgress, setSelectedBookForProgress] = useState<any>(null);

  // 목표 설정 상태
  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기", maxChapter: 50 },
    startChapter: 1,
    endBook: { id: 1, name: "창세기", maxChapter: 50 },
    endChapter: 3
  });

  const [books, setBooks] = useState<any[]>([]);

  useEffect(() => {
    async function fetchBooks() {
      const { data } = await supabase.from('bible_books').select('*').order('book_order');
      if (data) setBooks(data);
    }
    fetchBooks();
  }, []);

  // 구간 설정 팝업 내 선택 로직
  const handleRangeSelect = (book: any, chapter: number) => {
    if (showRangeModal.type === 'START') {
      setGoal({ ...goal, startBook: { id: book.book_id, name: b.book_name, maxChapter: 50 }, startChapter: chapter });
    } else {
      setGoal({ ...goal, endBook: { id: book.book_id, name: b.book_name, maxChapter: 50 }, endChapter: chapter });
    }
    setShowRangeModal({ ...showRangeModal, show: false });
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* 1. 상단 전체 진척도 카드 (TopBar 아래 위치 조정) */}
      <div className="p-4 pt-4">
        <Card className="border-none bg-[#5D7BAF] text-white shadow-xl rounded-[32px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black italic">성경 통독</h2>
                <p className="text-xs opacity-70 font-bold">하나님의 말씀을 깊이 새기는 시간</p>
              </div>
              <Button 
                onClick={() => { setProgressView('TAB'); setShowProgressModal(true); }}
                className="bg-white/20 hover:bg-white/30 border-none rounded-2xl gap-2 font-bold text-sm h-10"
              >
                <BarChart3 size={18} /> 상세 진척도
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold opacity-80">전체 완료율</span>
                <span className="text-2xl font-black">12.5%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" animate={{ width: "12.5%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. 목표 설정 영역 */}
      {step === 'SETTING' && (
        <div className="px-4 space-y-4">
          <div className="bg-white rounded-[32px] p-8 border border-zinc-100 shadow-sm">
            <h3 className="font-black text-zinc-800 mb-6 flex items-center gap-2 text-lg">
              <Settings2 size={20} className="text-[#5D7BAF]" /> 오늘의 목표 설정
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="space-y-2">
                <p className="text-xs font-black text-zinc-400 ml-1">시작 지점</p>
                <button 
                  onClick={() => setShowRangeModal({ show: true, type: 'START' })}
                  className="w-full p-5 bg-zinc-50 rounded-[24px] text-left border border-zinc-100 active:scale-95 transition-transform"
                >
                  <p className="text-xs font-bold text-[#5D7BAF]">{goal.startBook.name}</p>
                  <p className="text-xl font-black text-zinc-800">{goal.startChapter}장</p>
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black text-zinc-400 ml-1">종료 지점</p>
                <button 
                  onClick={() => setShowRangeModal({ show: true, type: 'END' })}
                  className="w-full p-5 bg-blue-50/50 rounded-[24px] text-left border border-blue-100 active:scale-95 transition-transform"
                >
                  <p className="text-xs font-bold text-[#5D7BAF]">{goal.endBook.name}</p>
                  <p className="text-xl font-black text-zinc-800">{goal.endChapter}장</p>
                </button>
              </div>
            </div>

            <Button className="w-full h-16 bg-[#5D7BAF] hover:bg-[#4A648C] text-white rounded-[20px] font-black text-lg shadow-lg shadow-blue-100">
              목표 확정 및 읽기 시작
            </Button>
          </div>
        </div>
      )}

      {/* 3. 상세 진척도 팝업 (드릴다운) */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full rounded-t-[40px] max-h-[90vh] flex flex-col">
              <div className="p-6 flex justify-between items-center border-b">
                <div className="flex items-center gap-2">
                  {progressView === 'CHAPTERS' && (
                    <button onClick={() => setProgressView('TAB')} className="p-2 -ml-2"><ChevronRight className="rotate-180" /></button>
                  )}
                  <h3 className="text-xl font-black text-zinc-900">
                    {progressView === 'TAB' ? "상세 진척도" : selectedBookForProgress?.book_name}
                  </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowProgressModal(false)}><X /></Button>
              </div>

              {progressView === 'TAB' ? (
                <>
                  <div className="flex p-4 gap-2">
                    <button onClick={() => setActiveTab('OLD')} className={`flex-1 py-3 rounded-2xl font-bold transition-all ${activeTab === 'OLD' ? "bg-[#5D7BAF] text-white" : "bg-zinc-100 text-zinc-400"}`}>구약</button>
                    <button onClick={() => setActiveTab('NEW')} className={`flex-1 py-3 rounded-2xl font-bold transition-all ${activeTab === 'NEW' ? "bg-[#5D7BAF] text-white" : "bg-zinc-100 text-zinc-400"}`}>신약</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {books.filter(b => activeTab === 'OLD' ? b.book_id <= 39 : b.book_id > 39).map((b) => (
                      <button key={b.book_id} onClick={() => { setSelectedBookForProgress(b); setProgressView('CHAPTERS'); }} className="w-full p-4 bg-zinc-50 rounded-2xl flex items-center justify-between">
                        <div className="text-left">
                          <p className="font-bold text-zinc-800">{b.book_name}</p>
                          <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-yellow-600">
                            <Zap size={10} className="fill-yellow-500" /> 진척도 45%
                          </div>
                        </div>
                        <div className="w-24 h-2 bg-zinc-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 w-[45%]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-5 gap-3">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div key={i} className={`aspect-square rounded-xl flex items-center justify-center font-bold text-sm ${i < 12 ? "bg-green-50 text-green-600 border border-green-100" : "bg-zinc-50 text-zinc-300"}`}>
                        {i < 12 ? <CheckCircle2 size={14} /> : i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. 시작/종료 구간 설정 팝업 (성경 선택) */}
      <AnimatePresence>
        {showRangeModal.show && (
          <div className="fixed inset-0 z-[400] bg-black/60 flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full rounded-t-[40px] max-h-[80vh] flex flex-col p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">{showRangeModal.type === 'START' ? "어디서부터 읽을까요?" : "어디까지 읽을까요?"}</h3>
                <Button variant="ghost" onClick={() => setShowRangeModal({ ...showRangeModal, show: false })}><X /></Button>
              </div>
              <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-2">
                {books.map(b => (
                  <button key={b.book_id} onClick={() => handleRangeSelect(b, 1)} className="p-4 text-left font-bold bg-zinc-50 rounded-2xl hover:bg-blue-50 transition-colors">
                    {b.book_name}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
