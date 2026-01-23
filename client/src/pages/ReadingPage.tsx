import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, Mic, Pause, Play, X,
  BookOpen, BarChart3, PenLine, Settings2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  
  // 상태 관리
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<any>(null); // 오늘 설정한 목표
  const [currentReadChapter, setCurrentReadChapter] = useState<number>(1); // 현재 읽고 있는 장
  const [bibleContent, setBibleContent] = useState<any[]>([]); // 현재 장의 말씀들
  const [isReadCompleted, setIsReadCompleted] = useState(false); // 현재 장 읽기 완료 여부
  const [memo, setMemo] = useState(""); // 오늘 읽은 소감 기록

  // 음성 관련
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 초기 로드: 날짜 변경 시 목표 및 데이터 호출
  useEffect(() => {
    fetchDailyGoal();
  }, [currentDate]);

  // 목표(Goal)를 가져오고, 해당 목표의 첫 장을 로드함
  const fetchDailyGoal = async () => {
    setLoading(true);
    const formattedDate = currentDate.toISOString().split('T')[0];
    
    // 1. 해당 날짜의 사용자의 읽기 목표를 가져옴 (예시 테이블: reading_goals)
    const { data: goalData } = await supabase
      .from('reading_goals')
      .select('*')
      .eq('target_date', formattedDate)
      .maybeSingle();

    if (goalData) {
      setGoal(goalData);
      setCurrentReadChapter(goalData.start_chapter);
      fetchBibleContent(goalData.start_book_name, goalData.start_chapter);
    } else {
      setGoal(null);
      setBibleContent([]);
    }
    setLoading(false);
  };

  // 특정 장의 성경 본문을 가져옴
  const fetchBibleContent = async (bookName: string, chapter: number) => {
    const { data } = await supabase
      .from('bible_verses') // 실제 성경 데이터가 들어있는 테이블
      .select('*')
      .eq('book_name', bookName)
      .eq('chapter', chapter)
      .order('verse', { ascending: true });
    
    setBibleContent(data || []);
    // 해당 장을 이미 읽었는지 체크하는 로직 필요 (reading_progress 테이블 확인)
  };

  // 읽기 완료 체크 함수
  const handleCompleteChapter = async () => {
    // DB 업데이트 로직 (진척율 반영)
    setIsReadCompleted(true);
    alert(`${currentReadChapter}장을 완료하셨습니다!`);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 1. 헤더: DailyWordPage 스타일의 날짜 선택 */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);
          }}><ChevronLeft className="w-6 h-6" /></Button>
          
          <div className="text-center relative">
            <h1 className="text-[#5D7BAF] font-bold" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <div className="relative cursor-pointer flex flex-col items-center" 
                 onClick={() => (document.getElementById('date-picker') as any).showPicker()}>
              <p className="text-sm text-gray-400 font-bold" style={{ fontSize: `${fontSize - 2}px` }}>
                {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                {` (${currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})`}
                <span className="text-[12px] opacity-50 ml-1">▼</span>
              </p>
              <input id="date-picker" type="date" className="absolute inset-0 w-full h-full opacity-0"
                     max={today.toISOString().split("T")[0]}
                     value={currentDate.toISOString().split("T")[0]}
                     onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))} />
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() + 1);
            if (d <= today) setCurrentDate(d);
          }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-6">
        {/* 2. 진척율 섹션 */}
        <div className="bg-blue-50/50 rounded-2xl p-4 flex items-center justify-between border border-blue-100/50">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#5D7BAF] w-5 h-5" />
            <span className="text-sm font-bold text-gray-600">오늘의 진척율</span>
          </div>
          <span className="text-[#5D7BAF] font-black text-lg">35%</span>
        </div>

        {/* 3. 말씀 읽기 카드 */}
        {goal ? (
          <Card className="border-none bg-[#92A9C9] shadow-none rounded-2xl">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="flex justify-between items-center mb-6 text-white/80 font-bold">
                <span>{goal.start_book_name} {currentReadChapter}장</span>
                <button className="bg-white/20 p-2 rounded-full"><Mic size={18} /></button>
              </div>
              
              <div className="space-y-4 text-white leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                {bibleContent.map((v, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="opacity-60 text-sm mt-1">{v.verse}</span>
                    <p className="break-keep">{v.content}</p>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 버튼 */}
              <div className="mt-10 flex items-center justify-between gap-4">
                <Button variant="ghost" className="text-white hover:bg-white/10"
                        disabled={currentReadChapter <= goal.start_chapter}>
                  <ChevronLeft className="mr-1" /> 이전 장
                </Button>
                <Button className="bg-white text-[#92A9C9] font-black rounded-full px-6 shadow-lg"
                        onClick={handleCompleteChapter}>
                  {isReadCompleted ? "읽기 완료됨" : "읽기 완료 체크"}
                </Button>
                <Button variant="ghost" className="text-white hover:bg-white/10"
                        disabled={currentReadChapter >= goal.end_chapter}>
                  다음 장 <ChevronRight className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="py-20 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto" />
            <p className="text-gray-400 font-medium">오늘 설정된 목표가 없습니다.<br/>새로운 목표를 설정해 보세요!</p>
            <Button className="bg-[#5D7BAF] rounded-full px-8">목표 설정하기</Button>
          </div>
        )}

        {/* 4. 기록 남기기 (목표가 있을 때만 노출) */}
        {goal && (
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-[#5D7BAF]" />
              <h3 className="font-bold text-[#5D7BAF]">오늘 읽은 말씀 기록</h3>
            </div>
            <Textarea 
              placeholder="오늘 읽은 말씀 중 기억에 남는 구절이나 소감을 적어보세요."
              className="bg-gray-50 border-none rounded-2xl min-h-[120px] p-4"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            <Button className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black text-lg shadow-md">
              기록 저장하기
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
