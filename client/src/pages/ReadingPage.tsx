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
  const [modalStep, setModalStep] = useState<'BOOK' | 'CHAPTER'>('BOOK');
  const [tempSelection, setTempSelection] = useState<any>(null);
  const [alertConfig, setAlertConfig] = useState<any>(null);

  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기", book_order: 1 },
    startChapter: 1,
    endBook: { id: 1, name: "창세기", book_order: 1 },
    endChapter: 1
  });

  // [1] 초기화 및 데이터 복구 (404/새로고침 대응)
  useEffect(() => {
    const init = async () => {
      const { data: bookData } = await supabase.from('bible_books').select('Id, book_name, book_order').order('book_order', { ascending: true });
      if (bookData) setBooks(bookData);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        // 로컬스토리지에서 목표 복구
        const saved = localStorage.getItem('reading_goal');
        if (saved) {
          const parsed = JSON.parse(saved);
          setGoal(parsed.goal);
          setIsGoalSet(parsed.isGoalSet);
          setCurrentReadChapter(parsed.currentChapter || parsed.goal.startChapter);
        }
      }
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setShowLoginModal(false); // 리다이렉트 절대 금지
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // [2] 성경 말씀 로드
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

  // [3] 목표 변경 시 자동 저장
  useEffect(() => {
    if (isGoalSet) {
      localStorage.setItem('reading_goal', JSON.stringify({ goal, isGoalSet, currentChapter: currentReadChapter }));
    }
  }, [goal, isGoalSet, currentReadChapter]);

  // [4] 핵심: bible_verses 테이블에서 장 수를 가져와 리스트 갱신
  const handleBookSelect = async (book: any) => {
    setLoading(true);
    const { data } = await supabase
      .from('bible_verses')
      .select('chapter')
      .eq('book_name', book.book_name)
      .order('chapter', { ascending: false })
      .limit(1);

    const maxChapter = data && data.length > 0 ? data[0].chapter : 1;

    setTempSelection({
      id: book.Id,
      name: book.book_name,
      book_order: book.book_order,
      total_chapters: maxChapter,
      chapter: 1
    });
    setModalStep('CHAPTER');
    setLoading(false);
  };

  const handleFinalChapterSelect = (chapter: number) => {
    const bookInfo = { id: tempSelection.id, name: tempSelection.name, book_order: tempSelection.book_order };
    if (showModal.type === 'START') {
      setGoal({ ...goal, startBook: bookInfo, startChapter: chapter, endBook: bookInfo, endChapter: chapter });
    } else {
      if (tempSelection.book_order < goal.startBook.book_order || (tempSelection.book_order === goal.startBook.book_order && chapter < goal.startChapter)) {
        setAlertConfig({ show: true, title: "범위 오류", desc: "종료 위치를 다시 확인해주세요." });
        return;
      }
      setGoal({ ...goal, endBook: bookInfo, endChapter: chapter });
    }
    setShowModal({ show: false, type: 'START' });
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()-1)))}><ChevronLeft /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-black" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-xs text-gray-400 font-bold">{currentDate.toLocaleDateString()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()+1)))}><ChevronRight /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* 진척도 대시보드 */}
        <div className="grid grid-cols-2 gap-3 h-24">
          <div className="bg-[#5D7BAF] rounded-2xl p-4 flex flex-col justify-center shadow-md text-white">
            <p className="text-[10px] font-bold opacity-70">성경 전체 통독율</p>
            <p className="text-xl font-black">12.5%</p>
            <div className="w-full bg-white/20 h-1 rounded-full mt-1"><div className="bg-white h-full w-[12.5%]" /></div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-gray-400">오늘 목표 진척도</p>
            <p className="text-xl font-black text-[#5D7BAF]">40%</p>
            <div className="w-full bg-gray-200 h-1 rounded-full mt-1"><div className="bg-[#5D7BAF] h-full w-[40%]" /></div>
          </div>
        </div>

        {!isGoalSet ? (
          <div className="relative bg-white rounded-[32px] border-2 border-[#5D7BAF]/10 p-7 shadow-sm">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-[32px]">
                <Lock className="w-10 h-10 text-[#5D7BAF] mb-4 opacity-30" />
                <Button onClick={() => setShowLoginModal(true)} className="bg-[#5D7BAF] font-black rounded-full px-10 h-14 shadow-xl">로그인 후 시작하기</Button>
              </div>
            )}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[#5D7BAF] font-black"><BookOpen size={20} /> 오늘 목표 설정</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer" onClick={() => { setModalStep('BOOK'); setShowModal({show: true, type: 'START'}); }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">시작</p>
                  <p className="font-black text-gray-700">{goal.startBook.name} {goal.startChapter}장</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer" onClick={() => { setModalStep('BOOK'); setShowModal({show: true, type: 'END'}); }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">종료</p>
                  <p className="font-black text-gray-700">{goal.endBook.name} {goal.endChapter}장</p>
                </div>
              </div>
              <Button onClick={() => setIsGoalSet(true)} className="w-full bg-[#5D7BAF] h-16 rounded-[24px] font-black text-xl shadow-lg">목표 확정</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            <Card className="border-none bg-[#5D7BAF] shadow-2xl rounded-[32px] overflow-hidden text-white">
              <CardContent className="pt-10 pb-8 px-7">
                <div className="flex justify-between items-center mb-8 font-black text-xl">
                  <span>{goal.startBook.name} {currentReadChapter}장</span>
                  <button className="bg-white/20 p-2 rounded-full"><Mic size={22} /></button>
                </div>
                <div className="min-h-[350px] max-h-[500px] overflow-y-auto pr-2" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? <p className="text-center pt-20 opacity-50 font-black">로딩 중...</p> : bibleContent.map((v, i) => (
                    <div key={i} className="grid grid-cols-[2rem_1fr] items-start mb-5">
                      <span className="font-bold opacity-40 text-xs pr-4 pt-1">{v.verse}</span>
                      <span className="break-keep font-medium leading-relaxed">{v.content}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between gap-3 font-black">
                  <Button variant="ghost" className="text-white flex-1 h-14" onClick={() => setCurrentReadChapter(c => c - 1)} disabled={currentReadChapter <= goal.startChapter}><ChevronLeft /> 이전</Button>
                  <Button onClick={() => setIsReadCompleted(!isReadCompleted)} className={`px-10 h-14 rounded-full shadow-xl ${isReadCompleted ? 'bg-green-500' : 'bg-white text-[#5D7BAF]'}`}>{isReadCompleted ? "완료됨" : "읽기 완료"}</Button>
                  <Button variant="ghost" className="text-white flex-1 h-14" onClick={() => setCurrentReadChapter(c => c + 1)} disabled={currentReadChapter >= goal.endChapter}>다음 <ChevronRight /></Button>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gray-50 rounded-[28px] p-6 border border-gray-100 space-y-4 shadow-inner">
               <div className="flex items-center gap-2 text-[#5D7BAF] font-black"><PenLine size={18} /> 오늘의 묵상 기록</div>
               <Textarea placeholder="말씀을 기록해보세요." className="bg-white border-none min-h-[140px] p-5 rounded-2xl shadow-sm" value={memo} onChange={(e) => setMemo(e.target.value)} />
               <Button className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black text-lg shadow-lg">저장하기</Button>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[45px] shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-8 pb-4 flex justify-between items-center">
                <h3 className="font-black text-[#5D7BAF] text-xl">위치 설정 ({showModal.type === 'START' ? '시작' : '종료'})</h3>
                <button onClick={() => setShowModal({ ...showModal, show: false })} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 pt-2">
                {modalStep === 'BOOK' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {books.map(b => (
                      <button key={b.Id} className="h-16 rounded-2xl border-2 border-gray-100 font-black text-gray-500 hover:border-[#5D7BAF] hover:text-[#5D7BAF]" onClick={() => handleBookSelect(b)}>{b.book_name}</button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(tempSelection?.total_chapters || 0)].map((_, i) => (
                      <button key={i} className={`aspect-square rounded-xl border-2 font-black ${tempSelection?.chapter === i + 1 ? 'bg-[#5D7BAF] border-[#5D7BAF] text-white' : 'border-gray-50 text-gray-400'}`} onClick={() => handleFinalChapterSelect(i + 1)}>{i + 1}</button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md">
            <div className="bg-white rounded-[40px] w-full max-w-sm p-8 relative shadow-2xl">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6"><X /></button>
              <AuthPage />
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[30px] p-8 w-full max-w-xs text-center shadow-2xl">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={40} />
              <h3 className="font-black text-lg mb-2">{alertConfig.title}</h3>
              <p className="text-gray-500 text-sm mb-6 font-bold">{alertConfig.desc}</p>
              <Button onClick={() => setAlertConfig(null)} className="w-full bg-[#5D7BAF] font-black h-12 rounded-xl">확인</Button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
