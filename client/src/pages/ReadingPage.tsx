import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  ChevronLeft, ChevronRight, Play, Pause, Mic, X, 
  CheckCircle2, Share2, BarChart3, Settings2, Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const { fontSize } = useDisplaySettings();
  
  // 상태 관리
  const [loading, setLoading] = useState(true);
  const [showGoalSetting, setShowGoalSetting] = useState(true); // 처음엔 목표 설정부터
  const [showProgress, setShowProgress] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // 목표 관련 데이터
  const [currentGoal, setCurrentGoal] = useState({
    bookName: "창세기",
    startChapter: 1,
    endChapter: 3,
    startTime: new Date(),
    completedChapters: [] as number[]
  });

  // 본문 데이터
  const [chapterContent, setChapterContent] = useState<any[]>([]);
  const [currentViewChapter, setCurrentViewChapter] = useState(1);
  
  // TTS 관련
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. 초기 데이터 로드 (전일 완료 지점 불러오기 로직 포함)
  useEffect(() => {
    const fetchLastProgress = async () => {
      // 실제 구현 시 Supabase의 bible_progress 테이블에서 마지막 완료 지점을 가져옵니다.
      setLoading(false);
    };
    fetchLastProgress();
  }, []);

  // 2. 장별 본문 가져오기
  useEffect(() => {
    const fetchChapter = async () => {
      const { data } = await supabase
        .from('bible_verses')
        .select('*')
        .eq('book_name', currentGoal.bookName)
        .eq('chapter', currentViewChapter)
        .order('verse', { ascending: true });
      if (data) setChapterContent(data);
    };
    if (!showGoalSetting) fetchChapter();
  }, [currentViewChapter, showGoalSetting]);

  // 3. 읽기 완료 처리
  const handleChapterComplete = (chapter: number) => {
    const nextCompleted = [...currentGoal.completedChapters, chapter];
    setCurrentGoal({ ...currentGoal, completedChapters: nextCompleted });

    if (nextCompleted.length >= (currentGoal.endChapter - currentGoal.startChapter + 1)) {
      setShowCelebration(true); // 전체 목표 달성
    } else if (currentViewChapter < currentGoal.endChapter) {
      setCurrentViewChapter(prev => prev + 1); // 다음 장으로 이동
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-[#5D7BAF] font-bold">로딩 중...</div>;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 헤더 */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => setShowProgress(true)}>
            <BarChart3 className="w-6 h-6 text-[#5D7BAF]" />
          </Button>
          <h1 className="text-[#5D7BAF] font-bold" style={{ fontSize: `${fontSize + 2}px` }}>성경 통독</h1>
          <Button variant="ghost" size="icon" onClick={() => setShowGoalSetting(true)}>
            <Settings2 className="w-6 h-6 text-gray-400" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-4">
        {/* 목표 진행 현황 카드 */}
        <Card className="border-none bg-[#5D7BAF] text-white shadow-none rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-xs opacity-80 font-bold mb-1">오늘의 목표</p>
                <h2 className="text-xl font-bold">{currentGoal.bookName} {currentGoal.startChapter}~{currentGoal.endChapter}장</h2>
              </div>
              <p className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                {currentGoal.completedChapters.length} / {currentGoal.endChapter - currentGoal.startChapter + 1} 장 완료
              </p>
            </div>
            {/* 프로그레스 바 */}
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white" 
                initial={{ width: 0 }}
                animate={{ width: `${(currentGoal.completedChapters.length / (currentGoal.endChapter - currentGoal.startChapter + 1)) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 본문 영역 */}
        <div className="space-y-6 pb-10">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>
              {currentGoal.bookName} {currentViewChapter}장
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-[#5D7BAF]">
                <Mic className="w-4 h-4" /> <span className="text-xs font-bold">장별 듣기</span>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {chapterContent.map((v) => (
              <p key={v.id} style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }} className="text-gray-700">
                <sup className="text-blue-500 mr-1 font-bold">{v.verse}</sup>
                {v.content}
              </p>
            ))}
          </div>

          <Button 
            className="w-full h-14 bg-[#5D7BAF] hover:bg-[#4A648C] text-white rounded-xl font-bold shadow-lg"
            onClick={() => handleChapterComplete(currentViewChapter)}
          >
            {currentViewChapter === currentGoal.endChapter ? "오늘의 통독 완료" : `${currentViewChapter}장 읽기 완료 (다음 장으로)`}
          </Button>
        </div>
      </main>

      {/* 목표 설정 모달 */}
      <AnimatePresence>
        {showGoalSetting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-[#5D7BAF]">오늘의 목표 설정</h3>
                <p className="text-sm text-gray-400 mt-1 font-medium">어디까지 읽으시겠어요?</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold mb-1">시작</p>
                    <p className="font-bold">{currentGoal.bookName} {currentGoal.startChapter}장</p>
                  </div>
                  <div className="flex-1 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] text-blue-400 font-bold mb-1">종료(목표)</p>
                    <div className="flex items-center gap-1">
                      <input type="number" className="w-12 bg-transparent font-bold outline-none" defaultValue={currentGoal.endChapter} />
                      <span className="font-bold">장</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full h-14 bg-[#5D7BAF] rounded-2xl font-bold text-lg" onClick={() => setShowGoalSetting(false)}>
                통독 시작하기
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 완료 축하 카드 (Celebration) */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#5D7BAF]/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="bg-[#5D7BAF] p-8 text-center text-white">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
                <h2 className="text-2xl font-bold mb-1">할렐루야!</h2>
                <p className="text-white/80 font-medium">오늘의 통독 목표를 달성했습니다!</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-bold">읽은 구간</span>
                    <span className="text-gray-800 font-bold">{currentGoal.bookName} {currentGoal.startChapter}~{currentGoal.endChapter}장</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-bold">소요 시간</span>
                    <span className="text-[#5D7BAF] font-extrabold">0시간 45분 소요</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl border-gray-200 font-bold" onClick={() => setShowCelebration(false)}>닫기</Button>
                  <Button className="flex-1 h-12 rounded-xl bg-[#FEE500] text-black hover:bg-[#FEE500]/90 font-bold gap-2">
                    <Share2 className="w-4 h-4" /> 카톡 공유
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
