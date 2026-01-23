import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Book, Save, Trophy } from "lucide-react";

interface Verse {
  id: number;
  book_name: string;
  chapter: number;
  verse: number;
  content: string;
}

export default function ReadingPage() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState("");
  
  // 1. 진척도 관련 상태 (테스트용 데이터)
  const [progress, setProgress] = useState(65); // 현재 65% 읽었다고 가정
  const [currentSelection, setCurrentSelection] = useState({
    book: "창세기",
    chapter: 1
  });

  const fetchVerses = async (book: string, chapter: number) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bible_verses")
      .select("*")
      .eq("book_name", book)
      .eq("chapter", chapter)
      .order("verse", { ascending: true });

    if (!error && data) setVerses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchVerses(currentSelection.book, currentSelection.chapter);
  }, [currentSelection]);

  const handleSaveMemo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }
    const { error } = await supabase.from("notes").insert({
      user_id: session.user.id,
      content: memo,
      reference: `${currentSelection.book} ${currentSelection.chapter}장`,
      created_at: new Date()
    });
    if (!error) alert("기록이 저장되었습니다.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50">
      
      {/* 상단 섹션: 성경 선택 + 진척도 바 */}
      <div className="bg-white p-5 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Book className="w-5 h-5 text-[#7180B9]" />
            </div>
            <h2 className="text-xl font-black text-gray-800">
              {currentSelection.book} {currentSelection.chapter}장
            </h2>
          </div>
          <Button variant="outline" size="sm" className="border-[#7180B9] text-[#7180B9] font-bold rounded-xl">
            장 선택
          </Button>
        </div>

        {/* [추가] 진척도 게이지 영역 */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-gray-400 flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              오늘의 목표 달성률
            </span>
            <span className="text-lg font-black text-[#7180B9]">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#7180B9] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 중간: 성경 본문 (흰색 배경으로 강조) */}
      <div className="flex-1 overflow-y-auto bg-white p-5 space-y-6">
        {loading ? (
          <div className="text-center pt-10 text-gray-400 font-bold">로딩 중...</div>
        ) : (
          verses.map((v) => (
            <div key={v.id} className="flex gap-4 items-start">
              <span className="text-[#7180B9] font-black text-xs pt-1.5 min-w-[20px]">
                {v.verse}
              </span>
              <p className="text-gray-700 text-[1.15rem] leading-[1.8] font-medium tracking-tight">
                {v.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 하단: 메모장 섹션 */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="max-w-[500px] mx-auto space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-bold text-gray-500">묵상 메모</span>
            <button onClick={handleSaveMemo} className="text-[#7180B9] font-black text-sm flex items-center gap-1">
              <Save className="w-4 h-4" /> 저장하기
            </button>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘의 말씀을 통해 깨달은 점을 적어보세요..."
            className="w-full h-24 p-4 bg-white border-none rounded-2xl shadow-sm outline-none resize-none focus:ring-2 focus:ring-[#7180B9] text-sm"
          />
        </div>
      </div>
    </div>
  );
}
