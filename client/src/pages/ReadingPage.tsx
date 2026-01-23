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
  
  // 인증 및 로딩 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 성경 및 유저 데이터
  const [books, setBooks] = useState<any[]>([]);
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [readHistory, setReadHistory] = useState<any[]>([]); 

  // 목표 및 현재 진행 상태
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [memo, setMemo] = useState("");

  // 모달 및 팝업 상태
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

  // 1. 초기 데이터 로드 및 세션 유지 (새로고침 대응)
  useEffect(() => {
    async function init() {
      // 성경 목록 로드
      const { data: bookData } = await supabase.from('bible_books').select('*').order('id', { ascending: true });
      if (bookData) setBooks(bookData);

      // 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        fetchUserData(session.user.id);
      }
    }
    init();

    // 인증 상태 변경 감지 (로그인 시 페이지 이동 방지)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        fetchUserData(session.user.id);
        setShowLoginModal(false); // 리다이렉트 없이 모달만 닫음
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsGoalSet(false);
        localStorage.removeItem('reading_goal');
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    const { data: history } = await supabase.from('user_bible_progress').select('*').eq('user_id', userId);
    if (history) setReadHistory(history);

    const saved = localStorage.getItem('reading_goal');
    if (saved) {
      const parsed = JSON.parse(saved);
      setGoal(parsed.goal);
      setIsGoalSet(parsed.isGoalSet);
      setCurrentReadChapter(parsed.currentChapter || parsed.goal.startChapter);
    }
  };

  // 말씀 로드
  useEffect(() => {
    if (isGoalSet) {
      const fetchBible = async () => {
        setLoading(true);
        const { data } = await supabase.from('bible_verses')
          .select('*')
          .eq('book_name', goal.startBook.name)
          .eq('chapter', currentReadChapter)
          .order('verse', { ascending: true });
        if (data) setBibleContent(data);
        setLoading(false);
      };
      fetchBible();
    }
  }, [isGoalSet, currentReadChapter, goal.startBook.name]);

  // 목표 저장
  useEffect(() => {
    if (isGoalSet && isAuthenticated) {
      localStorage.setItem('reading_goal', JSON.stringify({ goal, isGoalSet, currentChapter: currentReadChapter }));
    }
  }, [goal, isGoalSet, currentReadChapter, isAuthenticated]);

  // [핵심] 권 선택 시 장 리스트 갱신 로직
  const handleBookSelect = (book: any) => {
    setTempSelection({
      id: book.id,
      name: book.book_name,
      book_name: book.book_name,
      testament: tempSelection.testament,
      total_chapters: book.total_chapters, // 이 값이 정확히 들어와야 장 리스트가 렌더링됨
      chapter: 1
    });
    setModalStep('CHAPTER'); // 단계 이동
  };

  const handleFinalChapterSelect = (chapter: number) => {
    const bookInfo = { 
      id: tempSelection.id, 
      name: tempSelection.book_name || tempSelection.name, 
      testament: tempSelection.testament, 
      total_chapters: tempSelection.total_chapters 
    };

    if (showModal.type === 'START') {
      setGoal({ ...goal, startBook: bookInfo, startChapter: chapter, endBook: bookInfo, endChapter: chapter });
    } else {
      const startVal = (goal.startBook.id * 1000) + goal.startChapter;
      const endVal = (tempSelection.id * 1000) + chapter;
      if (endVal < startVal) {
        setAlertConfig({ show: true, title: "범위 오류", desc: "종료 위치는 시작 위치보다 이전일 수 없습니다.", isConfirm: false });
        return;
      }
      setGoal({ ...goal, endBook: bookInfo, endChapter: chapter });
    }
    setShowModal({ ...showModal, show: false });
  };

  const getBookProgress = (bookId: number, total: number) => {
    const readCount = readHistory.filter(h => h.book_id === bookId).length;
    return Math.round((readCount / total) * 100);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }}><ChevronLeft /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-black" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-xs text-gray-400 font-bold">{currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setCurrentDate(d); }}><ChevronRight /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        <div className="grid grid-cols-2 gap-3 h-24">
          <div className="bg-[#5D7BAF] rounded-2xl p-4 flex flex-col justify-center shadow-md">
            <p className="text-white/70 font-bold text-[10px] mb-1">성경 전체 통독율</p>
            <p className="text-white font-black text-xl mb-1">12.5%</p>
            <div className="w-full bg-white/20 h-1 rounded-full"><div className="bg-white h-full" style={{ width: '12.5%' }} /></div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center">
            <p className="text-gray-400 font-bold text-[10px] mb-1">오늘 목표 진척도</p>
            <p className="text-[#5D7BAF] font-black text-xl mb-1">40%</p>
            <div className="w-full bg-gray-200 h-1 rounded-full"><div className="bg-[#5D7BAF] h-full" style={{ width: '40%' }} /></div>
          </div>
        </div>

        {!isGoalSet ? (
          <div className="relative bg-white rounded-[32px] border-2 border-[#5D7BAF]/10 p-7 shadow-sm">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/75 backdrop-blur-sm rounded-[32px]">
                <Lock className="w-10 h-10 text-[#5D7BAF] mb-4 opacity-30" />
                <Button onClick={() => setShowLoginModal(true)} className="bg-[#5D7BAF] font-black rounded-full px-10 h-14 shadow-xl">로그인 후 시작하기</Button>
              </div>
            )}
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#5D7BAF]">
                  <BookOpen className="w-6 h-6" />
                  <h3 className="font-black text-lg">오늘의 읽기 목표 정하기</h3>
                </div>
                <p className="text-gray-400 font-bold text-[12px]">출퇴근길, 잠들기 전, 원하는 아무때나 음성으로 말씀을 들을 수 있습니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer" onClick={() => { setTempSelection({...goal.startBook, book_name: goal.startBook.name, chapter: goal.startChapter}); setModalStep('CHAPTER'); setShowModal({show: true, type: 'START'}); }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">시작 위치</p>
                  <p className="font-black text-gray-700">{goal.startBook.name} {goal.startChapter}장</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer" onClick={() => { setTempSelection({...goal.endBook, book_name: goal.endBook.name, chapter: goal.endChapter}); setModalStep('CHAPTER'); setShowModal({show: true, type: 'END'}); }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">종료 위치</p>
                  <p className="font-black text-gray-700">{goal.endBook.name} {goal.endChapter}장</p>
                </div>
              </div>
              <Button onClick={() => { setIsGoalSet(true); setCurrentReadChapter(goal.startChapter); }} className="w-full bg-[#5D7BAF] h-16 rounded-[24px] font-black text-xl shadow-lg shadow-[#5D7BAF]/20">목표 확정</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 font-black text-[#5D7BAF]">
                <CheckCircle2 size={18} />
                <span>{goal.startBook.name} {goal.startChapter}장 ~ {goal.endBook.name} {goal.endChapter}장</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsGoalSet(false)} className="h-8 font-bold text-gray-400 hover:text-[#5D7BAF]"><Settings2 size={14} className="mr-1" /> 수정</Button>
            </div>
            <Card className="border-none bg-[#5D7BAF] shadow-2xl rounded-[32px] overflow-hidden text-white">
              <CardContent className="pt-10 pb-8 px-7">
                <div className="flex justify-between items-center mb-8 font-black">
                  <span className="text-xl">{goal.startBook.name} {currentReadChapter}장</span>
                  <button className="bg-white/20 p-2 rounded-full active:scale-90"><Mic size={22} /></button>
                </div>
                <div className="min-h-[350px] max-h-[500px] overflow-y-auto pr-2" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? <div className="py-24 text-center opacity-60">말씀 로드 중...</div> : bibleContent.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[2rem_1fr] items-start mb-5">
                      <span className="font-bold opacity-40 text-right pr-4 pt-[3px] text-xs">{v.verse}</span>
                      <span className="break-keep font-medium">{v.content}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between gap-3">
                  <Button variant="ghost" className="text-white flex-1 h-14 font-black" onClick={() => currentReadChapter > goal.startChapter && setCurrentReadChapter(c => c - 1)} disabled={currentReadChapter <= goal.startChapter}><ChevronLeft size={24} /> 이전</Button>
                  <Button onClick={() => !isReadCompleted ? setIsReadCompleted(true) : setAlertConfig({ show: true, title: "읽기 완료 취소", desc: "취소하시겠습니까?", isConfirm: true, action: () => { setIsReadCompleted(false); setAlertConfig(null); } })}
                    className={`flex-none px-10 h-14 rounded-full font-black shadow-xl ${isReadCompleted ? 'bg-green-500' : 'bg-white text-[#5D7BAF]'}`}>
                    {isReadCompleted ? "완료됨" : "읽기 완료"}
                  </Button>
                  <Button variant="ghost" className="text-white flex-1 h-14 font-black" onClick={() => currentReadChapter < goal.endChapter && setCurrentReadChapter(c => c + 1)} disabled={currentReadChapter >= goal.endChapter}>다음 <ChevronRight size={24} /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* 선택 팝업 */}
      <AnimatePresence>
        {showModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[45px] shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-6 text-[#5D7BAF]">
                  <h3 className="font-black text-xl">위치 설정</h3>
                  <button onClick={() => setShowModal({ ...showModal, show: false })} className="p-2 bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar">
                  <span className={`px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0 ${modalStep === 'TESTAMENT' ? 'bg-[#5D7BAF] text-white' : 'text-gray-400 cursor-pointer'}`} onClick={() => setModalStep('TESTAMENT')}>{tempSelection?.testament}</span>
                  <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                  <span className={`px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0 ${modalStep === 'BOOK' ? 'bg-[#5D7BAF] text-white' : 'text-gray-400 cursor-pointer'}`} onClick={() => setModalStep('BOOK')}>{tempSelection?.book_name || tempSelection?.name}</span>
                  {modalStep === 'CHAPTER' && <><ArrowRight size={14} className="text-gray-300" /><span className="px-4 py-2 rounded-xl bg-[#5D7BAF] text-white font-bold text-sm flex-shrink-0">{tempSelection?.chapter}장</span></>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 min-h-[400px]">
                {modalStep === 'TESTAMENT' && (
                  <div className="space-y-4">
                    {['구약', '신약'].map(t => (
                      <Button key={t} variant="outline" className={`h-20 w-full rounded-[28px] font-black text-xl border-2 ${tempSelection?.testament === t ? 'border-[#5D7BAF] bg-blue-50 text-[#5D7BAF]' : 'border-gray-100 text-gray-400'}`} onClick={() => { setTempSelection({...tempSelection, testament: t}); setModalStep('BOOK'); }}>{t} 성경</Button>
                    ))}
                  </div>
                )}
                {modalStep === 'BOOK' && (
                  <div className="grid grid-cols-2 gap-4">
                    {books.filter(b => (tempSelection?.testament === '구약' ? b.id <= 39 : b.id > 39)).map(b => {
                      const progress = getBookProgress(b.id, b.total_chapters);
                      return (
                        <button key={b.id} className={`h-24 flex flex-col items-center justify-center gap-1 rounded-[24px] border-2 transition-all ${progress === 100 ? 'bg-[#5D7BAF]/10 border-[#5D7BAF]/30 text-[#5D7BAF]' : 'bg-gray-50 border-transparent text-gray-500'}`} 
                          onClick={() => handleBookSelect(b)}>
                          <span className="font-black text-[15px]">{b.book_name}</span>
                          <span className="text-[10px] font-bold opacity-60">{progress}% 완료</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {modalStep === 'CHAPTER' && (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(tempSelection?.total_chapters || 0)].map((_, i) => (
                      <button key={i} className={`aspect-square rounded-[18px] flex items-center justify-center font-black text-base border-2 ${tempSelection?.chapter === i + 1 ? 'bg-[#5D7BAF] border-[#5D7BAF] text-white shadow-md scale-110' : 'bg-gray-50 border-transparent text-gray-400'}`} onClick={() => handleFinalChapterSelect(i + 1)}>{i + 1}</button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] w-full max-w-xs overflow-hidden shadow-2xl">
              <div className="p-10 text-center">
                <AlertCircle className={`mx-auto mb-4 ${alertConfig.isConfirm ? 'text-[#5D7BAF]' : 'text-red-500'}`} size={44} />
                <h3 className="text-xl font-black mb-2">{alertConfig.title}</h3>
                <p className="text-gray-500 font-bold text-sm">{alertConfig.desc}</p>
              </div>
              <div className="flex border-t border-gray-100 h-16">
                {alertConfig.isConfirm && <button onClick={() => setAlertConfig(null)} className="flex-1 font-bold text-gray-400 border-r">취소</button>}
                <button onClick={() => alertConfig.action ? alertConfig.action() : setAlertConfig(null)} className={`flex-1 font-black ${alertConfig.isConfirm ? 'text-[#5D7BAF]' : 'text-red-500'}`}>확인</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md">
            <div className="bg-white rounded-[45px] w-full max-w-sm overflow-hidden relative p-8 max-h-[85vh] overflow-y-auto">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-8 right-8 text-gray-400"><X size={20}/></button>
              <AuthPage />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
