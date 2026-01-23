import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, Mic, Pause, Play, X,
  BookOpen, BarChart3, PenLine
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
  const [goal, setGoal] = useState<any>(null); 
  const [currentReadChapter, setCurrentReadChapter] = useState<number>(1);
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [isReadCompleted, setIsReadCompleted] = useState(false);
  const [memo, setMemo] = useState("");

  // 음성 재생 관련
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 날짜 변경 시 데이터 로드 (DailyWordPage 로직과 동일)
  useEffect(() => {
    fetchDailyGoal();
  }, [currentDate]);

  const fetchDailyGoal = async () => {
    setLoading(true);
    const formattedDate = currentDate.toISOString().split('T')[0];
    
    // 사용자의 목표를 가져오는 쿼리 (예시 테이블명: reading_goals)
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

  const fetchBibleContent = async (bookName: string, chapter: number) => {
    const { data } = await supabase
      .from('bible_verses')
      .select('*')
      .eq('book_name', bookName)
      .eq('chapter', chapter)
      .order('verse', { ascending: true });
    setBibleContent(data || []);
  };

  const handleCompleteChapter = () => {
    setIsReadCompleted(true);
    // 진척율 업데이트 로직 추가 지점
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* [헤더] DailyWordPage 디자인 100% 복사본 */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);
          }}><ChevronLeft className="w-6 h-6" /></Button>
          
          <div className="text-center relative">
            <h1 className="text-[#5D7BAF] font-bold" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <div className="relative cursor-pointer group flex flex-col items-center" 
                 onClick={() => (document.getElementById('date-picker') as any).showPicker()}>
              <p className="text-sm text-gray-400 font-bold transition-all duration-200 group-hover:text-[#5D7BAF] group-active:scale-95 flex items-center justify-center gap-1"
                 style={{ fontSize: `${fontSize - 2}px` }}>
                {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                {` (${currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})`}
                <span className="text-[12px] opacity-50">▼</span>
              </p>
              <input id="date-picker" type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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
        {/* 진척율 섹션 */}
        <div className="bg-gray-50 rounded-2xl p-5 flex items-center justify-between border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#5D7BAF] w-5 h-5" />
            <span className="text-sm font-bold text-gray-500">오늘의 진척율</span>
          </div>
          <span className="text-[#5D7BAF] font-black text-xl">35%</span>
        </div>

        {/* 말씀 카드: #5D7BAF 색상 및 디자인 복구 */}
        {goal ? (
          <Card className="border-none bg-[#5D7BAF] shadow-none overflow-hidden rounded-sm">
            <CardContent className="pt-8 pb-5 px-6">
              <div className="flex justify-between items-center mb-6 text-white font-bold">
                <span style={{ fontSize: `${fontSize}px` }}>{goal.start_book_name} {currentReadChapter}장</span>
                <button className="bg-white/20 p-2 rounded-full active:bg-white/30 transition-colors"><Mic size={18} /></button>
              </div>
              
              <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar text-white leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                {bibleContent.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-[1.8rem_1fr] items-start mb-3">
                    <span className="font-base opacity-70 text-right pr-2 pt-[0.3px] text-sm">{v.verse}</span>
                    <span className="break-keep">{v.content}</span>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 및 완료 버튼 */}
              <div className="mt-8 pt-5 border-t border-white/20 flex items-center justify-between gap-2">
                <Button variant="ghost" className="text-white hover:bg-white/10 flex-1 h-12"
                        disabled={currentReadChapter <= goal.start_chapter}>
                  <ChevronLeft className="mr-1 w-4 h-4" /> 이전
                </Button>
                
                <Button className="bg-white text-[#5D7BAF] font-black rounded-full px-6 h-12 shadow-md flex-none active:scale-95 transition-transform"
                        onClick={handleCompleteChapter}>
                  {isReadCompleted ? <CheckCircle2 className="w-5 h-5" /> : "읽기 완료"}
                </Button>

                <Button variant="ghost" className="text-white hover:bg-white/10 flex-1 h-12 text-right"
                        disabled={currentReadChapter >= goal.end_chapter}>
                  다음 <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="py-20 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto" />
            <p className="text-gray-400 font-bold">오늘 설정된 목표가 없습니다.</p>
            <Button className="bg-[#5D7BAF] rounded-full px-8 font-bold">목표 설정하기</Button>
          </div>
        )}

        {/* 기록 남기기 */}
        {goal && (
          <div className="mt-6 px-1">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="w-5 h-5 text-[#5D7BAF]" />
              <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘 읽은 말씀 기록</h3>
            </div>
            <div className="bg-gray-100/50 rounded-2xl p-5 border border-gray-100 space-y-4 shadow-sm">
              <Textarea 
                placeholder="기억에 남는 말씀이나 소감을 기록하세요."
                className="bg-white border-none resize-none min-h-[120px] p-4 text-gray-600 rounded-xl text-sm shadow-inner"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
              <Button className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black text-lg shadow-md active:bg-[#4A638F]">
                기록 저장하기
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
