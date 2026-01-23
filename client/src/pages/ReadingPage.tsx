import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { BarChart3, ChevronRight, X, CheckCircle2, ChevronLeft, Play, Volume2, Settings2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function ReadingPage() {
  // 1. 상태 관리 (사용자 원본 상태 유지)
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState<{show: boolean, type: 'START' | 'END'}>({ show: false, type: 'START' });
  
  const [progressStep, setProgressStep] = useState<'TAB' | 'BOOKS' | 'CHAPTERS'>('TAB');
  const [rangeStep, setRangeStep] = useState<'BOOK' | 'CHAPTER'>('BOOK');
  
  const [activeTab, setActiveTab] = useState<'OLD' | 'NEW'>('OLD');
  const [selectedBook, setSelectedBook] = useState<any>(null); 
  const [tempBook, setTempBook] = useState<any>(null); 
  
  const [books, setBooks] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  
  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기" },
    startChapter: 1,
    endBook: { id: 66, name: "요한계시록" },
    endChapter: 22
  });

  // [추가] 본문 데이터 및 체크 관리
  const [verses, setVerses] = useState<any[]>([]);
  const [readVerses, setReadVerses] = useState<number[]>([]);
  const [memo, setMemo] = useState("");

  // 2. 초기 데이터 로드 (원본 로직)
  useEffect(() => {
    fetchData();
    fetchVerses("창세기", 1); // 기본값으로 창세기 1장 로드
  }, []);

  const fetchData = async () => {
    try {
      const { data: booksData } = await supabase.from('bible_books').select('*').order('id');
      const { data: progressData } = await supabase.from('bible_progress').select('*');
      if (booksData) setBooks(booksData);
      if (progressData) setUserProgress(progressData);
    } finally {
      setLoading(false);
    }
  };

  // [추가] 성경 본문 가져오기 함수
  const fetchVerses = async (bookName: string, chapter: number) => {
    const { data } = await supabase
      .from("bible_verses")
      .select("*")
      .eq("book_name", bookName)
      .eq("chapter", chapter)
      .order("verse", { ascending: true });
    if (data) setVerses(data);
    setReadVerses([]); // 장 변경 시 체크 초기화
  };

  // [추가] 메모 저장
  const handleSaveMemo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("로그인 후 이용 가능합니다.");
    const { error } = await supabase.from("notes").insert({
      user_id: session.user.id,
      content: memo,
      reference: `${goal.startBook.name} ${goal.startChapter}장`,
    });
    if (!error) {
      alert("묵상이 저장되었습니다.");
      setMemo("");
    }
  };

  // 기존 핸들러들 (사용자 원본 유지)
  const handleRangeBookSelect = (book: any) => {
    setTempBook(book);
    setRangeStep('CHAPTER');
  };

  const handleRangeChapterSelect = (chapter: number) => {
    if (showRangeModal.type === 'START') {
      setGoal({ ...goal, startBook: { id: tempBook.id, name: tempBook.book_name }, startChapter: chapter });
      fetchVerses(tempBook.book_name, chapter); // 선택 시 해당 장 본문 로드
    } else {
      setGoal({ ...goal, endBook: { id: tempBook.id, name: tempBook.book_name }, endChapter: chapter });
    }
    setShowRangeModal({ ...showRangeModal, show: false });
  };

  if (loading) return <div className="p-8 text-center font-bold text-zinc-400">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* 1. 상단 카드: 사용자 원본 디자인 그대로 */}
      <div className="p-5 space-y-4">
        <Card className="border-none shadow-xl bg-white rounded-[32px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">오늘의 읽기</h2>
                <p className="text-zinc-400 text-sm font-bold uppercase">Bible Reading Goal</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowProgressModal(true)} className="bg-zinc-50 rounded-2xl w-12 h-12">
                <BarChart3 className="text-[#5D7BAF]" size={24} />
              </Button>
            </div>

            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center bg-zinc-50 p-5 rounded-[24px]">
              <button onClick={() => { setShowRangeModal({ show: true, type: 'START' }); setRangeStep('BOOK'); }} className="text-center space-y-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase">시작</p>
                <p className="text-sm font-black text-zinc-800">{goal.startBook.name}</p>
                <p className="text-xl font-black text-[#5D7BAF]">{goal.startChapter}장</p>
              </button>
              <div className="h-10 w-[1px] bg-zinc-200" />
              <button onClick={() => { setShowRangeModal({ show: true, type: 'END' }); setRangeStep('BOOK'); }} className="text-center space-y-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase">종료</p>
                <p className="text-sm font-black text-zinc-800">{goal.endBook.name}</p>
                <p className="text-xl font-black text-zinc-300">{goal.endChapter}장</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 2. 본문 섹션: 사용자Zinc 스타일 적용 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-zinc-800">본문 읽기</h3>
            <span className="text-xs font-black text-[#5D7BAF]">{Math.round((readVerses.length/verses.length)*100 || 0)}% 완료</span>
          </div>
          
          <div className="bg-white rounded-[32px] p-6 shadow-sm space-y-6">
            {verses.map((v) => (
              <div 
                key={v.id} 
                onClick={() => setReadVerses(prev => prev.includes(v.verse) ? prev.filter(n => n !== v.verse) : [...prev, v.verse])}
                className={`flex gap-4 items-start cursor-pointer transition-all ${readVerses.includes(v.verse) ? 'opacity-30' : 'opacity-100'}`}
              >
                <div className="pt-1">
                  {readVerses.includes(v.verse) ? 
                    <CheckCircle2 className="w-5 h-5 text-[#5D7BAF]" /> : 
                    <div className="w-5 h-5 border-2 border-zinc-100 rounded-full" />
                  }
                </div>
                <p className="text-base font-bold text-zinc-700 leading-relaxed">
                  <span className="text-[#5D7BAF] mr-2">{v.verse}</span>
                  {v.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 메모장: Zinc 스타일 통일 */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-black text-zinc-400">묵상 기록</span>
            <button onClick={handleSaveMemo} className="text-[#5D7BAF] font-black text-sm flex items-center gap-1">
              <Save size={16} /> 저장
            </button>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 말씀을 통해 느낀 점을 기록해보세요..."
            className="w-full h-24 p-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-800 outline-none resize-none placeholder:text-zinc-300"
          />
        </div>
      </div>

      {/* 4. 모달: 사용자 원본 로직 유지 (AnimatePresence 등) */}
      <AnimatePresence>
        {showRangeModal.show && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRangeModal({ ...showRangeModal, show: false })} className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full max-w-[500px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[70vh]">
              <div className="p-8 flex justify-between items-center border-b border-zinc-50">
                <div className="flex items-center gap-3">
                  {rangeStep === 'CHAPTER' && <Button variant="ghost" size="icon" onClick={() => setRangeStep('BOOK')}><ChevronLeft /></Button>}
                  <h3 className="text-2xl font-black text-zinc-900">{rangeStep === 'BOOK' ? "성경 선택" : `${tempBook?.book_name} 장 선택`}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowRangeModal({ ...showRangeModal, show: false })} className="bg-zinc-50 rounded-2xl"><X size={24} /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                {rangeStep === 'BOOK' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {books.map(b => (
                      <button key={b.id} onClick={() => handleRangeBookSelect(b)} 
                        className="p-5 bg-zinc-50 rounded-[24px] text-left font-bold text-zinc-700 border-2 border-transparent active:border-[#5D7BAF] active:bg-white transition-all">
                        {b.book_name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {[...Array(tempBook?.total_chapters || 0)].map((_, i) => (
                      <button key={i} onClick={() => handleRangeChapterSelect(i + 1)} 
                        className="aspect-square bg-zinc-50 rounded-[20px] flex items-center justify-center font-black text-zinc-800 active:bg-[#5D7BAF] active:text-white transition-all border border-zinc-100">
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
    </div>
  );
}
