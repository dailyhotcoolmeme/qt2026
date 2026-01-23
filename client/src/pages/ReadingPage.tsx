import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, Mic, 
  BarChart3, PenLine, BookOpen, Lock
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import AuthPage from "./AuthPage"; // 로그인 유도용

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // 목표 설정 상태
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [goalRange, setGoalRange] = useState({
    startBook: "창세기",
    startChapter: 1,
    endBook: "창세기",
    endChapter: 5
  });

  const [currentReadChapter, setCurrentReadChapter] = useState(1);
  const [bibleContent, setBibleContent] = useState<any[]>([]);
  const [memo, setMemo] = useState("");

  // 1. 접속 및 날짜 변경 시 초기화
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    // 여기서 어제 읽은 데이터(Last Read)를 불러와 goalRange 초기값을 세팅하는 로직이 들어갑니다.
  }, [currentDate]);

  // 2. 목표 확정하기 버튼
  const handleConfirmGoal = () => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    setIsGoalSet(true);
    setCurrentReadChapter(goalRange.startChapter);
    // TODO: fetchBibleContent 호출
  };

  if (showLogin) return <AuthPage />;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 헤더 (DailyWordPage와 동일 - 코드 생략) */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);
          }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center relative">
            <h1 className="text-[#5D7BAF] font-black" style={{ fontSize: `${fontSize + 3}px` }}>성경 읽기</h1>
            <p className="text-sm text-gray-400 font-bold">{currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} ({currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d);
          }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-6">
        
        {/* [추가] 진척율 구분 한 줄 레이아웃 */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-around text-center">
          <div>
            <p className="text-[11px] text-gray-400 font-bold mb-1">성경 전체 통독율</p>
            <p className="text-[#5D7BAF] font-black text-lg">12.5%</p>
          </div>
          <div className="w-[1px] h-8 bg-gray-200" />
          <div>
            <p className="text-[11px] text-gray-400 font-bold mb-1">오늘 목표 진척도</p>
            <p className="text-green-500 font-black text-lg">40%</p>
          </div>
        </div>

        {/* [변경] 목표 설정 영역 */}
        {!isGoalSet ? (
          <div className="bg-white rounded-3xl border-2 border-[#5D7BAF]/10 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#5D7BAF]" />
              <h3 className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘의 읽기 목표 정하기</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 ml-1">시작 위치</label>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-600">
                  {goalRange.startBook} {goalRange.startChapter}장
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 ml-1">종료 위치</label>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-600">
                  {goalRange.endBook} {goalRange.endChapter}장
                </div>
              </div>
            </div>

            <Button 
              onClick={handleConfirmGoal}
              className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black text-lg shadow-md active:scale-95 transition-transform"
            >
              목표 확정하고 읽기 시작
            </Button>
            <p className="text-center text-[11px] text-gray-400 font-medium">※ 어제 읽은 기록을 바탕으로 자동 설정되었습니다.</p>
          </div>
        ) : (
          /* [기존] 말씀 읽기 카드 및 페이지네이션 로직 */
          <Card className="border-none bg-[#5D7BAF] shadow-none overflow-hidden rounded-sm">
            <CardContent className="pt-8 pb-5 px-6">
               <div className="flex justify-between items-center mb-6 text-white font-bold">
                <span style={{ fontSize: `${fontSize}px` }}>{goalRange.startBook} {currentReadChapter}장</span>
                <button className="bg-white/20 p-2 rounded-full"><Mic size={18} /></button>
              </div>

              {/* 말씀 리스트업 부분 (가정된 데이터 사용) */}
              <div className="max-h-[350px] overflow-y-auto pr-2 text-white leading-relaxed">
                {bibleContent.length > 0 ? (
                  bibleContent.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[1.8rem_1fr] items-start mb-3">
                      <span className="font-base opacity-70 text-right pr-2 text-sm">{v.verse}</span>
                      <span className="break-keep">{v.content}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 opacity-60">말씀을 불러오고 있습니다...</p>
                )}
              </div>

              <div className="mt-8 pt-5 border-t border-white/20 flex items-center justify-between gap-2">
                <Button variant="ghost" className="text-white hover:bg-white/10 flex-1 font-bold">이전</Button>
                <Button className="bg-white text-[#5D7BAF] font-black rounded-full px-6 h-12 shadow-md">읽기 완료</Button>
                <Button variant="ghost" className="text-white hover:bg-white/10 flex-1 font-bold">다음</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 하단 기록 영역 (목표가 확정된 상태에서만 노출) */}
        {isGoalSet && (
          <div className="mt-6 px-1 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="w-5 h-5 text-[#5D7BAF]" />
              <h3 className="font-black text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘 읽은 말씀 기록</h3>
            </div>
            <div className="bg-gray-100/50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <Textarea 
                placeholder="오늘 읽은 말씀에 대한 기록을 남겨보세요."
                className="bg-white border-none resize-none min-h-[120px] p-4 text-gray-600 rounded-xl text-sm"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
              <Button className="w-full bg-[#5D7BAF] h-14 rounded-2xl font-black text-lg">기록 저장하기</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
