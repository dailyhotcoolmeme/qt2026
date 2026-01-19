import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  Play, Pause, Square, CheckCircle2, BarChart3, X, Trophy, Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthPage from "./AuthPage"; // 로그인 페이지 컴포넌트 연결

// --- 성경 데이터 ---
const BIBLE_BOOKS = [
  { name: "창세기", chapters: 50, type: "구약" }, { name: "출애굽기", chapters: 40, type: "구약" },
  { name: "레위기", chapters: 27, type: "구약" }, { name: "민수기", chapters: 36, type: "구약" },
  { name: "신명기", chapters: 34, type: "구약" }, { name: "여호수아", chapters: 24, type: "구약" },
  { name: "사사기", chapters: 21, type: "구약" }, { name: "루기", chapters: 4, type: "구약" },
  { name: "사무엘상", chapters: 31, type: "구약" }, { name: "사무엘하", chapters: 24, type: "구약" },
  { name: "열왕기상", chapters: 22, type: "구약" }, { name: "열왕기하", chapters: 25, type: "구약" },
  { name: "역대상", chapters: 29, type: "구약" }, { name: "역대하", chapters: 36, type: "구약" },
  { name: "에스라", chapters: 10, type: "구약" }, { name: "느헤미야", chapters: 13, type: "구약" },
  { name: "에스더", chapters: 10, type: "구약" }, { name: "욥기", chapters: 42, type: "구약" },
  { name: "시편", chapters: 150, type: "구약" }, { name: "잠언", chapters: 31, type: "구약" },
  { name: "전도서", chapters: 12, type: "구약" }, { name: "아가", chapters: 8, type: "구약" },
  { name: "이사야", chapters: 66, type: "구약" }, { name: "예레미야", chapters: 52, type: "구약" },
  { name: "예레미야 애가", chapters: 5, type: "구약" }, { name: "에스겔", chapters: 48, type: "구약" },
  { name: "다니엘", chapters: 12, type: "구약" }, { name: "호세아", chapters: 14, type: "구약" },
  { name: "요엘", chapters: 3, type: "구약" }, { name: "아모스", chapters: 9, type: "구약" },
  { name: "오바댜", chapters: 1, type: "구약" }, { name: "요나", chapters: 4, type: "구약" },
  { name: "미가", chapters: 7, type: "구약" }, { name: "나훔", chapters: 3, type: "구약" },
  { name: "하박국", chapters: 3, type: "구약" }, { name: "스바냐", chapters: 3, type: "구약" },
  { name: "학개", chapters: 2, type: "구약" }, { name: "스가랴", chapters: 14, type: "구약" },
  { name: "말라기", chapters: 4, type: "구약" },
  { name: "마태복음", chapters: 28, type: "신약" }, { name: "마가복음", chapters: 16, type: "신약" },
  { name: "누가복음", chapters: 24, type: "신약" }, { name: "요한복음", chapters: 21, type: "신약" },
  { name: "사도행전", chapters: 28, type: "신약" }, { name: "로마서", chapters: 16, type: "신약" },
  { name: "고린도전서", chapters: 16, type: "신약" }, { name: "고린도후서", chapters: 13, type: "신약" },
  { name: "갈라디아서", chapters: 6, type: "신약" }, { name: "에베소서", chapters: 6, type: "신약" },
  { name: "빌립보서", chapters: 4, type: "신약" }, { name: "골로새서", chapters: 4, type: "신약" },
  { name: "데살로니가전서", chapters: 5, type: "신약" }, { name: "데살로니가후서", chapters: 3, type: "신약" },
  { name: "디모데전서", chapters: 6, type: "신약" }, { name: "디모데후서", chapters: 4, type: "신약" },
  { name: "디도서", chapters: 3, type: "신약" }, { name: "빌레몬서", chapters: 1, type: "신약" },
  { name: "히브리서", chapters: 13, type: "신약" }, { name: "야고보서", chapters: 5, type: "신약" },
  { name: "베드로전서", chapters: 5, type: "신약" }, { name: "베드로후서", chapters: 3, type: "신약" },
  { name: "요한일서", chapters: 5, type: "신약" }, { name: "요한이서", chapters: 1, type: "신약" },
  { name: "요한삼서", chapters: 1, type: "신약" }, { name: "유다서", chapters: 1, type: "신약" },
  { name: "요한계시록", chapters: 22, type: "신약" }
];

