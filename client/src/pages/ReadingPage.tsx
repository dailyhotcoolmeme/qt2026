import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { 
  ChevronLeft, ChevronRight, BookOpen, Lock, X, 
  PenLine, CheckCircle2, Mic, AlertCircle, Settings2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import AuthPage from "./AuthPage";

// [대안] DB 조회 실패를 방지하기 위한 성경 권별 최대 장수 데이터
const BIBLE_DATA: Record<string, number> = {
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

  const [goal, setGoal] = useState({
    startBook: { name: "창세기", order: 1 },
    startChapter: 1,
    endBook: { name: "창세기", order: 1 },
    endChapter: 1
  });

  // 초기화: 권 목록 로드 및 로컬스토리지 복구
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('bible_books').select('Id, book_name, book_order').order('book_order', { ascending: true });
      if (data) setBooks(data);

      const saved = localStorage.getItem('reading_goal');
      if (saved) {
        const parsed = JSON.parse(saved);
        setGoal(parsed.goal);
        setIsGoalSet(parsed.isGoalSet);
        setCurrentReadChapter(parsed.currentChapter || parsed.goal.startChapter);
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setIsAuthenticated(true);
    };
    init();
  }, []);

  // 말씀 로드
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

  // 목표 자동 저장
  useEffect(() => {
    if (isGoalSet) {
      localStorage.setItem('reading_goal', JSON.stringify({ goal, isGoalSet, currentChapter: currentReadChapter }));
    }
  }, [goal, isGoalSet, currentReadChapter]);

  const handleBookSelect = (book: any) => {
    setTempSelection({
      name: book.book_name,
      order: book.book_order,
      total_chapters: BIBLE_DATA[book.book_name] || 50
    });
    setModalStep('CHAPTER');
  };

  const handleFinalChapterSelect = (chapter: number) => {
    const bookInfo = { name: tempSelection.name, order: tempSelection.order };
    if (showModal.type === 'START') {
      setGoal({ ...goal, startBook: bookInfo, startChapter: chapter, endBook: bookInfo, endChapter: chapter });
    } else {
      setGoal({ ...goal, endBook: bookInfo, endChapter: chapter });
    }
    setShowModal({ show: false, type: 'START' });
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 진척도 표시 영역 */}
        <div className="grid grid-cols-2 gap-3 h-24">
          <div className="bg-[#5D7BAF] rounded-2xl p-4 flex flex-col justify-center text-white">
            <p className="text-[10px] font-bold opacity-70">전체 통독율</p>
            <p className="text-xl font-black">12.5%</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-gray-400">오늘 진척도</p>
            <p className="text-xl font-black text-[#5D7BAF]">40%</p>
          </div>
        </div>

        {!isGoalSet ? (
          <div className="bg-white rounded-[32px] border-2 border-[#5D7BAF]/10 p-7 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-[#5D7BAF] font-black"><BookOpen /> 목표 설정</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-5 rounded-3xl cursor-pointer" onClick={() => { setModalStep('BOOK'); setShowModal({show: true, type: 'START'}); }}>
                <p className="text-xs text-gray-400 font-bold">시작</p>
                <p className="font-black">{goal.startBook.name} {goal.startChapter}장</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-3xl cursor-pointer" onClick={() => { setModalStep('BOOK'); setShowModal({show: true, type: 'END'}); }}>
                <p className="text-xs text-gray-400 font-bold">종료</p>
                <p className="font-black">{goal.endBook.name} {goal.endChapter}장</p>
              </div>
            </div>
            <Button onClick={() => setIsGoalSet(true)} className="w-full bg-[#5D7BAF] h-16 rounded-[24px] font-black text-xl shadow-lg">목표 확정</Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            <Card className="border-none bg-[#5D7BAF] shadow-2xl rounded-[32px] text-white overflow-hidden">
              <CardContent className="pt-10 pb-8 px-7">
                <div className="flex justify-between items-center mb-8 font-black text-xl">
                  <span>{goal.startBook.name} {currentReadChapter}장</span>
                </div>
                <div className="min-h-[350px] max-h-[500px] overflow-y-auto" style={{ fontSize: `${fontSize}px` }}>
                  {loading ? <p className="text-center pt-20">로딩 중...</p> : bibleContent.map((v, i) => (
                    <div key={i} className="mb-4 flex gap-3">
                      <span className="opacity-40 text-xs font-bold pt-1">{v.verse}</span>
                      <span className="leading-relaxed">{v.content}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-white/10 flex justify-between font-black">
                  <Button variant="ghost" className="text-white" onClick={() => setCurrentReadChapter(c => c - 1)} disabled={currentReadChapter <= goal.startChapter}>이전</Button>
                  <Button onClick={() => setIsReadCompleted(!isReadCompleted)} className={`px-8 h-12 rounded-full ${isReadCompleted ? 'bg-green-500' : 'bg-white text-[#5D7BAF]'}`}>{isReadCompleted ? "완료됨" : "읽기 완료"}</Button>
                  <Button variant="ghost" className="text-white" onClick={() => setCurrentReadChapter(c => c + 1)} disabled={currentReadChapter >= goal.endChapter}>다음</Button>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gray-50 rounded-[28px] p-6 border border-gray-100 space-y-4 shadow-inner">
               <div className="flex items-center gap-2 text-[#5D7BAF] font-black"><PenLine size={18} /> 오늘의 묵상</div>
               <Textarea placeholder="기록을 남겨보세요." className="bg-white border-none min-h-[140px] rounded-2xl p-5" value={memo} onChange={(e) => setMemo(e.target.value)} />
               <Button className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black shadow-lg">저장하기</Button>
            </div>
          </div>
        )}
      </main>

      {/* 권/장 선택 모달 */}
      <AnimatePresence>
        {showModal.show && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-t-[40px] shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-8 border-b flex justify-between items-center">
                <h3 className="font-black text-[#5D7BAF] text-xl">위치 설정</h3>
                <button onClick={() => setShowModal({ ...showModal, show: false })}><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                {modalStep === 'BOOK' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {books.map(b => (
                      <button key={b.Id} className="h-14 rounded-xl border-2 border-gray-100 font-black text-gray-600 active:bg-[#5D7BAF] active:text-white" onClick={() => handleBookSelect(b)}>{b.book_name}</button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {[...Array(tempSelection?.total_chapters || 0)].map((_, i) => (
                      <button key={i} className="aspect-square rounded-lg border border-gray-200 font-black text-gray-500 active:bg-[#5D7BAF] active:text-white" onClick={() => handleFinalChapterSelect(i + 1)}>{i + 1}</button>
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
