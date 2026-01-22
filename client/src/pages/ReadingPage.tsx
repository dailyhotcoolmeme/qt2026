import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  BarChart3, Settings2, Trophy, Share2, ChevronRight, X, CheckCircle2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const { fontSize, fontFamily } = useDisplaySettings();
  
  // 상태 관리
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false); // 드릴다운 팝업
  const [showCelebration, setShowCelebration] = useState(false);
  
  // 드릴다운 데이터 상태
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookInModal, setSelectedBookInModal] = useState<any>(null);

  // 현재 진행/목표 상태
  const [currentGoal, setCurrentGoal] = useState({
    bookId: 1,
    bookName: "창세기",
    startChapter: 1,
    endChapter: 3,
    completedChapters: [] as number[]
  });
  
  const [chapterContent, setChapterContent] = useState<any[]>([]);
  const [currentViewChapter, setCurrentViewChapter] = useState(1);

  // 1. 초기 데이터 및 성경 목록 로드
  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('bible_verses').select('book_id, book_name').eq('verse', 1).eq('chapter', 1).order('book_id');
      if (data) setBooks(data);
      setLoading(false);
    }
    init();
  }, []);

  // 2. 장 본문 로드
  useEffect(() => {
    async function fetchChapter() {
      const { data } = await supabase
        .from('bible_verses')
        .select('*')
        .eq('book_id', currentGoal.bookId)
        .eq('chapter', currentViewChapter)
        .order('verse');
      if (data) setChapterContent(data);
    }
    fetchChapter();
  }, [currentGoal.bookId, currentViewChapter]);

  // 장 읽기 완료 로직
  const handleComplete = async (chapter: number) => {
    const nextCompleted = [...currentGoal.completedChapters, chapter];
    setCurrentGoal({ ...currentGoal, completedChapters: nextCompleted });

    if (nextCompleted.length >= (currentGoal.endChapter - currentGoal.startChapter + 1)) {
      setShowCelebration(true);
    } else {
      setCurrentViewChapter(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-[#5D7BAF]">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="p-4 space-y-4">
        {/* 상단 진행 상태 카드 (DailyWordPage 스타일) */}
        <Card className="border-none bg-[#5D7BAF] text-white shadow-lg rounded-3xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold opacity-80 mb-1">오늘의 통독 구간</p>
                <h2 className="text-xl font-extrabold">{currentGoal.bookName} {currentGoal.startChapter}~{currentGoal.endChapter}장</h2>
              </div>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setShowProgressModal(true)}>
                <BarChart3 className="w-6 h-6" />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>진행률</span>
                <span>{Math.round((currentGoal.completedChapters.length / (currentGoal.endChapter - currentGoal.startChapter + 1)) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white" 
                  initial={{ width: 0 }} 
                  animate={{ width: `${(currentGoal.completedChapters.length / (currentGoal.endChapter - currentGoal.startChapter + 1)) * 100}%` }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 본문 표시 */}
        <div className="py-4 space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-extrabold text-[#5D7BAF]">{currentGoal.bookName} {currentViewChapter}장</h3>
          </div>
          <div className="space-y-4">
            {chapterContent.map((v) => (
              <p key={v.id} style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }} className="leading-relaxed text-zinc-800">
                <sup className="text-blue-500 mr-2 font-bold">{v.verse}</sup>{v.content}
              </p>
            ))}
          </div>
          <Button className="w-full h-14 bg-[#5D7BAF] text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform" onClick={() => handleComplete(currentViewChapter)}>
            {currentViewChapter === currentGoal.endChapter ? "오늘의 목표 달성!" : `${currentViewChapter}장 완료 (다음 장으로)`}
          </Button>
        </div>
      </div>

      {/* 드릴다운 진척도 팝업 */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[32px] max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-900">
                  {selectedBookInModal ? `${selectedBookInModal.book_name} 장 선택` : "성경 권 선택"}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => { setShowProgressModal(false); setSelectedBookInModal(null); }}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {!selectedBookInModal ? (
                  // 권 선택 리스트
                  <div className="grid grid-cols-1 gap-2">
                    {books.map(b => (
                      <button key={b.book_id} onClick={() => setSelectedBookInModal(b)} className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors">
                        <span className="font-bold text-zinc-700">{b.book_name}</span>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  // 장 선택 리스트 (drill-down)
                  <div className="grid grid-cols-5 gap-2">
                    {[...Array(50)].map((_, i) => ( // 실제로는 DB에서 해당 권의 장 수를 가져와야 함
                      <button key={i} 
                        onClick={() => {
                          setCurrentGoal({ ...currentGoal, bookId: selectedBookInModal.book_id, bookName: selectedBookInModal.book_name, startChapter: i + 1, endChapter: i + 3, completedChapters: [] });
                          setCurrentViewChapter(i + 1);
                          setShowProgressModal(false);
                          setSelectedBookInModal(null);
                        }}
                        className="aspect-square flex items-center justify-center bg-blue-50 text-[#5D7BAF] font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                      >
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

      {/* 축하 모달 및 카톡 공유 로직 (생략 - 이전과 동일) */}
    </div>
  );
}
