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
  
  // 상태 관리
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [readHistory, setReadHistory] = useState<any[]>([]); 

  const [isGoalSet, setIsGoalSet] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [memo, setMemo] = useState("");

  const [showModal, setShowModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  const [modalStep, setModalStep] = useState<'TESTAMENT' | 'BOOK' | 'CHAPTER'>('CHAPTER');
  const [tempSelection, setTempSelection] = useState<any>(null);
  const [alertConfig, setAlertConfig] = useState<{show: boolean, title: string, desc: string, action?: () => void, isConfirm?: boolean} | null>(null);

  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기", book_order: 1 },
    startChapter: 1,
    endBook: { id: 1, name: "창세기", book_order: 1 },
    endChapter: 1
  });

  // 1. 초기 데이터 로드 및 404 방어
  useEffect(() => {
    async function init() {
      // bible_books 테이블 구조 반영: Id, book_name, book_order
      const { data: bookData } = await supabase.from('bible_books').select('Id, book_name, book_order').order('book_order', { ascending: true });
      if (bookData) setBooks(bookData);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        loadUserData(session.user.id);
      }
    }
    init();

    // 로그인 시 홈으로 튕기는 문제 방지 (리다이렉트 로직 제거)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        loadUserData(session.user.id);
        setShowLoginModal(false); 
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsGoalSet(false);
        localStorage.removeItem('reading_goal');
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
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

  // 말씀 로드 (bible_verses 테이블 구조 반영: book_name, chapter, verse, content)
  useEffect(() => {
    if (isGoalSet) {
      const fetchBible = async () => {
        setLoading(true);
        const { data } = await supabase.from('bible_verses')
          .select('verse, content')
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

  // [수정 핵심] bible_verses에서 해당 권의 최대 장수를 가져오는 로직
  const handleBookSelect = async (book: any) => {
    setLoading(true);
    // bible_verses에서 해당 권의 가장 큰 chapter 값을 가져옴
    const { data } = await supabase
      .from('bible_verses')
      .select('chapter')
      .eq('book_name', book.book_name)
      .order('chapter', { ascending: false })
      .limit(1);

    const totalChapters = data && data.length > 0 ? data[0].chapter : 1;

    setTempSelection({
      id: book.Id,
      name: book.book_name,
      book_name: book.book_name,
      book_order: book.book_order,
      total_chapters: totalChapters, // 동적으로 가져온 장수 적용
      chapter: 1
    });
    setLoading(false);
    setModalStep('CHAPTER'); 
  };

  const handleFinalChapterSelect = (chapter: number) => {
    const bookInfo = { 
      id: tempSelection.id, 
      name: tempSelection.book_name, 
      book_order: tempSelection.book_order
    };

    if (showModal.type === 'START') {
      setGoal({ ...goal, startBook: bookInfo, startChapter: chapter, endBook: bookInfo, endChapter: chapter });
    } else {
      // book_order를 기준으로 선후 관계 파악
      const isEarlier = tempSelection.book_order < goal.startBook.book_order || 
                       (tempSelection.book_order === goal.startBook.book_order && chapter < goal.startChapter);
      
      if (isEarlier) {
        setAlertConfig({ show: true, title: "범위 오류", desc: "종료 위치는 시작 위치보다 이전일 수 없습니다.", isConfirm: false });
        return;
      }
      setGoal({ ...goal, endBook: bookInfo, endChapter: chapter });
    }
    setShowModal({ ...showModal, show: false });
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
        {/* 대시보드 */}
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
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm rounded-[32px]">
                <Lock className="w-10 h-10 text-[#5D7BAF] mb-4 opacity-30" />
                <Button onClick={() => setShowLoginModal(true)} className="bg-[#5D7BAF] font-black rounded-full px-10 h-14 shadow-xl">로그인 후 시작하기</Button>
              </div>
            )}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[#5D7BAF]">
                <BookOpen className="w-6 h-6" />
                <h3 className="font-black text-lg">오늘의 읽기 목표 정하기</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer" onClick={() => { setTempSelection({...goal.startBook, book_name: goal.startBook.name}); setModalStep('BOOK'); setShowModal({show: true, type: 'START'}); }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">시작 위치</p>
                  <p className="font-black text-gray-700">{goal.startBook.name} {goal.startChapter}장</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer" onClick={() => { setTempSelection({...goal.endBook, book_name: goal.endBook.name}); setModalStep('BOOK'); setShowModal({show: true, type: 'END'}); }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">종료 위치</p>
                  <p className="font-black text-gray-700">{goal.endBook.name} {goal.endChapter}장</p>
                </div>
              </div>
              <Button onClick={() => { setIsGoalSet(true); setCurrentReadChapter(goal.startChapter); }} className="w-full bg-[#5D7BAF] h-16 rounded-[24px] font-black text-xl shadow-lg">목표 확정</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
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
                  <button className="bg-white/20 p-2 rounded-full"><Mic size={22} /></button>
                </div>
                <div className="min-h-[350px] max-h-[500px] overflow-y-auto pr-2" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? <div className="py-24 text-center opacity-60">말씀 로드 중...</div> : bibleContent.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[2rem_1fr] items-start mb-5 leading-relaxed">
                      <span className="font-bold opacity-40 text-right pr-4 pt-[3px] text-xs">{v.verse}</span>
                      <span className="break-keep font-medium">{v.content}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between gap-3 font-black">
                  <Button variant="ghost" className="text-white flex-1 h-14" onClick={() => currentReadChapter > goal.startChapter && setCurrentReadChapter(c => c - 1)} disabled={currentReadChapter <= goal.startChapter}><ChevronLeft size={24} /> 이전</Button>
                  <Button onClick={() => setIsReadCompleted(!isReadCompleted)} className={`flex-none px-10 h-14 rounded-full shadow-xl transition-all ${isReadCompleted ? 'bg-green-500' : 'bg-white text-[#5D7BAF]'}`}>{isReadCompleted ? "완료됨" : "읽기 완료"}</Button>
                  <Button variant="ghost" className="text-white flex-1 h-14" onClick={() => currentReadChapter < goal.endChapter && setCurrentReadChapter(c => c + 1)} disabled={currentReadChapter >= goal.endChapter}>다음 <ChevronRight size={24} /></Button>
                </div>
              </CardContent>
            </Card>

            {/* 하단 메모 기록장 (복구) */}
            <div className="bg-gray-50 rounded-[28px] p-6 border border-gray-100 space-y-4 shadow-inner">
               <div className="flex items-center gap-2 text-[#5D7BAF] font-black"><PenLine size={18} /> 오늘의 묵상 기록</div>
               <Textarea placeholder="오늘 주신 말씀을 묵상하며 기록을 남겨보세요." className="bg-white border-none resize-none min-h-[140px] p-5 text-gray-700 rounded-2xl shadow-sm" value={memo} onChange={(e) => setMemo(e.target.value)} />
               <Button className="w-full bg-[#5D7BAF] h-15 rounded-2xl font-black text-lg shadow-lg">기록 저장하기</Button>
            </div>
          </div>
        )}
      </main>

      {/* 선택 모달 */}
      <AnimatePresence>
        {showModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[45px] shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-[#5D7BAF] text-xl">위치 설정</h3>
                  <button onClick={() => setShowModal({ ...showModal, show: false })} className="p-2 bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar">
                  <span className={`px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0 ${modalStep === 'BOOK' ? 'bg-[#5D7BAF] text-white shadow-md' : 'text-gray-400 cursor-pointer'}`} onClick={() => setModalStep('BOOK')}>{tempSelection?.book_name}</span>
                  {modalStep === 'CHAPTER' && <><ArrowRight size={14} className="text-gray-300" /><span className="px-4 py-2 rounded-xl bg-[#5D7BAF] text-white font-bold text-sm flex-shrink-0">{tempSelection?.chapter}장</span></>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 min-h-[400px]">
                {modalStep === 'BOOK' && (
                  <div className="grid grid-cols-2 gap-4">
                    {books.map(b => (
                      <button key={b.Id} className="h-24 flex flex-col items-center justify-center rounded-[24px] border-2 bg-gray-50 border-transparent text-gray-500 font-black" onClick={() => handleBookSelect(b)}>
                        {b.book_name}
                      </button>
                    ))}
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

      {/* 로그인 모달 */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md">
            <div className="bg-white rounded-[45px] w-full max-w-sm relative p-8 shadow-2xl overflow-y-auto max-h-[85vh]">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600"><X size={20}/></button>
              <AuthPage />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
