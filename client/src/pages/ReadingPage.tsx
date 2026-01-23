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

// [대안] 서버 응답 지연 및 누락 방지를 위한 고정 장수 데이터
const BIBLE_CHAPTERS_MAX: Record<string, number> = {
  "창세기": 50, "출애굽기": 40, "레위기": 27, "민수기": 36, "신명기": 34, "여호수아": 24, "사사기": 21, "루기": 4, 
  "사무엘상": 31, "사무엘하": 24, "열왕기상": 22, "열왕기하": 25, "역대상": 29, "역대하": 36, "에스라": 10, "느헤미야": 13, 
  "에스더": 10, "욥기": 42, "시편": 150, "잠언": 31, "전도서": 12, "아가": 8, "이사야": 66, "예레미야": 52, 
  "예레미야 애가": 5, "에스겔": 48, "다니엘": 12, "호세아": 14, "요엘": 3, "아모스": 9, "오바댜": 1, "요나": 4, 
  "미가": 7, "나훔": 3, "하박국": 3, "스바냐": 3, "학개": 2, "스가랴": 14, "말라기": 4,
  "마태복음": 28, "마가복음": 16, "누가복음": 24, "요한복음": 21, "사도행전": 28, "로마서": 16, "고린도전서": 16, 
  "고린도후서": 13, "갈라디아서": 6, "에베소서": 6, "빌립보서": 4, "골로새서": 4, "데살로니가전서": 5, "데살로니가후서": 3, 
  "디모데전서": 6, "디모데후서": 4, "디도서": 3, "빌레몬서": 1, "히브리서": 13, "야고보서": 5, "베드로전서": 5, 
  "베드로후서": 3, "요한1서": 5, "요한2서": 1, "요한3서": 1, "유다서": 1, "요한계시록": 22
};

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [books, setBooks] = useState<any[]>([]);
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [memo, setMemo] = useState("");

  const [showModal, setShowModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  const [modalStep, setModalStep] = useState<'BOOK' | 'CHAPTER'>('BOOK');
  const [tempSelection, setTempSelection] = useState<any>(null);
  const [alertConfig, setAlertConfig] = useState<any>(null);

  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기", order: 1 },
    startChapter: 1,
    endBook: { id: 1, name: "창세기", order: 1 },
    endChapter: 1
  });

  // 1. 초기 로드 및 새로고침 대응
  useEffect(() => {
    async function init() {
      const { data: bookData } = await supabase.from('bible_books').select('Id, book_name, book_order').order('book_order', { ascending: true });
      if (bookData) setBooks(bookData);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        const saved = localStorage.getItem('reading_goal');
        if (saved) {
          const parsed = JSON.parse(saved);
          setGoal(parsed.goal);
          setIsGoalSet(parsed.isGoalSet);
          setCurrentReadChapter(parsed.currentChapter || parsed.goal.startChapter);
        }
      }
    }
    init();

    // 로그인 시 홈 이동 방지
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setShowLoginModal(false);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // 말씀 데이터 로드
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
    if (isGoalSet) {
      localStorage.setItem('reading_goal', JSON.stringify({ goal, isGoalSet, currentChapter: currentReadChapter }));
    }
  }, [goal, isGoalSet, currentReadChapter]);

  // 권 선택 시 장 리스트 갱신 (대안: 고정 데이터 사용)
  const handleBookSelect = (book: any) => {
    setTempSelection({
      id: book.Id,
      name: book.book_name,
      order: book.book_order,
      total_chapters: BIBLE_CHAPTERS_MAX[book.book_name] || 50,
      chapter: 1
    });
    setModalStep('CHAPTER'); 
  };

  const handleFinalChapterSelect = (chapter: number) => {
    const bookInfo = { id: tempSelection.id, name: tempSelection.name, order: tempSelection.order };

    if (showModal.type === 'START') {
      setGoal({ ...goal, startBook: bookInfo, startChapter: chapter, endBook: bookInfo, endChapter: chapter });
    } else {
      if (tempSelection.order < goal.startBook.order || (tempSelection.order === goal.startBook.order && chapter < goal.startChapter)) {
        setAlertConfig({ show: true, title: "범위 오류", desc: "종료 위치가 시작보다 빠를 수 없습니다." });
        return;
      }
      setGoal({ ...goal, endBook: bookInfo, endChapter: chapter });
    }
    setShowModal({ ...showModal, show: false });
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100]">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()-1)))}><ChevronLeft /></Button>
          <div className="text-center font-black">
            <h1 className="text-[#5D7BAF]" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-xs text-gray-400">{currentDate.toLocaleDateString()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()+1)))}><ChevronRight /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {!isGoalSet ? (
          <div className="relative bg-white rounded-[32px] border-2 border-[#5D7BAF]/10 p-7 shadow-sm">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-[32px]">
                <Lock className="w-10 h-10 text-[#5D7BAF] mb-4 opacity-30" />
                <Button onClick={() => setShowLoginModal(true)} className="bg-[#5D7BAF] font-black rounded-full px-10 h-14 shadow-xl">로그인 후 시작하기</Button>
              </div>
            )}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[#5D7BAF] font-black"><BookOpen /> 오늘의 목표 정하기</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer" onClick={() => { setModalStep('BOOK'); setShowModal({show: true, type: 'START'}); }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">시작 위치</p>
                  <p className="font-black text-gray-700">{goal.startBook.name} {goal.startChapter}장</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 cursor-pointer" onClick={() => { setModalStep('BOOK'); setShowModal({show: true, type: 'END'}); }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">종료 위치</p>
                  <p className="font-black text-gray-700">{goal.endBook.name} {goal.endChapter}장</p>
                </div>
              </div>
              <Button onClick={() => setIsGoalSet(true)} className="w-full bg-[#5D7BAF] h-16 rounded-[24px] font-black text-xl">목표 확정</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            <Card className="border-none bg-[#5D7BAF] shadow-2xl rounded-[32px] text-white">
              <CardContent className="pt-10 pb-8 px-7">
                <div className="flex justify-between items-center mb-8 font-black text-xl">
                  <span>{goal.startBook.name} {currentReadChapter}장</span>
                  <button className="bg-white/20 p-2 rounded-full"><Mic size={22} /></button>
                </div>
                <div className="min-h-[350px] max-h-[500px] overflow-y-auto pr-2 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? <p className="text-center opacity-60 pt-20">로딩 중...</p> : bibleContent.map((v, i) => (
                    <div key={i} className="mb-4 flex gap-3">
                      <span className="opacity-40 text-xs font-bold pt-1">{v.verse}</span>
                      <span>{v.content}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-white/10 flex justify-between gap-3 font-black">
                  <Button variant="ghost" className="text-white flex-1 h-14" onClick={() => setCurrentReadChapter(c => c - 1)} disabled={currentReadChapter <= goal.startChapter}><ChevronLeft /> 이전</Button>
                  <Button onClick={() => setIsReadCompleted(!isReadCompleted)} className={`px-10 h-14 rounded-full ${isReadCompleted ? 'bg-green-500' : 'bg-white text-[#5D7BAF]'}`}>{isReadCompleted ? "완료됨" : "읽기 완료"}</Button>
                  <Button variant="ghost" className="text-white flex-1 h-14" onClick={() => setCurrentReadChapter(c => c + 1)} disabled={currentReadChapter >= goal.endChapter}>다음 <ChevronRight /></Button>
                </div>
              </CardContent>
            </Card>

            {/* 하단 메모장 (복구) */}
            <div className="bg-gray-50 rounded-[28px] p-6 border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 text-[#5D7BAF] font-black"><PenLine size={18} /> 오늘의 묵상</div>
              <Textarea 
                placeholder="말씀을 통해 느낀 점을 기록해 보세요." 
                className="bg-white border-none resize-none min-h-[140px] rounded-2xl shadow-sm"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
              <Button className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black">기록 저장하기</Button>
            </div>
          </div>
        )}
      </main>

      {/* 선택 모달 */}
      <AnimatePresence>
        {showModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[40px] shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-black text-[#5D7BAF]">{showModal.type === 'START' ? '시작' : '종료'} 위치 설정</h3>
                <button onClick={() => setShowModal({ ...showModal, show: false })}><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {modalStep === 'BOOK' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {books.map(b => (
                      <button key={b.Id} className="h-16 rounded-2xl border-2 border-gray-100 font-black text-gray-600 active:bg-[#5D7BAF] active:text-white" onClick={() => handleBookSelect(b)}>{b.book_name}</button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {[...Array(tempSelection?.total_chapters)].map((_, i) => (
                      <button key={i} className="aspect-square rounded-xl border border-gray-200 font-black text-gray-500 active:bg-[#5D7BAF] active:text-white" onClick={() => handleFinalChapterSelect(i + 1)}>{i + 1}</button>
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
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-5">
            <div className="bg-white w-full max-w-sm rounded-[40px] p-8 relative">
              <button className="absolute top-6 right-6" onClick={() => setShowLoginModal(false)}><X /></button>
              <AuthPage />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
