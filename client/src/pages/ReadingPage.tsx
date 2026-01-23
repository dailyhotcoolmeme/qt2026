import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { 
  ChevronLeft, ChevronRight, BookOpen, Lock, X, 
  ChevronRight as ArrowRight, BarChart3, PenLine, CheckCircle2, Mic, AlertCircle
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

  // 성경 데이터 및 상태
  const [books, setBooks] = useState<any[]>([]);
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [memo, setMemo] = useState("");

  // 팝업/모달 관리
  const [showModal, setShowModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  const [modalStep, setModalStep] = useState<'TESTAMENT' | 'BOOK' | 'CHAPTER'>('CHAPTER');
  const [tempSelection, setTempSelection] = useState<any>(null);
  
  // 경고 및 확인 팝업 (DailyWordPage 스타일)
  const [alertConfig, setAlertConfig] = useState<{show: boolean, title: string, desc: string, action?: () => void} | null>(null);

  // 목표 범위 상태
  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기", testament: "구약", total_chapters: 50 },
    startChapter: 1,
    endBook: { id: 1, name: "창세기", testament: "구약", total_chapters: 50 },
    endChapter: 1
  });

  // 1. 초기 로드 및 목표 복구
  useEffect(() => {
    async function init() {
      const { data: bookData } = await supabase.from('bible_books').select('*').order('id', { ascending: true });
      if (bookData) setBooks(bookData);

      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      // 로컬 스토리지에서 이전 목표 복구
      const savedGoal = localStorage.getItem('reading_goal');
      if (savedGoal) {
        const parsed = JSON.parse(savedGoal);
        setGoal(parsed.goal);
        setIsGoalSet(parsed.isGoalSet);
        setCurrentReadChapter(parsed.currentChapter);
      }
    }
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (event === 'SIGNED_IN') setShowLoginModal(false);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // 목표 상태 변경될 때마다 로컬 스토리지 저장
  useEffect(() => {
    if (isGoalSet) {
      localStorage.setItem('reading_goal', JSON.stringify({ goal, isGoalSet, currentChapter: currentReadChapter }));
    }
  }, [goal, isGoalSet, currentReadChapter]);

  // 말씀 데이터 페칭
  useEffect(() => {
    if (isGoalSet) fetchBibleContent();
  }, [isGoalSet, currentReadChapter]);

  async function fetchBibleContent() {
    setLoading(true);
    const { data } = await supabase
      .from('bible_verses')
      .select('*')
      .eq('book_name', goal.startBook.name) 
      .eq('chapter', currentReadChapter)
      .order('verse', { ascending: true });
    if (data) setBibleContent(data);
    setLoading(false);
  }

  // 이전/다음 장 이동
  const moveChapter = (direction: 'PREV' | 'NEXT') => {
    if (direction === 'PREV' && currentReadChapter > goal.startChapter) {
      setCurrentReadChapter(prev => prev - 1);
    } else if (direction === 'NEXT' && currentReadChapter < goal.endChapter) {
      setCurrentReadChapter(prev => prev + 1);
    }
  };

  // 읽기 완료 토글
  const handleCompleteToggle = () => {
    if (!isReadCompleted) {
      setIsReadCompleted(true);
    } else {
      setAlertConfig({
        show: true,
        title: "읽기 완료 취소",
        desc: "오늘의 읽기 완료를 취소하시겠습니까?",
        action: () => { setIsReadCompleted(false); setAlertConfig(null); }
      });
    }
  };

  // 범위 선택 로직
  const handleFinalChapterSelect = (chapter: number) => {
    const selected = { ...tempSelection, chapter };
    if (showModal.type === 'START') {
      setGoal({
        ...goal,
        startBook: { id: selected.id, name: selected.book_name || selected.name, testament: selected.testament, total_chapters: selected.total_chapters },
        startChapter: chapter,
        endBook: { id: selected.id, name: selected.book_name || selected.name, testament: selected.testament, total_chapters: selected.total_chapters },
        endChapter: chapter
      });
    } else {
      const startVal = (goal.startBook.id * 1000) + goal.startChapter;
      const endVal = (selected.id * 1000) + chapter;
      if (endVal < startVal) {
        setAlertConfig({ show: true, title: "범위 선택 오류", desc: "종료 위치는 시작 위치보다 이전일 수 없습니다." });
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
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-black" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-sm text-gray-400 font-bold" style={{ fontSize: `${fontSize - 2}px` }}>{currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} ({currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); if (d <= today) setCurrentDate(d); }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-6">
        {/* 1. 진척율 섹션 + 에너지 레벨 */}
        <div className="space-y-3">
          <div className="flex gap-2 h-20">
            <div className="flex-1 bg-[#5D7BAF] rounded-2xl p-3 flex flex-col items-center justify-center shadow-md">
              <p className="text-white/80 font-bold mb-1" style={{ fontSize: `${fontSize - 4}px` }}>성경 전체 통독율</p>
              <p className="text-white font-black text-xl" style={{ fontSize: `${fontSize + 2}px` }}>12.5%</p>
              <div className="w-full bg-white/20 h-1 rounded-full mt-2 overflow-hidden"><div className="bg-white h-full" style={{ width: '12.5%' }} /></div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-gray-100">
              <p className="text-gray-400 font-bold mb-1" style={{ fontSize: `${fontSize - 4}px` }}>오늘 목표 진척도</p>
              <p className="text-[#5D7BAF] font-black text-xl" style={{ fontSize: `${fontSize + 2}px` }}>40%</p>
              <div className="w-full bg-gray-200 h-1 rounded-full mt-2 overflow-hidden"><div className="bg-[#5D7BAF] h-full" style={{ width: '40%' }} /></div>
            </div>
          </div>
        </div>

        {/* 2. 목표 정하기 영역 */}
        {!isGoalSet && (
          <div className="relative overflow-hidden bg-white rounded-3xl border-2 border-[#5D7BAF]/10 p-6 shadow-sm">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm space-y-4 rounded-3xl px-6">
                <Lock className="w-8 h-8 text-[#5D7BAF]" />
                <Button onClick={() => setShowLoginModal(true)} className="bg-[#5D7BAF] font-black rounded-full px-8 h-12 shadow-lg">로그인 후 목표 정하기</Button>
              </div>
            )}
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#5D7BAF]" />
                  <h3 className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘의 읽기 목표 정하기</h3>
                </div>
                <p className="text-gray-400 font-bold" style={{ fontSize: `${fontSize - 5}px` }}>출퇴근길, 잠들기 전, 원하는 아무때나 음성으로 말씀을 들을 수 있습니다.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 cursor-pointer" onClick={() => { setTempSelection({...goal.startBook, chapter: goal.startChapter}); setModalStep('CHAPTER'); setShowModal({show: true, type: 'START'}); }}>
                  <label className="text-xs font-bold text-gray-400 ml-1">시작 위치</label>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-black text-gray-600" style={{ fontSize: `${fontSize - 2}px` }}>{goal.startBook.name} {goal.startChapter}장</div>
                </div>
                <div className="space-y-2 cursor-pointer" onClick={() => { setTempSelection({...goal.endBook, chapter: goal.endChapter}); setModalStep('CHAPTER'); setShowModal({show: true, type: 'END'}); }}>
                  <label className="text-xs font-bold text-gray-400 ml-1">종료 위치</label>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-black text-gray-600" style={{ fontSize: `${fontSize - 2}px` }}>{goal.endBook.name} {goal.endChapter}장</div>
                </div>
              </div>
              <Button onClick={() => { setIsGoalSet(true); setCurrentReadChapter(goal.startChapter); }} className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black shadow-md" style={{ fontSize: `${fontSize}px` }}>목표 확정</Button>
            </div>
          </div>
        )}

        {/* 3. 말씀 읽기 영역 */}
        {isGoalSet && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3">
            <Card className="border-none bg-[#5D7BAF] shadow-none rounded-sm overflow-hidden">
              <CardContent className="pt-8 pb-5 px-6">
                <div className="flex justify-between items-center mb-6 text-white font-bold">
                  <span style={{ fontSize: `${fontSize}px` }}>{goal.startBook.name} {currentReadChapter}장</span>
                  <button className="bg-white/20 p-2 rounded-full active:bg-white/30"><Mic size={18} /></button>
                </div>
                <div className="max-h-[400px] overflow-y-auto pr-2 text-white leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? <div className="py-20 text-center opacity-50 font-bold">말씀을 불러오는 중...</div> : bibleContent.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[1.8rem_1fr] items-start mb-3">
                      <span className="font-base opacity-70 text-right pr-2 pt-[0.3px] text-sm">{v.verse}</span>
                      <span className="break-keep">{v.content}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-5 border-t border-white/20 flex items-center justify-between gap-2">
                  <Button onClick={() => moveChapter('PREV')} variant="ghost" className="text-white hover:bg-white/10 flex-1 h-12 font-bold" disabled={currentReadChapter <= goal.startChapter}><ChevronLeft size={16} /> 이전</Button>
                  <Button 
                    onClick={handleCompleteToggle}
                    className={`flex-none px-6 h-12 rounded-full font-black shadow-md transition-all ${isReadCompleted ? 'bg-green-500 text-white' : 'bg-white text-[#5D7BAF]'}`}
                  >
                    {isReadCompleted ? <><CheckCircle2 className="mr-1" size={18} /> 완료됨</> : "읽기 완료"}
                  </Button>
                  <Button onClick={() => moveChapter('NEXT')} variant="ghost" className="text-white hover:bg-white/10 flex-1 h-12 font-bold" disabled={currentReadChapter >= goal.endChapter}>다음 <ChevronRight size={16} /></Button>
                </div>
              </CardContent>
            </Card>
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3"><PenLine className="w-5 h-5 text-[#5D7BAF]" /><h3 className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘의 말씀 기록</h3></div>
              <div className="bg-gray-100/50 rounded-2xl p-5 border border-gray-100 space-y-4 shadow-sm">
                <Textarea placeholder="묵상한 내용을 기록해 보세요." className="bg-white border-none resize-none min-h-[120px] p-4 text-gray-600 rounded-xl" value={memo} onChange={(e) => setMemo(e.target.value)} />
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
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[32px] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-[#5D7BAF]">{showModal.type === 'START' ? '시작' : '종료'} 위치 선택</h3>
                  <X className="cursor-pointer text-gray-400" onClick={() => setShowModal({ ...showModal, show: false })} />
                </div>
                <div className="flex items-center gap-2 text-xs font-bold bg-gray-50 p-2 rounded-xl overflow-x-auto no-scrollbar">
                  <span className={`px-2 py-1 rounded-lg ${modalStep === 'TESTAMENT' ? 'bg-[#5D7BAF] text-white' : 'text-gray-400 cursor-pointer'}`} onClick={() => setModalStep('TESTAMENT')}>{tempSelection.testament}</span>
                  <ArrowRight size={14} className="text-gray-300" />
                  <span className={`px-2 py-1 rounded-lg ${modalStep === 'BOOK' ? 'bg-[#5D7BAF] text-white' : 'text-gray-400 cursor-pointer'}`} onClick={() => setModalStep('BOOK')}>{tempSelection.book_name || tempSelection.name}</span>
                  {modalStep === 'CHAPTER' && <><ArrowRight size={14} className="text-gray-300" /><span className="px-2 py-1 rounded-lg bg-[#5D7BAF] text-white">{tempSelection.chapter}장</span></>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                {modalStep === 'TESTAMENT' && (
                  <div className="space-y-3">
                    {['구약', '신약'].map(t => (
                      <Button key={t} variant="outline" className={`h-16 w-full rounded-2xl font-black text-lg ${tempSelection.testament === t ? 'border-[#5D7BAF] bg-blue-50 text-[#5D7BAF]' : ''}`} onClick={() => { setTempSelection({...tempSelection, testament: t}); setModalStep('BOOK'); }}>{t} 성경</Button>
                    ))}
                  </div>
                )}
                {modalStep === 'BOOK' && (
                  <div className="grid grid-cols-2 gap-3">
                    {books.filter(b => (tempSelection.testament === '구약' ? b.id <= 39 : b.id > 39)).map(b => (
                      <Button key={b.id} variant="secondary" className={`h-14 rounded-xl font-bold ${(tempSelection.book_name || tempSelection.name) === b.book_name ? 'bg-[#5D7BAF] text-white' : 'bg-gray-100'}`} onClick={() => { setTempSelection({ ...b, testament: tempSelection.testament, chapter: 1 }); setModalStep('CHAPTER'); }}>{b.book_name}</Button>
                    ))}
                  </div>
                )}
                {modalStep === 'CHAPTER' && (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(tempSelection.total_chapters || 0)].map((_, i) => (
                      <button key={i} className={`aspect-square rounded-2xl flex items-center justify-center font-black transition-all border-2 ${tempSelection.chapter === i + 1 ? 'bg-[#5D7BAF] border-[#5D7BAF] text-white shadow-md' : 'bg-gray-50 border-transparent text-gray-500'}`} onClick={() => handleFinalChapterSelect(i + 1)}>{i + 1}</button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* [공용 모달 디자인: DailyWordPage 스타일] */}
      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-[2px]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <AlertCircle className="text-red-500" size={32} />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2" style={{ fontSize: `${fontSize}px` }}>{alertConfig.title}</h3>
                <p className="text-gray-500 font-bold leading-relaxed" style={{ fontSize: `${fontSize - 2}px` }}>{alertConfig.desc}</p>
              </div>
              <div className="flex border-t border-gray-100">
                <button onClick={() => setAlertConfig(null)} className="flex-1 py-4 font-bold text-gray-400 border-r border-gray-100 hover:bg-gray-50 transition-colors">취소</button>
                <button onClick={() => alertConfig.action ? alertConfig.action() : setAlertConfig(null)} className="flex-1 py-4 font-bold text-red-500 hover:bg-red-50 transition-colors">확인</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative p-6 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-500"><X /></button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
