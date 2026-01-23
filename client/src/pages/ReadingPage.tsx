import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Book, Save, Trophy, CheckCircle2, ChevronRight, X } from "lucide-react";

interface Verse {
  id: number;
  book_name: string;
  chapter: number;
  verse: number;
  content: string;
}

export default function ReadingPage() {
  // 1. 상태 관리
  const [isGoalSet, setIsGoalSet] = useState(false); // 목표 설정 여부
  const [showSelector, setShowSelector] = useState(false); // 책/장 선택 모달
  const [verses, setVerses] = useState<Verse[]>([]);
  const [readVerses, setReadVerses] = useState<number[]>([]); // 읽은 구절 번호들
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState("");
  const [currentSelection, setCurrentSelection] = useState({ book: "창세기", chapter: 1 });

  // 2. 초기 목표 설정 여부 확인 (기존 기획)
  useEffect(() => {
    const checkGoal = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("user_goals").select("*").eq("user_id", session.user.id).single();
        if (data) setIsGoalSet(true);
      }
    };
    checkGoal();
    fetchVerses(currentSelection.book, currentSelection.chapter);
  }, []);

  // 3. 성경 본문 가져오기
  const fetchVerses = async (book: string, chapter: number) => {
    setLoading(true);
    const { data } = await supabase
      .from("bible_verses")
      .select("*")
      .eq("book_name", book)
      .eq("chapter", chapter)
      .order("verse", { ascending: true });
    if (data) setVerses(data);
    setLoading(false);
  };

  // 4. 구절 읽기 토글 (진척도에 반영)
  const toggleVerse = (verseNum: number) => {
    setReadVerses(prev => 
      prev.includes(verseNum) ? prev.filter(v => v !== verseNum) : [...prev, verseNum]
    );
  };

  const progress = verses.length > 0 ? Math.round((readVerses.length / verses.length) * 100) : 0;

  // 목표 설정 전이라면 보여줄 화면
  if (!isGoalSet) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
          <Trophy className="w-10 h-10 text-[#7180B9]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-800">성경 읽기 목표가 없어요</h2>
          <p className="text-gray-500 font-medium">먼저 올해의 성경 읽기 목표를<br/>설정해볼까요?</p>
        </div>
        <Button 
          onClick={() => setIsGoalSet(true)} // 테스트용으로 바로 전환
          className="w-full h-16 bg-[#7180B9] text-white text-xl font-black rounded-2xl shadow-lg"
        >
          목표 설정하러 가기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white relative">
      {/* 상단: 진척도 및 선택바 */}
      <div className="p-5 border-b space-y-4 bg-white sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => setShowSelector(true)} className="flex items-center gap-2 group">
            <h2 className="text-2xl font-black text-gray-900 group-active:text-[#7180B9]">
              {currentSelection.book} {currentSelection.chapter}장
            </h2>
            <ChevronRight className="w-6 h-6 text-gray-400" />
          </button>
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-[#7180B9]">{progress}% 완료</span>
            <div className="w-24 h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-[#7180B9]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 본문: 체크 가능한 구절 리스트 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        {verses.map((v) => (
          <div 
            key={v.id} 
            onClick={() => toggleVerse(v.verse)}
            className={`flex gap-4 items-start transition-opacity ${readVerses.includes(v.verse) ? 'opacity-40' : 'opacity-100'}`}
          >
            <div className="pt-1">
              {readVerses.includes(v.verse) ? 
                <CheckCircle2 className="w-5 h-5 text-[#7180B9]" /> : 
                <div className="w-5 h-5 border-2 border-gray-200 rounded-full" />
              }
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-xs font-bold text-gray-400">제 {v.verse}절</span>
              <p className="text-[1.15rem] font-medium leading-[1.7] text-gray-800 tracking-tight">
                {v.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 하단: 메모장 (기획대로 유지) */}
      <div className="p-4 bg-gray-50 border-t z-20">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="오늘의 묵상을 기록하세요..."
          className="w-full h-20 p-4 bg-white border-none rounded-xl shadow-sm outline-none text-sm"
        />
        <Button className="w-full mt-2 bg-[#7180B9] font-bold">기록 저장</Button>
      </div>

      {/* 책 선택 모달 (임시 구현) */}
      {showSelector && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full h-[80%] bg-white rounded-t-[32px] p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black">읽으실 성경을 선택하세요</h3>
              <button onClick={() => setShowSelector(false)}><X/></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["창세기", "출애굽기", "레위기"].map(b => (
                <Button key={b} variant="outline" onClick={() => {
                  setCurrentSelection({ ...currentSelection, book: b });
                  setShowSelector(false);
                  fetchVerses(b, 1);
                }}>{b}</Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
