import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { 
  Play, Pause, Square, Volume2, ChevronLeft, ChevronRight, Mic, Lock, MessageCircle, Star, Copy, Share2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthPage from "./AuthPage";

export default function QTPage() {
  const [currentDate, setCurrentDate] = useState(new Date("2026-01-15"));
  const today = new Date("2026-01-15"); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthenticated] = useState(false); 

  const sharingList = [
    {
      id: 1,
      type: "묵상 기록",
      content: "오늘 시편 말씀을 길게 읽으니 주님의 동행하심이 더 깊게 느껴집니다. 오늘도 그 사랑으로 승리합니다!",
      userName: "",         
      userNickname: "신실한나그네772", 
      time: "방금 전"
    },
    {
      id: 2,
      type: "묵상 기도",
      content: "하나님의 사랑에서 우리를 끊을 수 있는 것은 아무것도 없습니다. 오늘도 그 사랑으로 승리합니다!",
      userName: "김은혜",    
      userTitle: "집사",
      userNickname: "은혜로운삶",
      time: "10분 전"
    }
  ];

  const handleShare = async () => {
    const container = document.getElementById("bible-content");
    const text = container ? container.innerText : "오늘의 묵상 말씀";
    if (navigator.share) {
      try { await navigator.share({ title: "오늘의 묵상", text: text, url: window.location.href }); } catch (err) { console.log("공유 취소"); }
    } else {
      navigator.clipboard.writeText(text);
      alert("링크가 복사되었습니다.");
    }
  };

  const handlePlayAudio = () => {
    if (!isPlaying) {
      const container = document.getElementById("bible-content");
      if (container) {
        let text = container.innerText;
        const cleanText = text.replace(/\d+\s/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ko-KR';
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    } else {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    if (newDate > today) return; 
    setCurrentDate(newDate);
  };

  const handleActionWithAuth = (actionName: string) => {
    if (!isAuthenticated) { setShowLoginModal(true); }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" className="text-gray-400" onClick={() => changeDate(-1)}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <p className="text-[10px] text-primary font-bold tracking-widest mb-0.5">{currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>
            <h1 className="text-lg font-black text-gray-900">오늘의 묵상</h1>
          </div>
          <Button variant="ghost" size="icon" className={currentDate >= today ? "text-gray-50" : "text-gray-400"} onClick={() => changeDate(1)} disabled={currentDate >= today}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-32 space-y-8">
        <Card className="border-none bg-blue-50/50 shadow-none overflow-hidden rounded-[32px]">
          <CardContent className="pt-6 pb-6 px-6 space-y-6">
            <div className="flex items-center justify-between bg-white/60 backdrop-blur-md rounded-full px-4 py-2 border border-blue-100">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary" onClick={handlePlayAudio}>{isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}</Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-900" onClick={() => { window.speechSynthesis.cancel(); setIsPlaying(false); }}><Square className="w-3 h-3 fill-current" /></Button>
                <div className="w-[1px] h-3 bg-blue-200 mx-1" /><span className="text-[10px] font-bold text-blue-400">오디오 성경 듣기</span>
              </div>
              <Volume2 className="w-3.5 h-3.5 text-blue-300" />
            </div>
            
            <div className="py-2">
               <div id="bible-content" className="text-[16px] font-serif text-gray-800 leading-[1.8] break-keep px-2 text-left space-y-8">
                 <div className="space-y-4"><p className="font-bold text-blue-500 mb-2 underline decoration-blue-200 underline-offset-4">[시편 23편]</p><p>1 여호와는 나의 목자시니 내게 부족함이 없으리로다</p><p>2 그가 나를 푸른 풀밭에 누이시며 쉴 만한 물가로 인도하시는도다</p><p>3 내 영혼을 소생시키시고 자기 이름을 위하여 의의 길로 인도하시는도다</p><p>4 내가 사망의 음침한 골짜기로 다닐지라도 해를 두려워하지 않을 것은 주께서 나와 함께 하심이라 주의 지팡이와 막대기가 나를 안위하시나이다</p><p>5 주께서 내 원수의 목전에서 내게 상을 차려 주시고 기름을 내 머리에 부으셨으니 내 잔이 넘치나이다</p><p>6 내 평생에 선하심과 인자하심이 반드시 나를 따르리니 내가 여호와의 집에 영원히 살리로다</p></div>
                 <div className="space-y-4"><p className="font-bold text-blue-500 mb-2 underline decoration-blue-200 underline-offset-4">[시편 24편]</p><p>1 땅과 거기에 충만한 것과 세계와 그 가운데에 사는 자들은 다 여호와의 것이로다</p><p>2 여호와께서 그 터를 바다 위에 세우심이여 강들 위에 건설하셨도다</p><p>3 여호와의 산에 오를 자가 누구며 그의 거룩한 곳에 설 자가 누구인가</p><p>4 곧 손이 깨끗하며 마음이 청결하며 뜻을 허탄한 데에 두지 아니하며 거짓 맹세하지 아니하는 자로다</p></div>
                 <div className="space-y-4"><p className="font-bold text-blue-500 mb-2 underline decoration-blue-200 underline-offset-4">[시편 25편]</p><p>1 여호와여 나의 영혼이 주를 우러러보나이다</p><p>2 나의 하나님이여 내가 주께 의지하였사오니 나를 부끄럽지 않게 하시고 나의 원수들이 나를 이겨 개가를 부르지 못하게 하소서</p><p>3 주를 바라는 자들은 수치를 당하지 아니려니와 까닭 없이 속이는 자들은 수치를 당하리이다</p></div>
                 <div className="space-y-4"><p className="font-bold text-blue-500 mb-2 underline decoration-blue-200 underline-offset-4">[시편 26편]</p><p>1 내가 나의 완전함에 행하였사오며 흔들리지 아니하고 여호와를 의지하였사오니 여호와여 나를 판단하소서</p><p>2 여호와여 나를 살피시고 시험하사 내 뜻과 내 양심을 단련하소서</p></div>
                 <div className="space-y-4"><p className="font-bold text-blue-500 mb-2 underline decoration-blue-200 underline-offset-4">[시편 27편]</p><p>1 여호와는 나의 빛이요 나의 구원이시니 내가 누구를 두려워하리요 여호와는 내 생명의 능력이시니 내가 누구를 무서워하리요</p><p>2 악인들이 내 살을 먹으려고 내게로 왔으나 나의 대적들, 나의 원수들인 그들은 실족하여 넘어졌도다</p><p>3 군대가 나를 대적하여 진 칠지라도 내 마음이 두렵지 아니하며 전쟁이 일어나 나를 치려 할지라도 나는 여전히 태연하리로다</p></div>
               </div>
               <p className="text-sm font-bold text-blue-400 mt-10 text-center">[시편 23-27편]</p>
            </div>

            <div className="flex justify-center gap-3 pt-4 border-t border-blue-100/50">
              <Button variant="ghost" size="sm" className={`gap-1.5 h-8 rounded-full ${isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400'}`} onClick={() => setIsFavorite(!isFavorite)}><Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} /><span className="text-[11px] font-bold">즐겨찾기</span></Button>
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 rounded-full text-gray-400" onClick={() => alert("복사되었습니다.")}><Copy className="w-4 h-4" /><span className="text-[11px] font-bold">복사</span></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400" onClick={handleShare}><Share2 className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-10">
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-gray-800" /><h3 className="font-bold text-gray-800">나의 묵상 기록</h3></div>
              <Button variant="ghost" size="sm" className="h-7 text-primary gap-1 font-bold" onClick={() => handleActionWithAuth("음성")}><Mic className="w-3.5 h-3.5" /><span className="text-[11px]">음성으로 등록</span></Button>
            </div>
            <Card className="border-none bg-gray-50 p-4 shadow-none space-y-4 rounded-3xl">
              <div className="relative overflow-hidden rounded-2xl cursor-pointer" onClick={() => handleActionWithAuth("기록")}>
                <Textarea placeholder="오늘의 은혜를 기록하세요..." className="min-h-[100px] bg-white border-none resize-none text-sm opacity-20 blur-[3px]" readOnly />
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10"><Lock className="w-5 h-5 text-gray-400 mb-1" /><span className="text-[10px] font-bold text-gray-500">로그인 후 작성 가능</span></div>
              </div>
              <div className="flex items-center gap-4 px-1">
                <div className="flex items-center gap-2"><Checkbox id="share-r" defaultChecked /><label htmlFor="share-r" className="text-[11px] font-bold text-gray-500">묵상기록 나누기</label></div>
                <div className="flex items-center gap-2"><Checkbox id="anon-r" /><label htmlFor="anon-r" className="text-[11px] font-bold text-gray-500">익명으로 나누기</label></div>
              </div>
              <Button className="w-full bg-primary/20 text-primary font-bold rounded-xl h-11" onClick={() => handleActionWithAuth("기록 저장")}>묵상 기록 저장하기</Button>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-gray-800" /><h3 className="font-bold text-gray-800">나의 묵상 기도</h3></div>
              <Button variant="ghost" size="sm" className="h-7 text-primary gap-1 font-bold" onClick={() => handleActionWithAuth("음성")}><Mic className="w-3.5 h-3.5" /><span className="text-[11px]">음성으로 등록</span></Button>
            </div>
            <Card className="border-none bg-gray-50 p-4 shadow-none space-y-4 rounded-3xl">
              <div className="relative overflow-hidden rounded-2xl cursor-pointer" onClick={() => handleActionWithAuth("기도")}>
                <Textarea placeholder="오늘의 기도를 기록하세요..." className="min-h-[100px] bg-white border-none resize-none text-sm opacity-20 blur-[3px]" readOnly />
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10"><Lock className="w-5 h-5 text-gray-400 mb-1" /><span className="text-[10px] font-bold text-gray-500">로그인 후 작성 가능</span></div>
              </div>
              <div className="flex items-center gap-4 px-1">
                <div className="flex items-center gap-2"><Checkbox id="share-p" defaultChecked /><label htmlFor="share-p" className="text-[11px] font-bold text-gray-500">묵상기도 나누기</label></div>
                <div className="flex items-center gap-2"><Checkbox id="anon-p" /><label htmlFor="anon-p" className="text-[11px] font-bold text-gray-500">익명으로 나누기</label></div>
              </div>
              <Button className="w-full bg-primary/20 text-primary font-bold rounded-xl h-11" onClick={() => handleActionWithAuth("기도 저장")}>묵상 기도 저장하기</Button>
            </Card>
          </section>
        </div>

        <section className="space-y-4 pb-10">
          <h3 className="font-bold text-gray-800 px-1">⛪ 성도님들의 묵상 나눔</h3>
          {sharingList.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex justify-start"><span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${item.type === "묵상 기록" ? "bg-primary/10 text-primary" : "bg-orange-50 text-orange-500"}`}>{item.type}</span></div>
              <p className="text-sm text-gray-700 leading-relaxed">{item.content}</p>
              <div className="flex justify-between items-end"><span className="text-xs font-bold text-primary">{item.userName || item.userNickname}</span><span className="text-[10px] text-gray-400 font-medium">{item.time}</span></div>
            </div>
          ))}
        </section>
      </main>

      {/* 로그인 팝업 */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white rounded-t-[40px] w-full max-w-md relative pt-12 pb-8 px-2 max-h-[85vh] overflow-y-auto">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-8 right-8 text-gray-400 p-4">✕</button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}