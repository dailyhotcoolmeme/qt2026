import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  BarChart3, Settings2, ChevronRight, X, Zap, CheckCircle2, ChevronLeft 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  
  // 팝업 관리
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  
  // 상세 진척도 단계: 'TAB'(구/신약) -> 'BOOKS'(권) -> 'CHAPTERS'(장)
  const [progressStep, setProgressStep] = useState<'TAB' | 'BOOKS' | 'CHAPTERS'>('TAB');
  const [activeTab, setActiveTab] = useState<'OLD' | 'NEW'>('OLD');
  const [selectedBook, setSelectedBook] = useState<any>(null);

  // 목표 설정 단계: 'BOOK'(권선택) -> 'CHAPTER'(장선택)
  const [rangeStep, setRangeStep] = useState<'BOOK' | 'CHAPTER'>('BOOK');
  const [tempSelectedBook, setTempSelectedBook] = useState<any>(null);

  // 최종 목표 데이터
  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기" },
    startChapter: 1,
    endBook: { id: 1, name: "창세기" },
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

  return (
    // 1. [해결] TopBar(h-14)에 가려지지 않도록 패딩 추가
    <div className="min-h-screen bg-zinc-50 pt-16 pb-24"> 
      
      {/* 2. 상단 전체 진척도 카드 */}
      <div className="px-4 py-2">
        <Card className="border-none bg-[#5D7BAF] text-white shadow-xl rounded-[32px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black italic tracking-tight">성경 통독</h2>
                <p className="text-[11px] opacity-70 font-bold">말씀이 삶이 되는 여정</p>
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
                <span className="text-2xl font-black">12.5%</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" animate={{ width: "12.5%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. 목표 설정 카드 */}
      <div className="px-4 mt-2">
        <div className="bg-white rounded-[32px] p-6 border border-zinc-100 shadow-sm">
          <h3 className="font-black text-zinc-800 mb-6 flex items-center gap-2">
            <Settings2 size={18} className="text-[#5D7BAF]" /> 오늘의 목표 설정
          </h3>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-400 ml-1">시작 지점</p>
              <button 
                onClick={() => { setShowRangeModal({ show: true, type: 'START' }); setRangeStep('BOOK'); }}
                className="w-full p-4 bg-zinc-50 rounded-[24px] text-left border border-zinc-100 active:scale-95 transition-transform"
              >
                <p className="text-[11px] font-bold text-[#5D7BAF]">{goal.startBook.name}</p>
                <p className="text-lg font-black text-zinc-800">{goal.startChapter}장</p>
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-400 ml-1">종료 지점</p>
              <button 
                onClick={() => { setShowRangeModal({ show: true, type: 'END' }); setRangeStep('BOOK'); }}
                className="w-full p-4 bg-blue-50/50 rounded-[24px] text-left border border-blue-100 active:scale-95 transition-transform"
              >
                <p className="text-[11px] font-bold text-[#5D7BAF]">{goal.endBook.name}</p>
                <p className="text-lg font-black text-zinc-800">{goal.endChapter}장</p>
              </button>
            </div>
          </div>

          <Button className="w-full h-14 bg-[#5D7BAF] hover:bg-[#4A648C] text-white rounded-[20px] font-black text-lg">
            목표 확정
          </Button>
        </div>
      </div>

      {/* 팝업: 상세 진척도 (구약/신약 -> 권 -> 장) */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full rounded-t-[40px] max-h-[85vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {progressStep !== 'TAB' && (
                    <button onClick={() => setProgressStep(progressStep === 'CHAPTERS' ? 'BOOKS' : 'TAB')} className="p-1"><ChevronLeft /></button>
                  )}
                  <h3 className="text-xl font-black">
                    {progressStep === 'TAB' ? "상세 진척도" : progressStep === 'BOOKS' ? (activeTab === 'OLD' ? "구약 말씀" : "신약 말씀") : selectedBook?.book_name}
                  </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowProgressModal(false)}><X /></Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {progressStep === 'TAB' && (
                  <div className="grid grid-cols-1 gap-4 p-2">
                    <button onClick={() => { setActiveTab('OLD'); setProgressStep('BOOKS'); }} className="p-8 bg-zinc-50 rounded-3xl text-left flex justify-between items-center border border-zinc-100">
                      <div><p className="text-xl font-black mb-1">구약 성경</p><p className="text-sm font-bold text-zinc-400">39권 완료율 15%</p></div>
                      <ChevronRight className="text-[#5D7BAF]" />
                    </button>
                    <button onClick={() => { setActiveTab('NEW'); setProgressStep('BOOKS'); }} className="p-8 bg-zinc-50 rounded-3xl text-left flex justify-between items-center border border-zinc-100">
                      <div><p className="text-xl font-black mb-1">신약 성경</p><p className="text-sm font-bold text-zinc-400">27권 완료율 5%</p></div>
                      <ChevronRight className="text-[#5D7BAF]" />
                    </button>
                  </div>
                )}
                
                {progressStep === 'BOOKS' && (
                  <div className="space-y-3">
                    {books.filter(b => activeTab === 'OLD' ? b.book_id <= 39 : b.book_id > 39).map(b => (
                      <button key={b.book_id} onClick={() => { setSelectedBook(b); setProgressStep('CHAPTERS'); }} className="w-full p-4 bg-zinc-50 rounded-[20px] flex items-center justify-between">
                        <span className="font-bold text-zinc-700">{b.book_name}</span>
                        <div className="flex items-center gap-3">
                           <div className="w-16 h-1.5 bg-zinc-200 rounded-full"><div className="h-full bg-yellow-400 rounded-full" style={{width: '40%'}} /></div>
                           <Zap size={14} className="text-yellow-500 fill-yellow-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {progressStep === 'CHAPTERS' && (
                  <div className="grid grid-cols-5 gap-2 p-2">
                    {[...Array(50)].map((_, i) => (
                      <button key={i} className={`aspect-square rounded-xl flex items-center justify-center font-bold text-sm ${i < 10 ? 'bg-[#5D7BAF] text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                        {i < 10 ? <CheckCircle2 size={16} /> : i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 팝업: 시작/종료 설정 (권 -> 장 선택) */}
      <AnimatePresence>
        {showRangeModal.show && (
          <div className="fixed inset-0 z-[400] bg-black/60 flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full rounded-t-[40px] max-h-[80vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {rangeStep === 'CHAPTER' && <button onClick={() => setRangeStep('BOOK')} className="p-1"><ChevronLeft /></button>}
                  <h3 className="text-xl font-black">{rangeStep === 'BOOK' ? "성경 권 선택" : `${tempSelectedBook?.book_name} 장 선택`}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowRangeModal({ ...showRangeModal, show: false })}><X /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {rangeStep === 'BOOK' ? (
                  <div className="space-y-2">
                    {books.map(b => (
                      <button key={b.book_id} onClick={() => { setTempSelectedBook(b); setRangeStep('CHAPTER'); }} className="w-full p-4 bg-zinc-50 rounded-2xl text-left font-bold hover:bg-zinc-100 transition-colors">
                        {b.book_name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {[...Array(50)].map((_, i) => (
                      <button key={i} onClick={() => {
                        if(showRangeModal.type === 'START') setGoal({...goal, startBook: {id: tempSelectedBook.book_id, name: tempSelectedBook.book_name}, startChapter: i+1});
                        else setGoal({...goal, endBook: {id: tempSelectedBook.book_id, name: tempSelectedBook.book_name}, endChapter: i+1});
                        setShowRangeModal({...showRangeModal, show: false});
                      }} className="aspect-square bg-zinc-50 rounded-xl flex items-center justify-center font-bold hover:bg-[#5D7BAF] hover:text-white transition-all">
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
