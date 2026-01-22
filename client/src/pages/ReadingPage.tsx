import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { BarChart3, Settings2, ChevronRight, X, Zap, CheckCircle2, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function ReadingPage() {
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressStep, setProgressStep] = useState<'TAB' | 'BOOKS' | 'CHAPTERS'>('TAB');
  const [activeTab, setActiveTab] = useState<'OLD' | 'NEW'>('OLD');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);

  // 가상의 진척도 데이터 (나중에 DB 연동 시 이 부분을 유저 데이터로 대체)
  const stats = { old: 15, new: 5 }; 

  useEffect(() => {
    async function fetchBooks() {
      const { data } = await supabase.from('bible_books').select('*').order('book_order');
      if (data) setBooks(data);
    }
    fetchBooks();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 pt-16 pb-24">
      {/* 상단 헤더 및 전체 진척도 */}
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
                <span className="text-2xl font-black">12%</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div className="h-full bg-white rounded-full shadow-[0_0_8px_white]" animate={{ width: "12%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 목표 설정 영역 (생략 - 이전과 동일) */}

      {/* 상세 진척도 팝업 (에너지 레벨 반영) */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full rounded-t-[40px] max-h-[85vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {progressStep !== 'TAB' && (
                    <button onClick={() => setProgressStep(progressStep === 'CHAPTERS' ? 'BOOKS' : 'TAB')} className="p-1 text-zinc-400"><ChevronLeft /></button>
                  )}
                  <h3 className="text-xl font-black">
                    {progressStep === 'TAB' ? "상세 진척도" : progressStep === 'BOOKS' ? (activeTab === 'OLD' ? "구약 말씀" : "신약 말씀") : selectedBook?.book_name}
                  </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowProgressModal(false)}><X /></Button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* 1단계: 구약/신약 선택 (에너지 레벨 적용) */}
                {progressStep === 'TAB' && (
                  <div className="space-y-4">
                    {[
                      { id: 'OLD', label: '구약 성경', range: '1~39권', percent: stats.old },
                      { id: 'NEW', label: '신약 성경', range: '40~66권', percent: stats.new }
                    ].map((tab) => (
                      <button 
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as 'OLD' | 'NEW'); setProgressStep('BOOKS'); }}
                        className="w-full p-6 bg-zinc-50 rounded-[28px] text-left border border-zinc-100 active:bg-zinc-100 transition-all"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <p className="text-xl font-black text-zinc-800">{tab.label}</p>
                            <p className="text-xs font-bold text-zinc-400">{tab.range}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-[#5D7BAF]">{tab.percent}%</span>
                          </div>
                        </div>
                        {/* 탭 에너지 레벨 바 */}
                        <div className="h-3 bg-zinc-200 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${tab.percent}%` }} 
                            className="h-full bg-[#5D7BAF] rounded-full" 
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* 2단계: 권별 에너지 레벨 리스트 */}
                {progressStep === 'BOOKS' && (
                  <div className="grid grid-cols-1 gap-3">
                    {books.filter(b => activeTab === 'OLD' ? b.book_id <= 39 : b.book_id > 39).map(b => (
                      <button 
                        key={b.book_id} 
                        onClick={() => { setSelectedBook(b); setProgressStep('CHAPTERS'); }}
                        className="w-full p-4 bg-zinc-50 rounded-2xl flex items-center justify-between border border-transparent active:border-zinc-200"
                      >
                        <div className="text-left">
                          <p className="font-bold text-zinc-800 text-sm">{b.book_name}</p>
                          <p className="text-[10px] font-bold text-[#5D7BAF] mt-0.5">45% 읽음</p>
                        </div>
                        <div className="flex items-center gap-4">
                           {/* 권별 에너지 레벨 바 */}
                           <div className="w-20 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                             <div className="h-full bg-yellow-400" style={{ width: '45%' }} />
                           </div>
                           <ChevronRight size={16} className="text-zinc-300" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 3단계: 장별 완료 여부 (드릴다운 최종) */}
                {progressStep === 'CHAPTERS' && (
                  <div className="grid grid-cols-5 gap-3 p-1">
                    {[...Array(selectedBook?.total_chapters || 50)].map((_, i) => (
                      <button 
                        key={i} 
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-bold text-xs transition-all ${
                          i < 12 ? 'bg-blue-50 text-[#5D7BAF] border-2 border-blue-100' : 'bg-zinc-50 text-zinc-300'
                        }`}
                      >
                        {i < 12 ? <CheckCircle2 size={16} className="mb-0.5" /> : i + 1}
                        {i < 12 && <span className="text-[8px]">완료</span>}
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
