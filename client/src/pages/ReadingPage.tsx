import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { 
  ChevronLeft, ChevronRight, BookOpen, Lock, X, 
  ChevronRight as ArrowRight, PenLine, CheckCircle2, Mic, AlertCircle, Settings2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import AuthPage from "./AuthPage";

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 인증 및 로딩
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 데이터 상태
  const [books, setBooks] = useState<any[]>([]);
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [memo, setMemo] = useState("");

  // 진척도 데이터 (권/장별 완료 여부 확인용)
  const [readHistory, setReadHistory] = useState<any[]>([]); 

  // 팝업 관리
  const [showModal, setShowModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  const [modalStep, setModalStep] = useState<'TESTAMENT' | 'BOOK' | 'CHAPTER'>('CHAPTER');
  const [tempSelection, setTempSelection] = useState<any>(null);
  const [alertConfig, setAlertConfig] = useState<{show: boolean, title: string, desc: string, action?: () => void, isConfirm?: boolean} | null>(null);

  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기", testament: "구약", total_chapters: 50 },
    startChapter: 1,
    endBook: { id: 1, name: "창세기", testament: "구약", total_chapters: 50 },
    endChapter: 1
  });

  // 1. 초기화 및 세션 감지
  useEffect(() => {
    async function init() {
      const { data: bookData } = await supabase.from('bible_books').select('*').order('id', { ascending: true });
      if (bookData) setBooks(bookData);

      const { data: { session } } = await supabase.auth.getSession();
      const isAuth = !!session;
      setIsAuthenticated(isAuth);

      if (isAuth) {
        // 실제 유저의 읽기 기록 가져오기 (예시 테이블: user_bible_progress)
        const { data: history } = await supabase.from('user_bible_progress').select('*').eq('user_id', session.user.id);
        if (history) setReadHistory(history);

        const savedGoal = localStorage.getItem('reading_goal');
        if (savedGoal) {
          const parsed = JSON.parse(savedGoal);
          setGoal(parsed.goal);
          setIsGoalSet(parsed.isGoalSet);
          setCurrentReadChapter(parsed.currentChapter);
        }
      } else {
        localStorage.removeItem('reading_goal');
        setIsGoalSet(false);
      }
    }
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const isAuth = !!session;
      setIsAuthenticated(isAuth);
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('reading_goal');
        setIsGoalSet(false);
      }
      if (event === 'SIGNED_IN') setShowLoginModal(false);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // 목표 저장 (로그인 시에만)
  useEffect(() => {
    if (isGoalSet && isAuthenticated) {
      localStorage.setItem('reading_goal', JSON.stringify({ goal, isGoalSet, currentChapter: currentReadChapter }));
    }
  }, [goal, isGoalSet, currentReadChapter, isAuthenticated]);

  useEffect(() => {
    if (isGoalSet) fetchBibleContent();
  }, [isGoalSet, currentReadChapter]);

  async function fetchBibleContent() {
    setLoading(true);
    const { data } = await supabase.from('bible_verses').select('*').eq('book_name', goal.startBook.name).eq('chapter', currentReadChapter).order('verse', { ascending: true });
    if (data) setBibleContent(data);
    setLoading(false);
  }

  // 완료율 계산 함수 (권 ID 기준)
  const getBookProgress = (bookId: number, total: number) => {
    const readChapters = readHistory.filter(h => h.book_id === bookId).length;
    return Math.round((readChapters / total) * 100);
  };

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
        setAlertConfig({ show: true, title: "선택 범위 오류", desc: "종료 위치는 시작 위치 이후여야 합니다.", isConfirm: false });
        return;
      }
      setGoal({ ...goal, endBook: { id: selected.id, name: selected.book_name || selected.name, testament: selected.testament, total_chapters: selected.total_chapters }, endChapter: chapter });
    }
    setShowModal({ ...showModal, show: false });
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 헤더 */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-black" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-sm text-gray-400 font-bold">{currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setCurrentDate(d); }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-6">
        {/* 진척도 대시보드 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#5D7BAF] rounded-2xl p-4 flex flex-col justify-center shadow-md">
            <p className="text-white/70 font-bold text-[10px] mb-1">성경 전체 통독율</p>
            <p className="text-white font-black text-xl mb-2">12.5%</p>
            <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden"><div className="bg-white h-full" style={{ width: '12.5%' }} /></div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center">
            <p className="text-gray-400 font-bold text-[10px] mb-1">오늘 목표 진척도</p>
            <p className="text-[#5D7BAF] font-black text-xl mb-2">40%</p>
            <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden"><div className="bg-[#5D7BAF] h-full" style={{ width: '40%' }} /></div>
          </div>
        </div>

        {/* 목표 설정/말씀 영역 */}
        {!isGoalSet ? (
          <div className="relative bg-white rounded-3xl border-2 border-[#5D7BAF]/10 p-6 shadow-sm">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-3xl px-6 text-center">
                <Lock className="w-8 h-8 text-[#5D7BAF] mb-4" />
                <Button onClick={() => setShowLoginModal(true)} className="bg-[#5D7BAF] font-black rounded-full px-8 h-12 shadow-lg">로그인 후 목표 정하기</Button>
              </div>
            )}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#5D7BAF]" />
                  <h3 className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘의 읽기 목표 정하기</h3>
                </div>
              </div>
              <p className="text-gray-400 font-bold text-[11px] -mt-3">출퇴근길, 잠들기 전, 원하는 아무때나 음성으로 말씀을 들을 수 있습니다.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-4 rounded-2xl border cursor-pointer" onClick={() => openPicker('START')}>
                  <p className="text-xs font-bold text-gray-400">시작 위치</p>
                  <p className="font-black text-gray-600">{goal.startBook.name} {goal.startChapter}장</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border cursor-pointer" onClick={() => openPicker('END')}>
                  <p className="text-xs font-bold text-gray-400">종료 위치</p>
                  <p className="font-black text-gray-600">{goal.endBook.name} {goal.endChapter}장</p>
                </div>
              </div>
              <Button onClick={() => { setIsGoalSet(true); setCurrentReadChapter(goal.startChapter); }} className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black text-lg shadow-md">목표 확정</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3">
            {/* 목표 수정 헤더 */}
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-[#5D7BAF]" size={18} />
                <span className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize - 1}px` }}>{goal.startBook.name} {goal.startChapter}장 ~ {goal.endBook.name} {goal.endChapter}장</span>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-400 font-bold h-8 flex items-center gap-1" onClick={() => setIsGoalSet(false)}>
                <Settings2 size={14} /> 목표 수정
              </Button>
            </div>

            <Card className="border-none bg-[#5D7BAF] shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="flex justify-between items-center mb-6 text-white font-bold">
                  <span style={{ fontSize: `${fontSize + 2}px` }}>{goal.startBook.name} {currentReadChapter}장</span>
                  <button className="bg-white/20 p-2 rounded-full active:scale-95"><Mic size={20} /></button>
                </div>
                <div className="min-h-[300px] max-h-[450px] overflow-y-auto pr-2 text-white leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? <div className="py-20 text-center font-bold opacity-50">말씀을 불러오는 중...</div> : bibleContent.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[1.8rem_1fr] items-start mb-4">
                      <span className="font-bold opacity-50 text-right pr-3 pt-[2px] text-xs">{v.verse}</span>
                      <span className="break-keep font-medium">{v.content}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between gap-3">
                  <Button variant="ghost" className="text-white flex-1 h-12 font-bold" onClick={() => currentReadChapter > goal.startChapter && setCurrentReadChapter(c => c - 1)} disabled={currentReadChapter <= goal.startChapter}><ChevronLeft size={20} /> 이전</Button>
                  <Button onClick={() => !isReadCompleted ? setIsReadCompleted(true) : setAlertConfig({ show: true, title: "읽기 완료 취소", desc: "읽기 완료 상태를 취소하시겠습니까?", isConfirm: true, action: () => { setIsReadCompleted(false); setAlertConfig(null); } })}
                    className={`flex-none px-8 h-12 rounded-full font-black shadow-lg transition-all ${isReadCompleted ? 'bg-green-500 text-white' : 'bg-white text-[#5D7BAF]'}`}>
                    {isReadCompleted ? <div className="flex items-center gap-1"><CheckCircle2 size={18} /> 완료됨</div> : "읽기 완료"}
                  </Button>
                  <Button variant="ghost" className="text-white flex-1 h-12 font-bold" onClick={() => currentReadChapter < goal.endChapter && setCurrentReadChapter(c => c + 1)} disabled={currentReadChapter >= goal.endChapter}>다음 <ChevronRight size={20} /></Button>
                </div>
              </CardContent>
            </Card>
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4 shadow-inner">
               <Textarea placeholder="오늘 주신 말씀을 묵상하며 기록을 남겨보세요." className="bg-white border-none resize-none min-h-[120px] p-4 text-gray-700 rounded-xl" value={memo} onChange={(e) => setMemo(e.target.value)} />
               <Button className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black text-lg shadow-md">기록 저장하기</Button>
            </div>
          </div>
        )}
      </main>

      {/* 내비게이션형 선택 팝업 */}
      <AnimatePresence>
        {showModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[40px] shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-7 border-b border-gray-50">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-black text-[#5D7BAF] text-lg">{showModal.type === 'START' ? '시작' : '종료'} 위치 설정</h3>
                  <button onClick={() => setShowModal({ ...showModal, show: false })} className="p-2 bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border">
                  <span className={`px-3 py-1.5 rounded-xl transition-colors ${modalStep === 'TESTAMENT' ? 'bg-[#5D7BAF] text-white shadow-md' : 'text-gray-400 cursor-pointer'}`} onClick={() => setModalStep('TESTAMENT')}>{tempSelection?.testament}</span>
                  <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                  <span className={`px-3 py-1.5 rounded-xl transition-colors ${modalStep === 'BOOK' ? 'bg-[#5D7BAF] text-white shadow-md' : 'text-gray-400 cursor-pointer'}`} onClick={() => setModalStep('BOOK')}>{tempSelection?.book_name || tempSelection?.name}</span>
                  {modalStep === 'CHAPTER' && <><ArrowRight size={14} className="text-gray-300" /><span className="px-3 py-1.5 rounded-xl bg-[#5D7BAF] text-white shadow-md">{tempSelection?.chapter}장</span></>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-7 min-h-[350px]">
                {modalStep === 'TESTAMENT' && (
                  <div className="space-y-4">
                    {['구약', '신약'].map(t => (
                      <Button key={t} variant="outline" className={`h-20 w-full rounded-[24px] font-black text-xl border-2 ${tempSelection?.testament === t ? 'border-[#5D7BAF] bg-blue-50 text-[#5D7BAF]' : 'border-gray-100 text-gray-400'}`} onClick={() => { setTempSelection({...tempSelection, testament: t}); setModalStep('BOOK'); }}>{t} 성경</Button>
                    ))}
                  </div>
                )}
                {modalStep === 'BOOK' && (
                  <div className="grid grid-cols-2 gap-3">
                    {books.filter(b => (tempSelection?.testament === '구약' ? b.id <= 39 : b.id > 39)).map(b => {
                      const progress = getBookProgress(b.id, b.total_chapters);
                      return (
                        <Button key={b.id} variant="secondary" className={`h-20 flex flex-col items-center justify-center gap-1 rounded-[20px] transition-all ${(tempSelection?.id) === b.id ? 'bg-[#5D7BAF] text-white' : progress === 100 ? 'bg-[#5D7BAF]/10 border-[#5D7BAF]/30 border text-[#5D7BAF]' : 'bg-gray-50 text-gray-500'}`} 
                          onClick={() => { setTempSelection({ ...b, testament: tempSelection.testament, chapter: 1 }); setModalStep('CHAPTER'); }}>
                          <span className="font-black text-sm">{b.book_name}</span>
                          <span className="text-[10px] opacity-70 font-bold">{progress}% 완료</span>
                        </Button>
                      );
                    })}
                  </div>
                )}
                {modalStep === 'CHAPTER' && (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(tempSelection?.total_chapters || 0)].map((_, i) => {
                      const isRead = readHistory.some(h => h.book_id === tempSelection.id && h.chapter === i + 1);
                      return (
                        <button key={i} className={`aspect-square rounded-[18px] flex items-center justify-center font-black transition-all border-2 ${tempSelection?.chapter === i + 1 ? 'bg-[#5D7BAF] border-[#5D7BAF] text-white' : isRead ? 'bg-[#5D7BAF]/10 border-[#5D7BAF]/20 text-[#5D7BAF]' : 'bg-gray-50 border-transparent text-gray-400'}`} onClick={() => handleFinalChapterSelect(i + 1)}>{i + 1}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 공용 모달 디자인 (DailyWordPage 스타일) */}
      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-[3px]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] w-full max-w-xs overflow-hidden shadow-2xl">
              <div className="p-10 text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${alertConfig.isConfirm ? 'bg-blue-50' : 'bg-red-50'}`}>
                  <AlertCircle className={alertConfig.isConfirm ? 'text-[#5D7BAF]' : 'text-red-500'} size={40} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">{alertConfig.title}</h3>
                <p className="text-gray-500 font-bold leading-relaxed px-2 text-sm">{alertConfig.desc}</p>
              </div>
              <div className="flex border-t border-gray-100 h-16">
                {alertConfig.isConfirm && <button onClick={() => setAlertConfig(null)} className="flex-1 font-bold text-gray-400 border-r border-gray-100 hover:bg-gray-50">취소</button>}
                <button onClick={() => alertConfig.action ? alertConfig.action() : setAlertConfig(null)} className={`flex-1 font-black ${alertConfig.isConfirm ? 'text-[#5D7BAF] bg-blue-50/30' : 'text-red-500 bg-red-50/30'}`}>확인</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden relative p-8 max-h-[85vh] overflow-y-auto">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-500"><X size={20}/></button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  function openPicker(type: 'START' | 'END') {
    const current = type === 'START' ? goal.startBook : goal.endBook;
    const currentChap = type === 'START' ? goal.startChapter : goal.endChapter;
    setTempSelection({ ...current, chapter: currentChap });
    setModalStep('CHAPTER');
    setShowModal({ show: true, type });
  }
}
