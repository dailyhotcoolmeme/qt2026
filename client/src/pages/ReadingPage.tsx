import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { 
  ChevronLeft, ChevronRight, BookOpen, Lock, X, 
  ChevronRight as ArrowRight, BarChart3, PenLine, CheckCircle2, Mic
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import AuthPage from "./AuthPage";

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  
  // 인증 및 로딩 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 성경 데이터 상태
  const [books, setBooks] = useState<any[]>([]);
  const [bibleContent, setBibleContent] = useState<any[]>([]);

  // 목표 설정 및 진행 상태
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [memo, setMemo] = useState("");

  // 목표 범위 (DB의 book_id 기준)
  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기", testament: "구약", total_chapters: 50 },
    startChapter: 1,
    endBook: { id: 1, name: "창세기", testament: "구약", total_chapters: 50 },
    endChapter: 1
  });

  // 팝업 내부 상태
  const [showModal, setShowModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  const [modalStep, setModalStep] = useState<'TESTAMENT' | 'BOOK' | 'CHAPTER'>('CHAPTER');
  const [tempSelection, setTempSelection] = useState<any>(null);

  // 1. 초기 데이터 및 인증 로드
  useEffect(() => {
    async function init() {
      const { data: bookData } = await supabase
        .from('bible_books')
        .select('*')
        .order('id', { ascending: true });
      if (bookData) setBooks(bookData);

      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    }
    init();

    // 인증 상태 변화 감지 (모달 닫기용)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (event === 'SIGNED_IN') setShowLoginModal(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // 2. 목표 확정 시 성경 본문 가져오기
  useEffect(() => {
    if (isGoalSet) {
      fetchBibleContent();
    }
  }, [isGoalSet, currentReadChapter]);

  async function fetchBibleContent() {
    setLoading(true);
    const { data } = await supabase
      .from('bible_verses')
      .select('*')
      .eq('book_name', goal.startBook.name) // 일단 시작권 기준 (장 이동 로직 필요)
      .eq('chapter', currentReadChapter)
      .order('verse', { ascending: true });
    
    if (data) setBibleContent(data);
    setLoading(false);
  }

  // 3. 선택 팝업 핸들러
  const openPicker = (type: 'START' | 'END') => {
    const current = type === 'START' ? goal.startBook : goal.endBook;
    const currentChap = type === 'START' ? goal.startChapter : goal.endChapter;
    setTempSelection({ ...current, chapter: currentChap });
    setModalStep('CHAPTER'); // 기본 장 선택부터
    setShowModal({ show: true, type });
  };

  const handleFinalChapterSelect = (chapter: number) => {
    const selected = { ...tempSelection, chapter };
    
    if (showModal.type === 'START') {
      // 시작 지점 변경 시 종료 지점을 시작과 동일하게 자동 초기화
      setGoal({
        ...goal,
        startBook: { id: selected.id, name: selected.book_name || selected.name, testament: selected.testament, total_chapters: selected.total_chapters },
        startChapter: chapter,
        endBook: { id: selected.id, name: selected.book_name || selected.name, testament: selected.testament, total_chapters: selected.total_chapters },
        endChapter: chapter
      });
    } else {
      // 종료 지점 유효성 검사 (시작 지점보다 앞설 수 없음)
      const startVal = (goal.startBook.id * 1000) + goal.startChapter;
      const endVal = (selected.id * 1000) + chapter;
      
      if (endVal < startVal) {
        alert("종료 위치는 시작 위치보다 이후여야 합니다.");
        return;
      }
      setGoal({
        ...goal,
        endBook: { id: selected.id, name: selected.book_name || selected.name, testament: selected.testament, total_chapters: selected.total_chapters },
        endChapter: chapter
      });
    }
    setShowModal({ ...showModal, show: false });
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* [헤더] DailyWordPage 디자인 100% 동일 */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);
          }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-black" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-sm text-gray-400 font-bold" style={{ fontSize: `${fontSize - 2}px` }}>
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              {` (${currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() + 1);
            if (d <= today) setCurrentDate(d);
          }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-6">
        {/* 1. 진척율 섹션 (메인색 배경 강조) */}
        <div className="flex gap-2 h-20">
          <div className="flex-1 bg-[#5D7BAF] rounded-2xl p-3 flex flex-col items-center justify-center shadow-md">
            <p className="text-white/80 font-bold mb-1" style={{ fontSize: `${fontSize - 4}px` }}>성경 전체 통독율</p>
            <p className="text-white font-black text-xl" style={{ fontSize: `${fontSize + 2}px` }}>12.5%</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-gray-100">
            <p className="text-gray-400 font-bold mb-1" style={{ fontSize: `${fontSize - 4}px` }}>오늘 목표 진척도</p>
            <p className="text-[#5D7BAF] font-black text-xl" style={{ fontSize: `${fontSize + 2}px` }}>40%</p>
          </div>
        </div>

        {/* 2. 목표 정하기 영역 */}
        {!isGoalSet && (
          <div className="relative overflow-hidden bg-white rounded-3xl border-2 border-[#5D7BAF]/10 p-6 shadow-sm">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm space-y-4 rounded-3xl px-6 text-center">
                <Lock className="w-8 h-8 text-[#5D7BAF]" />
                <Button onClick={() => setShowLoginModal(true)} className="bg-[#5D7BAF] font-black rounded-full px-8 h-12 shadow-lg active:scale-95 transition-all">
                  로그인 후 목표 정하기
                </Button>
              </div>
            )}
            
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#5D7BAF]" />
                <h3 className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘의 읽기 목표 정하기</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 cursor-pointer" onClick={() => openPicker('START')}>
                  <label className="text-xs font-bold text-gray-400 ml-1">시작 위치</label>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-black text-gray-600" style={{ fontSize: `${fontSize - 2}px` }}>
                    {goal.startBook.name} {goal.startChapter}장
                  </div>
                </div>
                <div className="space-y-2 cursor-pointer" onClick={() => openPicker('END')}>
                  <label className="text-xs font-bold text-gray-400 ml-1">종료 위치</label>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-black text-gray-600" style={{ fontSize: `${fontSize - 2}px` }}>
                    {goal.endBook.name} {goal.endChapter}장
                  </div>
                </div>
              </div>

              <Button onClick={() => { setIsGoalSet(true); setCurrentReadChapter(goal.startChapter); }}
                className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black shadow-md active:bg-[#4A638F]"
                style={{ fontSize: `${fontSize}px` }}>
                목표 확정
              </Button>
            </div>
          </div>
        )}

        {/* 3. 말씀 표시 영역 (목표 확정 후) */}
        {isGoalSet && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3">
            <Card className="border-none bg-[#5D7BAF] shadow-none rounded-sm overflow-hidden">
              <CardContent className="pt-8 pb-5 px-6">
                <div className="flex justify-between items-center mb-6 text-white font-bold">
                  <span style={{ fontSize: `${fontSize}px` }}>{goal.startBook.name} {currentReadChapter}장</span>
                  <button className="bg-white/20 p-2 rounded-full active:bg-white/30"><Mic size={18} /></button>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto pr-2 text-white leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? (
                    <div className="py-20 text-center opacity-50 font-bold">말씀을 불러오는 중...</div>
                  ) : bibleContent.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[1.8rem_1fr] items-start mb-3">
                      <span className="font-base opacity-70 text-right pr-2 pt-[0.3px] text-sm">{v.verse}</span>
                      <span className="break-keep">{v.content}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-5 border-t border-white/20 flex items-center justify-between gap-2">
                  <Button variant="ghost" className="text-white hover:bg-white/10 flex-1 h-12 font-bold"
                    disabled={currentReadChapter <= goal.startChapter}>
                    <ChevronLeft className="mr-1 w-4 h-4" /> 이전
                  </Button>
                  <Button className="bg-white text-[#5D7BAF] font-black rounded-full px-6 h-12 shadow-md">읽기 완료</Button>
                  <Button variant="ghost" className="text-white hover:bg-white/10 flex-1 h-12 font-bold"
                    disabled={currentReadChapter >= goal.endChapter}>
                    다음 <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 기록 섹션 */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="w-5 h-5 text-[#5D7BAF]" />
                <h3 className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘의 말씀 기록</h3>
              </div>
              <div className="bg-gray-100/50 rounded-2xl p-5 border border-gray-100 space-y-4 shadow-sm">
                <Textarea 
                  placeholder="묵상한 내용을 기록해 보세요."
                  className="bg-white border-none resize-none min-h-[120px] p-4 text-gray-600 rounded-xl"
                  value={memo} onChange={(e) => setMemo(e.target.value)}
                />
                <Button className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black text-lg shadow-md">기록 저장하기</Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* [내비게이션형 선택 팝업] */}
      <AnimatePresence>
        {showModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-[#5D7BAF]">{showModal.type === 'START' ? '시작' : '종료'} 위치 선택</h3>
                  <X className="cursor-pointer text-gray-400" onClick={() => setShowModal({ ...showModal, show: false })} />
                </div>
                {/* 경로 내비게이션 (Breadcrumb) */}
                <div className="flex items-center gap-2 text-xs font-bold bg-gray-50 p-2 rounded-xl overflow-x-auto no-scrollbar">
                  <span className={`px-2 py-1 rounded-lg flex-shrink-0 ${modalStep === 'TESTAMENT' ? 'bg-[#5D7BAF] text-white shadow-sm' : 'text-gray-400 cursor-pointer'}`}
                    onClick={() => setModalStep('TESTAMENT')}>{tempSelection.testament}</span>
                  <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                  <span className={`px-2 py-1 rounded-lg flex-shrink-0 ${modalStep === 'BOOK' ? 'bg-[#5D7BAF] text-white shadow-sm' : 'text-gray-400 cursor-pointer'}`}
                    onClick={() => setModalStep('BOOK')}>{tempSelection.book_name || tempSelection.name}</span>
                  {modalStep === 'CHAPTER' && (
                    <>
                      <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                      <span className="px-2 py-1 rounded-lg bg-[#5D7BAF] text-white flex-shrink-0 shadow-sm">{tempSelection.chapter}장</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                {modalStep === 'TESTAMENT' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    {['구약', '신약'].map(t => (
                      <Button key={t} variant="outline" className={`h-16 w-full rounded-2xl font-black text-lg ${tempSelection.testament === t ? 'border-[#5D7BAF] bg-blue-50 text-[#5D7BAF]' : ''}`}
                        onClick={() => { setTempSelection({...tempSelection, testament: t}); setModalStep('BOOK'); }}>{t} 성경</Button>
                    ))}
                  </div>
                )}

                {modalStep === 'BOOK' && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                    {books.filter(b => (tempSelection.testament === '구약' ? b.id <= 39 : b.id > 39)).map(b => (
                      <Button key={b.id} variant="secondary" className={`h-14 rounded-xl font-bold ${(tempSelection.book_name || tempSelection.name) === b.book_name ? 'bg-[#5D7BAF] text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                        onClick={() => { setTempSelection({ ...b, testament: tempSelection.testament, chapter: 1 }); setModalStep('CHAPTER'); }}>
                        {b.book_name}
                      </Button>
                    ))}
                  </div>
                )}

                {modalStep === 'CHAPTER' && (
                  <div className="grid grid-cols-5 gap-3 animate-in fade-in duration-300">
                    {[...Array(tempSelection.total_chapters || 50)].map((_, i) => (
                      <button key={i} className={`aspect-square rounded-2xl flex items-center justify-center font-black transition-all border-2
                        ${tempSelection.chapter === i + 1 ? 'bg-[#5D7BAF] border-[#5D7BAF] text-white shadow-md' : 'bg-gray-50 border-transparent text-gray-500'}`}
                        onClick={() => handleFinalChapterSelect(i + 1)}>
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

      {/* [로그인 모달] AuthPage 호출 */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 z-10"><X size={20}/></button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
