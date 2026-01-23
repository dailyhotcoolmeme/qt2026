import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { ChevronLeft, ChevronRight, X, ChevronRight as ArrowRight, Lock, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import AuthPage from "./AuthPage";

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [isGoalSet, setIsGoalSet] = useState(false);

  // 목표 범위 상태 (기본값)
  const [goalRange, setGoalRange] = useState({
    startBook: "창세기", startChapter: 1, startTestament: "구약",
    endBook: "창세기", endChapter: 5, endTestament: "구약"
  });

  // 팝업 내부 선택 관리 상태
  const [showRangeModal, setShowRangeModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  const [modalStep, setModalStep] = useState<'TESTAMENT' | 'BOOK' | 'CHAPTER'>('CHAPTER'); // 기본적으로 장 선택부터 노출
  const [tempSelection, setTempSelection] = useState({ testament: '구약', book: '창세기', chapter: 1 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  // 시작/종료 버튼 클릭 시 팝업 열기
  const openRangePicker = (type: 'START' | 'END') => {
    const current = type === 'START' 
      ? { testament: goalRange.startTestament, book: goalRange.startBook, chapter: goalRange.startChapter }
      : { testament: goalRange.endTestament, book: goalRange.endBook, chapter: goalRange.endChapter };
    
    setTempSelection(current);
    setModalStep('CHAPTER'); // 첫 화면은 장 리스트
    setShowRangeModal({ show: true, type });
  };

  if (showLoginPage) return <AuthPage />;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 헤더 생략 (기존 디자인 유지) */}

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-6">
        {/* 진척율 영역 */}
        <div className="flex gap-2 h-20">
          <div className="flex-1 bg-[#5D7BAF] rounded-2xl p-3 flex flex-col items-center justify-center shadow-md">
            <p className="text-white/80 font-bold mb-1" style={{ fontSize: `${fontSize - 4}px` }}>전체 통독율</p>
            <p className="text-white font-black text-xl" style={{ fontSize: `${fontSize + 2}px` }}>12.5%</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-gray-100 font-black">
            <p className="text-gray-400 font-bold mb-1" style={{ fontSize: `${fontSize - 4}px` }}>오늘 목표 진척도</p>
            <p className="text-[#5D7BAF] text-xl" style={{ fontSize: `${fontSize + 2}px` }}>40%</p>
          </div>
        </div>

        {/* 목표 정하기 영역 */}
        {!isGoalSet && (
          <div className="relative overflow-hidden bg-white rounded-3xl border-2 border-[#5D7BAF]/10 p-6 shadow-sm">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] space-y-4">
                <Lock className="w-8 h-8 text-[#5D7BAF]" />
                <Button onClick={() => setShowLoginPage(true)} className="bg-[#5D7BAF] font-black rounded-full px-8 h-12 shadow-lg">로그인 후 목표 정하기</Button>
              </div>
            )}
            <div className="space-y-6">
              <div className="flex items-center gap-2 font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>
                <BookOpen size={20}/> <h3>오늘의 읽기 목표 정하기</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2" onClick={() => openRangePicker('START')}>
                  <label className="text-xs font-bold text-gray-400 ml-1">시작 위치</label>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-black text-gray-600 active:bg-gray-100">
                    {goalRange.startBook} {goalRange.startChapter}장
                  </div>
                </div>
                <div className="space-y-2" onClick={() => openRangePicker('END')}>
                  <label className="text-xs font-bold text-gray-400 ml-1">종료 위치</label>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-black text-gray-600 active:bg-gray-100">
                    {goalRange.endBook} {goalRange.endChapter}장
                  </div>
                </div>
              </div>
              <Button onClick={() => setIsGoalSet(true)} className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black shadow-md">목표 확정</Button>
            </div>
          </div>
        )}
      </main>

      {/* [내비게이션형 선택 팝업] */}
      <AnimatePresence>
        {showRangeModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[32px] overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* 상단 경로 (Breadcrumb) 영역 */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-[#5D7BAF]">{showRangeModal.type === 'START' ? '시작' : '종료'} 위치 선택</h3>
                  <button onClick={() => setShowRangeModal({ show: false, type: 'START' })}><X size={20}/></button>
                </div>
                
                {/* 단계 이동 경로 표시 */}
                <div className="flex items-center gap-2 text-sm font-bold bg-gray-50 p-2 rounded-xl">
                  <span className={`px-2 py-1 rounded-lg ${modalStep === 'TESTAMENT' ? 'bg-[#5D7BAF] text-white' : 'text-gray-400 cursor-pointer'}`}
                        onClick={() => setModalStep('TESTAMENT')}>{tempSelection.testament}</span>
                  <ArrowRight size={14} className="text-gray-300"/>
                  <span className={`px-2 py-1 rounded-lg ${modalStep === 'BOOK' ? 'bg-[#5D7BAF] text-white' : 'text-gray-400 cursor-pointer'}`}
                        onClick={() => setModalStep('BOOK')}>{tempSelection.book}</span>
                  {modalStep === 'CHAPTER' && (
                    <>
                      <ArrowRight size={14} className="text-gray-300"/>
                      <span className="px-2 py-1 rounded-lg bg-[#5D7BAF] text-white">{tempSelection.chapter}장</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* 1단계: 구약/신약 */}
                {modalStep === 'TESTAMENT' && (
                  <div className="grid grid-cols-1 gap-3">
                    {['구약', '신약'].map(t => (
                      <Button key={t} variant="outline" className={`h-16 rounded-2xl font-black text-lg ${tempSelection.testament === t ? 'border-[#5D7BAF] bg-blue-50 text-[#5D7BAF]' : ''}`}
                              onClick={() => { setTempSelection({...tempSelection, testament: t}); setModalStep('BOOK'); }}>{t} 성경</Button>
                    ))}
                  </div>
                )}

                {/* 2단계: 권 선택 */}
                {modalStep === 'BOOK' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['창세기', '출애굽기', '레위기', '민수기', '신명기'].map(b => (
                      <Button key={b} variant="secondary" className={`h-14 rounded-xl font-bold ${tempSelection.book === b ? 'bg-[#5D7BAF] text-white' : 'bg-gray-100'}`}
                              onClick={() => { setTempSelection({...tempSelection, book: b}); setModalStep('CHAPTER'); }}>{b}</Button>
                    ))}
                  </div>
                )}

                {/* 3단계: 장 선택 (숫자 그리드) */}
                {modalStep === 'CHAPTER' && (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(50)].map((_, i) => (
                      <button key={i} className={`aspect-square rounded-2xl flex items-center justify-center font-black transition-all border-2
                        ${tempSelection.chapter === i + 1 ? 'bg-[#5D7BAF] border-[#5D7BAF] text-white shadow-md' : 'bg-gray-50 border-transparent text-gray-500'}`}
                        onClick={() => {
                          const updated = { ...tempSelection, chapter: i + 1 };
                          if (showRangeModal.type === 'START') {
                            setGoalRange({...goalRange, startTestament: updated.testament, startBook: updated.book, startChapter: updated.chapter});
                          } else {
                            setGoalRange({...goalRange, endTestament: updated.testament, endBook: updated.book, endChapter: updated.chapter});
                          }
                          setShowRangeModal({ show: false, type: 'START' });
                        }}>
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
