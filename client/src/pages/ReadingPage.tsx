import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  BarChart3, Settings2, Trophy, Share2, ChevronRight, X, 
  Play, Pause, Volume2, CheckCircle2, ChevronDown, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function ReadingPage() {
  const { fontSize, fontFamily } = useDisplaySettings();
  
  // UI 상태
  const [step, setStep] = useState<'SETTING' | 'READING'>('SETTING');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // 목표 설정 상태
  const [goal, setGoal] = useState({
    startBook: { id: 1, name: "창세기" },
    startChapter: 1,
    endBook: { id: 1, name: "창세기" },
    endChapter: 3
  });

  // 데이터 상태
  const [books, setBooks] = useState<any[]>([]);
  const [chapterList, setChapterList] = useState<any[]>([]); // 목표 구간의 모든 장 데이터
  const [currentIdx, setCurrentIdx] = useState(0); // 현재 읽고 있는 장의 인덱스
  
  // TTS 상태
  const [isAutoNext, setIsAutoNext] = useState(false); // 전체 읽기 모드
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. 초기 성경 목록 및 진척도 로드
  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('bible_books').select('*').order('book_order');
      if (data) setBooks(data);
    }
    init();
  }, []);

  // 2. 목표 확정 시 해당 구간 말씀들 가져오기
  const startReading = async () => {
    // 실제로는 시작 권/장부터 종료 권/장까지의 모든 데이터를 불러오는 로직
    const { data } = await supabase
      .from('bible_verses')
      .select('*')
      .eq('book_id', goal.startBook.id)
      .gte('chapter', goal.startChapter)
      .lte('chapter', goal.endChapter)
      .order('chapter').order('verse');
    
    if (data) {
      // 장 단위로 그룹화
      const grouped = data.reduce((acc: any, cur: any) => {
        const key = cur.chapter;
        if (!acc[key]) acc[key] = [];
        acc[key].push(cur);
        return acc;
      }, {});
      setChapterList(Object.values(grouped));
      setStep('READING');
    }
  };

  // 3. 다음 장으로 넘기기 (자동/수동 공통)
  const nextChapter = () => {
    if (currentIdx < chapterList.length - 1) {
      setCurrentIdx(prev => prev + 1);
      if (isAutoNext) {
        // TTS 자동 재생 로직 호출 예정
      }
    } else {
      setShowCelebration(true); // 마지막 장 완료
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* 1. 상단 전체 진척도 카드 */}
      <div className="p-4 pt-6">
        <Card className="border-none bg-[#5D7BAF] text-white shadow-xl rounded-[32px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black">성경 통독</h2>
                <p className="text-xs opacity-70 font-bold">하나님의 말씀을 깊이 새기는 시간</p>
              </div>
              <Button 
                onClick={() => setShowProgressModal(true)}
                className="bg-white/20 hover:bg-white/30 border-none rounded-2xl gap-2 font-bold text-sm"
              >
                <BarChart3 size={18} /> 상세 진척도
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold">전체 완료율</span>
                <span className="text-2xl font-black">12.5%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full">
                <motion.div className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" animate={{ width: "12.5%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. 목표 설정 단계 (SETTING) */}
      {step === 'SETTING' && (
        <div className="px-4 space-y-4">
          <div className="bg-white rounded-[24px] p-6 border border-zinc-100 shadow-sm">
            <h3 className="font-black text-zinc-800 mb-4 flex items-center gap-2">
              <Settings2 size={18} className="text-[#5D7BAF]" /> 오늘의 목표 설정
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 ml-1">시작 지점</p>
                <button className="w-full p-4 bg-zinc-50 rounded-2xl text-left border border-zinc-100">
                  <p className="text-xs font-bold text-[#5D7BAF]">{goal.startBook.name}</p>
                  <p className="text-lg font-black text-zinc-800">{goal.startChapter}장</p>
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 ml-1">종료 지점</p>
                <button className="w-full p-4 bg-blue-50/50 rounded-2xl text-left border border-blue-100">
                  <p className="text-xs font-bold text-[#5D7BAF]">{goal.endBook.name}</p>
                  <p className="text-lg font-black text-zinc-800">{goal.endChapter}장</p>
                </button>
              </div>
            </div>

            <Button onClick={startReading} className="w-full h-16 bg-[#5D7BAF] hover:bg-[#4A648C] text-white rounded-2xl font-black text-lg">
              목표 확정 및 읽기 시작
            </Button>
          </div>
        </div>
      )}

      {/* 3. 본문 읽기 단계 (READING) */}
      {step === 'READING' && chapterList.length > 0 && (
        <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-zinc-800">
              {goal.startBook.name} {chapterList[currentIdx][0].chapter}장
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant={isAutoNext ? "default" : "outline"} onClick={() => setIsAutoNext(!isAutoNext)} className={isAutoNext ? "bg-[#5D7BAF]" : ""}>
                {isAutoNext ? "전체 자동읽기" : "장별 나눠읽기"}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 border border-zinc-100 shadow-sm mb-6">
            <div className="space-y-5">
              {chapterList[currentIdx].map((v: any) => (
                <p key={v.id} style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }} className="leading-relaxed text-zinc-800">
                  <span className="text-[#5D7BAF] font-bold mr-2">{v.verse}</span>{v.content}
                </p>
              ))}
            </div>
          </div>

          <Button 
            onClick={nextChapter}
            className="w-full h-16 bg-[#5D7BAF] text-white rounded-2xl font-black text-lg shadow-lg"
          >
            {currentIdx === chapterList.length - 1 ? "최종 읽기 완료" : "다음 장으로"}
          </Button>
        </div>
      )}

      {/* 4. 상세 진척도 팝업 (에너지 레벨 표시) */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm p-4 flex items-end">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full rounded-t-[40px] max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-8 flex justify-between items-center border-b">
                <h3 className="text-2xl font-black text-zinc-900">상세 진척도</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowProgressModal(false)}><X /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {books.map((b) => (
                  <div key={b.id} className="p-4 bg-zinc-50 rounded-[20px] flex items-center justify-between">
                    <div>
                      <p className="font-black text-zinc-800">{b.book_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Zap size={12} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-bold text-zinc-400">진척도 45%</span>
                      </div>
                    </div>
                    {/* 에너지 레벨 바 */}
                    <div className="w-24 h-2 bg-zinc-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 w-[45%]" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. 축하 팝업 */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-[400] bg-[#5D7BAF]/95 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] p-8 w-full max-w-sm text-center shadow-2xl">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy size={40} className="text-yellow-500" />
              </div>
              <h2 className="text-3xl font-black text-[#5D7BAF] mb-2">통독 완료!</h2>
              <p className="text-zinc-500 font-bold mb-8">오늘도 말씀으로 승리하셨습니다.</p>
              
              <div className="bg-zinc-50 rounded-3xl p-5 mb-8 text-left space-y-2">
                <div className="flex justify-between text-sm"><span className="text-zinc-400 font-bold">읽은 구간</span><span className="font-black">{goal.startBook.name} {goal.startChapter}~{goal.endChapter}장</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400 font-bold">소요 시간</span><span className="font-black text-[#5D7BAF]">25분 12초</span></div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setShowCelebration(false)}>닫기</Button>
                <Button className="flex-1 h-14 rounded-2xl bg-[#FEE500] text-black font-bold gap-2">
                   카톡 공유
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
