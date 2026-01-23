import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  ChevronLeft, ChevronRight, BookOpen, Lock, X, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGoalSet, setIsGoalSet] = useState(false);
  
  // 팝업 관련 상태
  const [showRangeModal, setShowRangeModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  const [modalStep, setModalStep] = useState<'TESTAMENT' | 'BOOK' | 'CHAPTER'>('TESTAMENT');
  const [tempSelection, setTempSelection] = useState({ testament: 'OLD', book: '창세기', chapter: 1 });

  // 목표 범위 상태 (기본 자동 세팅값)
  const [goalRange, setGoalRange] = useState({
    startBook: "창세기", startChapter: 1,
    endBook: "창세기", endChapter: 5
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  // 단계별 선택 핸들러
  const handleRangeSelect = (type: 'START' | 'END') => {
    setModalStep('TESTAMENT');
    setShowRangeModal({ show: true, type });
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 헤더 부분 (원본 디자인 유지) */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);
          }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-black" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-sm text-gray-400 font-bold" style={{ fontSize: `${fontSize - 2}px` }}>
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d);
          }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-6">
        
        {/* 1. 진척율 섹션 (강조 디자인 반영) */}
        <div className="flex gap-2 h-20">
          <div className="flex-1 bg-[#5D7BAF] rounded-2xl p-3 flex flex-col items-center justify-center shadow-md">
            <p className="text-[10px] text-white/80 font-bold mb-1" style={{ fontSize: `${fontSize - 5}px` }}>전체 통독율</p>
            <p className="text-white font-black text-xl" style={{ fontSize: `${fontSize + 2}px` }}>12.5%</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold mb-1" style={{ fontSize: `${fontSize - 5}px` }}>오늘 목표 진척도</p>
            <p className="text-[#5D7BAF] font-black text-xl" style={{ fontSize: `${fontSize + 2}px` }}>40%</p>
          </div>
        </div>

        {/* 2. 목표 정하기 영역 */}
        {!isGoalSet && (
          <div className="relative overflow-hidden bg-white rounded-3xl border-2 border-[#5D7BAF]/10 p-6 shadow-sm">
            {/* 로그인 안 된 경우 덮개 */}
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px] space-y-4">
                <Lock className="w-8 h-8 text-[#5D7BAF]" />
                <Button className="bg-[#5D7BAF] font-black rounded-full px-6 h-12 shadow-lg" style={{ fontSize: `${fontSize - 1}px` }}>
                  로그인 후 목표 정하기
                </Button>
              </div>
            )}

            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#5D7BAF]" />
                <h3 className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘의 읽기 목표 정하기</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-center">
                {/* 시작 위치 클릭 */}
                <div className="space-y-2 cursor-pointer" onClick={() => handleRangeSelect('START')}>
                  <label className="text-xs font-bold text-gray-400">시작 위치</label>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-black text-gray-600" style={{ fontSize: `${fontSize - 2}px` }}>
                    {goalRange.startBook} {goalRange.startChapter}장
                  </div>
                </div>
                {/* 종료 위치 클릭 */}
                <div className="space-y-2 cursor-pointer" onClick={() => handleRangeSelect('END')}>
                  <label className="text-xs font-bold text-gray-400">종료 위치</label>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-black text-gray-600" style={{ fontSize: `${fontSize - 2}px` }}>
                    {goalRange.endBook} {goalRange.endChapter}장
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setIsGoalSet(true)}
                className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black shadow-md"
                style={{ fontSize: `${fontSize}px` }}
              >
                목표 확정
              </Button>
            </div>
          </div>
        )}

        {/* 3. 말씀 리스트 (목표 확정 후) */}
        {isGoalSet && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <Card className="border-none bg-[#5D7BAF] shadow-none rounded-sm overflow-hidden">
              <CardContent className="pt-8 pb-5 px-6">
                <p className="text-white font-black mb-4" style={{ fontSize: `${fontSize}px` }}>
                  {goalRange.startBook} {goalRange.startChapter}장
                </p>
                {/* 말씀 리스트업 반복문 위치 */}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* 4. 단계별 범위 선택 모달 (팝업) */}
      <AnimatePresence>
        {showRangeModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="w-full max-w-md bg-white rounded-t-[32px] p-6 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg text-[#5D7BAF]">
                  {showRangeModal.type === 'START' ? '시작' : '종료'} 위치 선택
                </h3>
                <button onClick={() => setShowRangeModal({ show: false, type: 'START' })}><X /></button>
              </div>

              {/* 단계별 UI (구약/신약 -> 권 -> 장) */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {modalStep === 'TESTAMENT' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 font-black text-lg rounded-2xl" onClick={() => setModalStep('BOOK')}>구약</Button>
                    <Button variant="outline" className="h-20 font-black text-lg rounded-2xl" onClick={() => setModalStep('BOOK')}>신약</Button>
                  </div>
                )}
                {modalStep === 'BOOK' && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {/* 성경 권 리스트 버튼들 */}
                    {['창세기', '출애굽기', '레위기'].map(b => (
                      <Button key={b} variant="secondary" className="font-bold rounded-xl" onClick={() => setModalStep('CHAPTER')}>{b}</Button>
                    ))}
                  </div>
                )}
                {modalStep === 'CHAPTER' && (
                  <div className="grid grid-cols-5 gap-2">
                    {/* 장 리스트 버튼들 */}
                    {[1, 2, 3, 4, 5].map(c => (
                      <Button key={c} variant="outline" className="font-bold rounded-lg" 
                        onClick={() => {
                          // 선택 완료 로직
                          setShowRangeModal({ show: false, type: 'START' });
                        }}>{c}</Button>
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