export default function ReadingPage() {
  // --- 상태 관리 ---
  const [isLoggedIn] = useState(false); // 로그인 상태 (인증 코드와 연동 필요)
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [showDetail, setShowDetail] = useState(false);
  const [showSetting, setShowSetting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [detailTab, setDetailTab] = useState<"구약" | "신약">("구약");
  const [settingStep, setSettingStep] = useState<"시작" | "종료">("시작");

  const [targetFrom, setTargetFrom] = useState({ bookIdx: 1, chapter: 3 });
  const [targetTo, setTargetTo] = useState({ bookIdx: 1, chapter: 6 });
  const [tempStart, setTempStart] = useState({ bookIdx: 1, chapter: 3 });
  const [tempEnd, setTempEnd] = useState({ bookIdx: 1, chapter: 6 });

  const [currentOrderIdx, setCurrentOrderIdx] = useState(0);
  const [completedList, setCompletedList] = useState<string[]>([]);

  const currentChapter = targetFrom.chapter + currentOrderIdx;
  const isLastPage = currentChapter === targetTo.chapter && targetFrom.bookIdx === targetTo.bookIdx;
  const readCount = 12 + completedList.length;

  // --- 로그인 체크 핸들러 ---
  const handleOpenSetting = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    } else {
      setSettingStep("시작");
      setShowSetting(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* 상단 헤더 */}
      <header className="flex-none p-5 border-b shadow-sm bg-white z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-primary">전체 통독 진척도</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-900">{readCount}</span>
              <span className="text-gray-300 text-[10px] font-bold">/ 1189 장</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl h-9 text-[11px] font-bold border-gray-200 px-4" onClick={() => setShowDetail(true)}>
            <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-primary" /> 상세 확인
          </Button>
        </div>
        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
          <motion.div animate={{ width: `${(readCount / 1189) * 100}%` }} className="h-full bg-primary" />
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-y-auto p-5 space-y-8 pb-32">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-[13px] font-black text-gray-900 flex items-center gap-1.5">
               <span className="w-1 h-3.5 bg-primary rounded-full" /> 오늘의 통독 목표
             </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div onClick={handleOpenSetting} className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 flex flex-col items-center cursor-pointer active:scale-95 transition-transform">
              <span className="text-[10px] font-black text-primary mb-2 opacity-60">시작</span>
              <span className="text-[15px] font-black text-gray-800">{BIBLE_BOOKS[targetFrom.bookIdx].name} {targetFrom.chapter}장</span>
            </div>
            <div onClick={handleOpenSetting} className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 flex flex-col items-center cursor-pointer active:scale-95 transition-transform">
              <span className="text-[10px] font-black text-gray-400 mb-2 opacity-60">종료</span>
              <span className="text-[15px] font-black text-gray-800">{BIBLE_BOOKS[targetTo.bookIdx].name} {targetTo.chapter}장</span>
            </div>
          </div>
        </div>

        <Card className="border-none bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-blue-50/30">
            <span className="font-black text-gray-800 text-[13px] tracking-tight">
              {BIBLE_BOOKS[targetFrom.bookIdx].name} {currentChapter}장
            </span>
          </div>
          <CardContent className="p-6 space-y-7">
            <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 border border-blue-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="text-primary">
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                    <button onClick={() => setIsPlaying(false)} className="text-gray-300">
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                    <div className="w-px h-3 bg-gray-100" />
                    <span className="text-[12px] font-black text-blue-500/80">오디오 성경 듣기</span>
                </div>
                <Volume2 className="w-4 h-4 text-blue-100" />
            </div>

            <div className="text-gray-700 leading-relaxed text-[17px] min-h-[200px] font-medium">
              성경 말씀 본문이 여기에 표시됩니다.
            </div>

            <div className="flex items-center gap-2 pt-4">
              {currentOrderIdx > 0 && (
                <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black border-gray-100 text-gray-400" onClick={() => setCurrentOrderIdx(currentOrderIdx - 1)}>이전</Button>
              )}
              <Button 
                variant={completedList.includes(`${targetFrom.bookIdx}-${currentChapter}`) ? "default" : "outline"}
                className={`flex-[2.5] h-14 rounded-2xl font-black gap-2 ${completedList.includes(`${targetFrom.bookIdx}-${currentChapter}`) ? "bg-[#7180B9] text-white" : "text-gray-300 border-gray-100"}`}
                onClick={() => {
                  if(!isLoggedIn) return setShowLoginModal(true);
                  const key = `${targetFrom.bookIdx}-${currentChapter}`;
                  setCompletedList(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
                }}
              >
                <CheckCircle2 className="w-5 h-5" />
                {completedList.includes(`${targetFrom.bookIdx}-${currentChapter}`) ? "읽음 완료" : "읽기 완료"}
              </Button>
              {!isLastPage ? (
                <Button className="flex-1 h-14 rounded-2xl font-black bg-gray-900 text-white" onClick={() => setCurrentOrderIdx(currentOrderIdx + 1)}>다음</Button>
              ) : (
                <Button className="flex-1 h-14 rounded-2xl font-black bg-primary text-white" onClick={() => setShowSuccess(true)}>종료</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 팝업: 로그인 (오늘의 말씀과 100% 동일한 효과) */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[40px] w-full max-w-md relative pt-12 pb-8 px-2 max-h-[85vh] overflow-y-auto"
            >
              <button onClick={() => setShowLoginModal(false)} className="absolute top-8 right-8 text-gray-400 p-4">✕</button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 팝업: 범위 설정 */}
      <AnimatePresence>
        {showSetting && (
          <div className="fixed inset-0 z-[1000] bg-black/60 flex items-end justify-center">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[32px] p-8 h-[75vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="font-black text-xl text-gray-900">{settingStep === "시작" ? "시작 지점" : "종료 지점"} 선택</h2>
                  <p className="text-[11px] text-primary font-black uppercase tracking-widest mt-1">범위 설정하기</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full bg-gray-50" onClick={() => setShowSetting(false)}><X className="w-5 h-5 text-gray-400" /></Button>
              </div>
              
              <div className="flex flex-1 overflow-hidden gap-4 border-y border-gray-50 py-6">
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {BIBLE_BOOKS.map((b, idx) => {
                    const isBlocked = settingStep === "종료" && idx < tempStart.bookIdx;
                    return (
                      <button key={idx} disabled={isBlocked}
                        className={`w-full text-left py-4 px-4 text-[13px] font-black rounded-2xl mb-2 transition-all ${
                          (settingStep === "시작" ? tempStart.bookIdx : tempEnd.bookIdx) === idx ? "bg-primary text-white" : isBlocked ? "opacity-10 cursor-not-allowed" : "text-gray-400"
                        }`}
                        onClick={() => {
                          if(settingStep === "시작") setTempStart({ bookIdx: idx, chapter: 1 });
                          else setTempEnd({ bookIdx: idx, chapter: 1 });
                        }}
                      >
                        {b.name}
                      </button>
                    )
                  })}
                </div>
                <div className="w-24 overflow-y-auto pl-2 custom-scrollbar">
                  {Array.from({ length: BIBLE_BOOKS[settingStep === "시작" ? tempStart.bookIdx : tempEnd.bookIdx].chapters }).map((_, i) => {
                    const ch = i + 1;
                    const isBlocked = settingStep === "종료" && tempEnd.bookIdx === tempStart.bookIdx && ch < tempStart.chapter;
                    return (
                      <button key={ch} disabled={isBlocked}
                        className={`w-full py-4 text-[13px] font-black rounded-2xl mb-2 transition-all ${
                          (settingStep === "시작" ? tempStart.chapter : tempEnd.chapter) === ch ? "bg-gray-900 text-white" : isBlocked ? "opacity-10" : "text-gray-300"
                        }`}
                        onClick={() => {
                          if(settingStep === "시작") setTempStart({ ...tempStart, chapter: ch });
                          else setTempEnd({ ...tempEnd, chapter: ch });
                        }}
                      >
                        {ch}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                {settingStep === "종료" && (
                  <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black border-gray-100 text-gray-400" onClick={() => setSettingStep("시작")}>이전</Button>
                )}
                <button className="flex-[2] h-16 bg-[#7180B9] text-white font-black rounded-2xl text-lg shadow-lg" onClick={() => {
                  if(settingStep === "시작") { setSettingStep("종료"); setTempEnd(tempStart); }
                  else { setTargetFrom(tempStart); setTargetTo(tempEnd); setCurrentOrderIdx(0); setShowSetting(false); }
                }}>
                  {settingStep === "시작" ? "다음 단계" : "목표 설정 완료"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 기타 팝업 (상세 진척도 / 성공) - 기존 한글 유지 */}
      <AnimatePresence>
        {showDetail && (
           <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden flex flex-col h-[70vh] shadow-2xl">
               <div className="p-6 border-b flex justify-between items-center">
                 <h2 className="font-black text-lg text-gray-900">상세 진척도</h2>
                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-gray-50" onClick={() => setShowDetail(false)}><X className="w-5 h-5 text-gray-400" /></Button>
               </div>
               <div className="flex p-1.5 bg-gray-100/50 m-6 rounded-2xl">
                 {["구약", "신약"].map(t => (
                   <button key={t} onClick={() => setDetailTab(t as any)} className={`flex-1 py-3 text-[12px] font-black rounded-xl transition-all ${detailTab === t ? "bg-white text-primary shadow-sm" : "text-gray-400"}`}>{t}</button>
                 ))}
               </div>
               <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5 custom-scrollbar">
                 {BIBLE_BOOKS.filter(b => b.type === detailTab).map(book => (
                   <div key={book.name} className="space-y-2">
                     <div className="flex justify-between text-[11px] font-black">
                       <span className="text-gray-600">{book.name}</span>
                       <span className="text-primary font-black">0 / {book.chapters} 장</span>
                     </div>
                     <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                       <div className="h-full bg-primary/20 w-0" />
                     </div>
                   </div>
                 ))}
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
