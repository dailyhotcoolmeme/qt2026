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

  // 성경 데이터 및 유저 진행 데이터
  const [books, setBooks] = useState<any[]>([]);
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [readHistory, setReadHistory] = useState<any[]>([]); 

  // 목표 및 현재 읽기 상태
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [memo, setMemo] = useState("");

  // 팝업/모달 관리
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

  // 1. 초기 로드 및 인증 체크
  useEffect(() => {
    async function init() {
      const { data: bookData } = await supabase.from('bible_books').select('*').order('id', { ascending: true });
      if (bookData) setBooks(bookData);

      const { data: { session } } = await supabase.auth.getSession();
      handleAuth(!!session, session?.user?.id);
    }
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        handleAuth(true, session?.user?.id);
        setShowLoginModal(false); // 로그인 성공 시 모달만 닫음 (리다이렉트 방지)
      } else if (event === 'SIGNED_OUT') {
        handleAuth(false);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleAuth = async (isAuth: boolean, userId?: string) => {
    setIsAuthenticated(isAuth);
    if (isAuth && userId) {
      // 유저 읽기 기록 로드
      const { data: history } = await supabase.from('user_bible_progress').select('*').eq('user_id', userId);
      if (history) setReadHistory(history);

      const savedGoal = localStorage.getItem('reading_goal');
      if (savedGoal) {
        const parsed = JSON.parse(savedGoal);
        setGoal(parsed.goal);
        setIsGoalSet(parsed.isGoalSet);
        setCurrentReadChapter(parsed.currentChapter);
      }
    } else {
      setIsGoalSet(false);
      localStorage.removeItem('reading_goal');
    }
  };

  // 목표 및 진행 상태 저장
  useEffect(() => {
    if (isGoalSet && isAuthenticated) {
      localStorage.setItem('reading_goal', JSON.stringify({ goal, isGoalSet, currentChapter: currentReadChapter }));
    }
  }, [goal, isGoalSet, currentReadChapter, isAuthenticated]);

  // 말씀 데이터 불러오기
  useEffect(() => {
    if (isGoalSet) {
      const fetchBible = async () => {
        setLoading(true);
        const { data } = await supabase.from('bible_verses').select('*').eq('book_name', goal.startBook.name).eq('chapter', currentReadChapter).order('verse', { ascending: true });
        if (data) setBibleContent(data);
        setLoading(false);
      };
      fetchBible();
    }
  }, [isGoalSet, currentReadChapter, goal.startBook.name]);

  // 선택 팝업 오픈
  const openPicker = (type: 'START' | 'END') => {
    const target = type === 'START' ? goal.startBook : goal.endBook;
    const targetChap = type === 'START' ? goal.startChapter : goal.endChapter;
    // 중요: 기존 정보를 tempSelection에 완벽히 복사하여 넘김
    setTempSelection({ ...target, book_name: target.name, chapter: targetChap });
    setModalStep('CHAPTER');
    setShowModal({ show: true, type });
  };

  // 장 선택 완료 시
  const handleFinalChapterSelect = (chapter: number) => {
    const selected = { ...tempSelection, chapter };
    const bookInfo = { id: selected.id, name: selected.book_name || selected.name, testament: selected.testament, total_chapters: selected.total_chapters };

    if (showModal.type === 'START') {
      // 시작 지점을 정하면 종료 지점도 자동으로 동기화
      setGoal({ ...goal, startBook: bookInfo, startChapter: chapter, endBook: bookInfo, endChapter: chapter });
    } else {
      // 종료 지점 유효성 체크
      const startVal = (goal.startBook.id * 1000) + goal.startChapter;
      const endVal = (selected.id * 1000) + chapter;
      if (endVal < startVal) {
        setAlertConfig({ show: true, title: "범위 오류", desc: "종료 위치는 시작 위치보다 이전일 수 없습니다.", isConfirm: false });
        return;
      }
      setGoal({ ...goal, endBook: bookInfo, endChapter: chapter });
    }
    setShowModal({ ...showModal, show: false });
  };

  // 권별 진척도 계산
  const getBookProgress = (bookId: number, total: number) => {
    const readCount = readHistory.filter(h => h.book_id === bookId).length;
    return Math.round((readCount / total) * 100);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 헤더 */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-black" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-xs text-gray-400 font-bold">{currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setCurrentDate(d); }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-6">
        {/* 대시보드 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#5D7BAF] rounded-2xl p-4 flex flex-col justify-center shadow-md">
            <p className="text-white/70 font-bold text-[10px] mb-1">성경 전체 통독율</p>
            <p className="text-white font-black text-xl mb-2">12.5%</p>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden"><motion.div animate={{ width: '12.5%' }} className="bg-white h-full" /></div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center">
            <p className="text-gray-400 font-bold text-[10px] mb-1">오늘 목표 진척도</p>
            <p className="text-[#5D7BAF] font-black text-xl mb-2">40%</p>
            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden"><motion.div animate={{ width: '40%' }} className="bg-[#5D7BAF] h-full" /></div>
          </div>
        </div>

        {/* 메인 콘텐츠 영역 */}
        {!isGoalSet ? (
          <div className="relative bg-white rounded-[32px] border-2 border-[#5D7BAF]/10 p-7 shadow-sm">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/75 backdrop-blur-sm rounded-[32px] px-8 text-center">
                <Lock className="w-10 h-10 text-[#5D7BAF] mb-4 opacity-50" />
                <Button onClick={() => setShowLoginModal(true)} className="bg-[#5D7BAF] font-black rounded-full px-10 h-14 shadow-xl active:scale-95 transition-all">로그인 후 시작하기</Button>
              </div>
            )}
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-[#5D7BAF]" />
                  <h3 className="font-black text-[#5D7BAF] text-lg">오늘의 읽기 목표 정하기</h3>
                </div>
                <p className="text-gray-400 font-bold text-[12px] leading-relaxed">출퇴근길, 잠들기 전, 원하는 아무때나 음성으로 말씀을 들을 수 있습니다.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer active:bg-gray-100 transition-colors" onClick={() => openPicker('START')}>
                  <p className="text-xs font-bold text-gray-400 mb-1">시작 위치</p>
                  <p className="font-black text-gray-700 text-base">{goal.startBook.name} {goal.startChapter}장</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer active:bg-gray-100 transition-colors" onClick={() => openPicker('END')}>
                  <p className="text-xs font-bold text-gray-400 mb-1">종료 위치</p>
                  <p className="font-black text-gray-700 text-base">{goal.endBook.name} {goal.endChapter}장</p>
                </div>
              </div>
              <Button onClick={() => { setIsGoalSet(true); setCurrentReadChapter(goal.startChapter); }} className="w-full bg-[#5D7BAF] h-16 rounded-[24px] font-black text-xl shadow-lg shadow-[#5D7BAF]/20">목표 확정하기</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* 상단 현재 목표 정보 및 수정 버튼 */}
            <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 font-black text-[#5D7BAF]">
                <CheckCircle2 size={20} />
                <span style={{ fontSize: `${fontSize}px` }}>{goal.startBook.name} {goal.startChapter}장 ~ {goal.endBook.name} {goal.endChapter}장</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsGoalSet(false)} className="h-9 px-4 rounded-xl font-bold border-gray-200 text-gray-400 hover:text-[#5D7BAF]">
                <Settings2 size={14} className="mr-1.5" /> 수정
              </Button>
            </div>

            <Card className="border-none bg-[#5D7BAF] shadow-2xl rounded-[32px] overflow-hidden">
              <CardContent className="pt-10 pb-8 px-7">
                <div className="flex justify-between items-center mb-8 text-white font-black">
                  <span className="text-xl">{goal.startBook.name} {currentReadChapter}장</span>
                  <button className="bg-white/20 p-2.5 rounded-full active:scale-90 transition-transform"><Mic size={22} /></button>
                </div>
                <div className="min-h-[350px] max-h-[500px] overflow-y-auto pr-2 text-white leading-[1.8] custom-scrollbar" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? (
                    <div className="py-24 text-center font-bold opacity-60 flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      말씀을 불러오고 있습니다
                    </div>
                  ) : bibleContent.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[2rem_1fr] items-start mb-5">
                      <span className="font-bold opacity-40 text-right pr-4 pt-[3px] text-xs">{v.verse}</span>
                      <span className="break-keep font-medium">{v.content}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between gap-3">
                  <Button variant="ghost" className="text-white flex-1 h-14 font-black rounded-2xl hover:bg-white/10" onClick={() => currentReadChapter > goal.startChapter && setCurrentReadChapter(c => c - 1)} disabled={currentReadChapter <= goal.startChapter}><ChevronLeft size={24} /> 이전</Button>
                  <Button onClick={() => !isReadCompleted ? setIsReadCompleted(true) : setAlertConfig({ show: true, title: "읽기 완료 취소", desc: "읽기 완료를 취소하시겠습니까?", isConfirm: true, action: () => { setIsReadCompleted(false); setAlertConfig(null); } })}
                    className={`flex-none px-10 h-14 rounded-full font-black shadow-xl transition-all active:scale-95 ${isReadCompleted ? 'bg-green-500 text-white' : 'bg-white text-[#5D7BAF]'}`}>
                    {isReadCompleted ? <div className="flex items-center gap-2"><CheckCircle2 size={22} /> 완료됨</div> : "읽기 완료"}
                  </Button>
                  <Button variant="ghost" className="text-white flex-1 h-14 font-black rounded-2xl hover:bg-white/10" onClick={() => currentReadChapter < goal.endChapter && setCurrentReadChapter(c => c + 1)} disabled={currentReadChapter >= goal.endChapter}>다음 <ChevronRight size={24} /></Button>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gray-50 rounded-[28px] p-6 border border-gray-100 space-y-4 shadow-inner">
               <div className="flex items-center gap-2 ml-1 text-[#5D7BAF] font-black"><PenLine size={18} /> 오늘의 묵상 기록</div>
               <Textarea placeholder="오늘 주신 말씀을 묵상하며 짧게라도 기록을 남겨보세요." className="bg-white border-none resize-none min-h-[140px] p-5 text-gray-700 rounded-2xl shadow-sm focus-visible:ring-1 focus-visible:ring-[#5D7BAF]/20" value={memo} onChange={(e) => setMemo(e.target.value)} />
               <Button className="w-full bg-[#5D7BAF] h-15 rounded-2xl font-black text-lg shadow-lg">기록 저장하기</Button>
            </div>
          </div>
        )}
      </main>

      {/* [내비게이션형 선택 팝업] */}
      <AnimatePresence>
        {showModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full max-w-md bg-white rounded-t-[45px] shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-8 pb-4 border-b border-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-[#5D7BAF] text-xl">{showModal.type === 'START' ? '시작' : '종료'} 위치 설정</h3>
                  <button onClick={() => setShowModal({ ...showModal, show: false })} className="p-2.5 bg-gray-100 rounded-full text-gray-400 active:scale-90"><X size={20}/></button>
                </div>
                {/* 브레드크럼 내비게이션 */}
                <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                  <span className={`px-4 py-2 rounded-xl transition-all font-bold text-sm ${modalStep === 'TESTAMENT' ? 'bg-[#5D7BAF] text-white shadow-md' : 'text-gray-400 cursor-pointer hover:text-gray-600'}`} onClick={() => setModalStep('TESTAMENT')}>{tempSelection?.testament}</span>
                  <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                  <span className={`px-4 py-2 rounded-xl transition-all font-bold text-sm ${modalStep === 'BOOK' ? 'bg-[#5D7BAF] text-white shadow-md' : 'text-gray-400 cursor-pointer hover:text-gray-600'}`} onClick={() => setModalStep('BOOK')}>{tempSelection?.book_name || tempSelection?.name}</span>
                  {modalStep === 'CHAPTER' && <><ArrowRight size={14} className="text-gray-300" /><span className="px-4 py-2 rounded-xl bg-[#5D7BAF] text-white shadow-md font-bold text-sm">{tempSelection?.chapter}장</span></>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 min-h-[400px]">
                {modalStep === 'TESTAMENT' && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95">
                    {['구약', '신약'].map(t => (
                      <Button key={t} variant="outline" className={`h-20 w-full rounded-[28px] font-black text-xl border-2 transition-all ${tempSelection?.testament === t ? 'border-[#5D7BAF] bg-blue-50 text-[#5D7BAF]' : 'border-gray-100 text-gray-400'}`} onClick={() => { setTempSelection({...tempSelection, testament: t}); setModalStep('BOOK'); }}>{t} 성경</Button>
                    ))}
                  </div>
                )}
                {modalStep === 'BOOK' && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-right-5">
                    {books.filter(b => (tempSelection?.testament === '구약' ? b.id <= 39 : b.id > 39)).map(b => {
                      const progress = getBookProgress(b.id, b.total_chapters);
                      const isSelected = tempSelection?.id === b.id;
                      return (
                        <button key={b.id} className={`h-24 flex flex-col items-center justify-center gap-1.5 rounded-[24px] transition-all border-2 
                          ${isSelected ? 'bg-[#5D7BAF] border-[#5D7BAF] text-white shadow-lg' : progress === 100 ? 'bg-[#5D7BAF]/10 border-[#5D7BAF]/30 text-[#5D7BAF]' : 'bg-gray-50 border-transparent text-gray-500 active:bg-gray-100'}`} 
                          onClick={() => { setTempSelection({ ...b, testament: tempSelection.testament, chapter: 1 }); setModalStep('CHAPTER'); }}>
                          <span className="font-black text-[15px]">{b.book_name}</span>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-white/70' : 'text-[#5D7BAF]'}`}>{progress}% 완료</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {modalStep === 'CHAPTER' && (
                  <div className="grid grid-cols-5 gap-3 animate-in slide-in-from-right-5">
                    {[...Array(tempSelection?.total_chapters || 0)].map((_, i) => {
                      const isRead = readHistory.some(h => h.book_id === tempSelection.id && h.chapter === i + 1);
                      return (
                        <button key={i} className={`aspect-square rounded-[18px] flex items-center justify-center font-black text-base transition-all border-2 
                          ${tempSelection?.chapter === i + 1 ? 'bg-[#5D7BAF] border-[#5D7BAF] text-white shadow-md scale-110' : isRead ? 'bg-[#5D7BAF]/15 border-[#5D7BAF]/30 text-[#5D7BAF]' : 'bg-gray-50 border-transparent text-gray-400'}`} 
                          onClick={() => handleFinalChapterSelect(i + 1)}>
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 공용 경고/확인 모달 */}
      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-black/60 backdrop-blur-[4px]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[45px] w-full max-w-xs overflow-hidden shadow-2xl">
              <div className="p-10 text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${alertConfig.isConfirm ? 'bg-blue-50 text-[#5D7BAF]' : 'bg-red-50 text-red-500'}`}>
                  <AlertCircle size={44} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">{alertConfig.title}</h3>
                <p className="text-gray-500 font-bold leading-relaxed text-sm px-1">{alertConfig.desc}</p>
              </div>
              <div className="flex border-t border-gray-100 h-18">
                {alertConfig.isConfirm && <button onClick={() => setAlertConfig(null)} className="flex-1 font-bold text-gray-400 border-r border-gray-100 hover:bg-gray-50 transition-colors">취소</button>}
                <button onClick={() => alertConfig.action ? alertConfig.action() : setAlertConfig(null)} className={`flex-1 font-black ${alertConfig.isConfirm ? 'text-[#5D7BAF]' : 'text-red-500'} active:bg-gray-50 transition-colors`}>확인</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[45px] w-full max-w-sm overflow-hidden relative p-8 max-h-[85vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-8 right-8 p-2.5 bg-gray-100 rounded-full text-gray-400 active:scale-90 transition-transform"><X size={20}/></button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
