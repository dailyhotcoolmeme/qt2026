import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  ChevronLeft, ChevronRight, MessageCircle, Star, Copy, Lock, 
  CheckCircle2, Mic, Trash2, Pause, Play, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthPage from "./AuthPage";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function QTPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const { fontSize } = useDisplaySettings();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userNickname, setUserNickname] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 입력 필드 상태
  const [meditation, setMeditation] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isAnonMeditation, setIsAnonMeditation] = useState(false);
  const [isAnonPrayer, setIsAnonPrayer] = useState(false);
  
  // 리스트 및 팝업 상태
  const [qtList, setQtList] = useState<any[]>([]);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 음성 재생 상태 (DailyWordPage 스타일)
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);

  useEffect(() => {
    checkUser();
    fetchQTPosts();
  }, [currentDate]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsAuthenticated(true);
      setCurrentUserId(session.user.id);
      setUserNickname(session.user.user_metadata?.nickname || "성도님");
    }
  };

  const fetchQTPosts = async () => {
    // 한국 시간 기준 날짜 처리
    const offset = currentDate.getTimezoneOffset() * 60000;
    const dateStr = new Date(currentDate.getTime() - offset).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("qt_posts")
      .select("*")
      .eq("target_date", dateStr)
      .order("created_at", { ascending: false });

    if (!error && data) setQtList(data);
  };

  const handleSaveQT = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (!meditation.trim() && !prayer.trim()) return;

    const offset = currentDate.getTimezoneOffset() * 60000;
    const dateStr = new Date(currentDate.getTime() - offset).toISOString().split('T')[0];

    const { error } = await supabase.from("qt_posts").insert({
      user_id: currentUserId,
      user_nickname: userNickname,
      meditation_content: meditation,
      prayer_content: prayer,
      is_meditation_anonymous: isAnonMeditation,
      is_prayer_sharing: isAnonPrayer,
      target_date: dateStr,
    });

    if (!error) {
      setMeditation("");
      setPrayer("");
      fetchQTPosts();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("qt_posts").delete().eq("id", id);
    if (!error) {
      setShowDeleteToast(true);
      setTimeout(() => setShowDeleteToast(false), 2000);
      fetchQTPosts();
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    if (newDate <= today) setCurrentDate(newDate);
  };

  const handlePlayAudio = () => {
    const text = document.getElementById("qt-verse-content")?.innerText;
    if (!text) return;

    if (!isPlaying) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.onstart = () => { setIsPlaying(true); setShowAudioControl(true); };
      utterance.onend = () => { setIsPlaying(false); setShowAudioControl(false); };
      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-bold" style={{ fontSize: `${fontSize + 2}px` }}>오늘의 묵상</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase">
              {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
          </div>
          <button onClick={() => changeDate(1)} disabled={currentDate >= today} className={`p-2 ${currentDate >= today ? "opacity-10" : ""}`}>
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-8 max-w-md mx-auto w-full">
        {/* 말씀 카드 */}
        <Card className="border-none bg-[#5D7BAF] rounded-[24px] shadow-none overflow-hidden">
          <CardContent className="p-8 text-white text-center leading-relaxed" id="qt-verse-content" style={{ fontSize: `${fontSize}px` }}>
            <p className="text-xs font-bold opacity-60 mb-3 tracking-widest">[오늘의 본문]</p>
            <p className="break-keep italic">"여호와는 나의 목자시니 내게 부족함이 없으리로다 그가 나를 푸른 풀밭에 누이시며 쉴 만한 물가로 인도하시는도다"</p>
          </CardContent>
        </Card>

        {/* 오디오/복사 버튼 */}
        <div className="flex items-center justify-center gap-8 py-2 relative">
          <button onClick={handlePlayAudio} className="flex flex-col items-center gap-1.5 group">
            <div className="p-2 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
              <Mic className="w-5 h-5 text-[#5D7BAF]" />
            </div>
            <span className="text-[#5D7BAF] text-[11px] font-bold text-center">음성 듣기</span>
          </button>
          
          <button onClick={() => { setShowCopyToast(true); setTimeout(() => setShowCopyToast(false), 2000); }} className="flex flex-col items-center gap-1.5 group">
            <div className="p-2 bg-gray-50 rounded-full group-hover:bg-gray-100 transition-colors">
              <Copy className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-gray-400 text-[11px] font-bold text-center">본문 복사</span>
          </button>

          <AnimatePresence>
            {showAudioControl && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute -top-12 bg-gray-800 text-white px-4 py-2 rounded-full flex items-center gap-3 shadow-xl z-[110]">
                <button onClick={handlePlayAudio}>{isPlaying ? <Pause size={16}/> : <Play size={16}/>}</button>
                <div className="w-[1px] h-3 bg-gray-600"/>
                <button onClick={() => { window.speechSynthesis.cancel(); setIsPlaying(false); setShowAudioControl(false); }}><X size={16}/></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 묵상 기록 입력 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <MessageCircle className="w-5 h-5 text-[#5D7BAF]" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize - 2}px` }}>나의 묵상 기록</h3>
          </div>
          <div className="relative bg-gray-50 rounded-[28px] p-6 border border-gray-100 shadow-inner">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-[28px] space-y-3">
                <Lock className="w-6 h-6 text-[#5D7BAF] opacity-40" />
                <Button variant="outline" size="sm" onClick={() => setShowLoginModal(true)} className="rounded-full border-[#5D7BAF] text-[#5D7BAF] font-bold">로그인 후 작성</Button>
              </div>
            )}
            <Textarea 
              placeholder="오늘 말씀에서 발견한 은혜는 무엇인가요?" 
              className="bg-transparent border-none focus-visible:ring-0 resize-none min-h-[120px] p-0 text-gray-700"
              style={{ fontSize: `${fontSize - 1}px` }}
              value={meditation} onChange={(e) => setMeditation(e.target.value)}
            />
            <div className="flex items-center justify-start mt-4 gap-2">
              <Checkbox id="anon-med" checked={isAnonMeditation} onCheckedChange={(v) => setIsAnonMeditation(!!v)} />
              <label htmlFor="anon-med" className="text-xs font-bold text-gray-400 cursor-pointer">익명으로 나누기</label>
            </div>
          </div>
        </section>

        {/* 묵상 기도 입력 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Star className="w-5 h-5 text-[#5D7BAF]" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize - 2}px` }}>나의 묵상 기도</h3>
          </div>
          <div className="bg-[#5D7BAF]/5 rounded-[28px] p-6 border border-[#5D7BAF]/10">
            <Textarea 
              placeholder="주님께 드리고 싶은 오늘의 기도문을 적어보세요." 
              className="bg-transparent border-none focus-visible:ring-0 resize-none min-h-[120px] p-0 text-gray-700 italic"
              style={{ fontSize: `${fontSize - 1}px` }}
              value={prayer} onChange={(e) => setPrayer(e.target.value)}
            />
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Checkbox id="share-pray" checked={isAnonPrayer} onCheckedChange={(v) => setIsAnonPrayer(!!v)} />
                <label htmlFor="share-pray" className="text-xs font-bold text-[#5D7BAF]/60 cursor-pointer">기도 나눔 포함</label>
              </div>
              <Button onClick={handleSaveQT} className="bg-[#5D7BAF] text-white rounded-full px-8 font-bold shadow-lg active:scale-95 transition-all">기록 완료</Button>
            </div>
          </div>
        </section>

        {/* 나눔 리스트 */}
        <section className="space-y-6 pt-4 pb-12">
          <h3 className="font-bold text-gray-800 px-1" style={{ fontSize: `${fontSize}px` }}>⛪ 성도님들의 나눔</h3>
          <div className="space-y-4">
            {qtList.map((item) => (
              <motion.div layout key={item.id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm relative group">
                {item.user_id === currentUserId && (
                  <button onClick={() => setDeleteId(item.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                )}
                {item.meditation_content && (
                  <div className="mb-4">
                    <span className="text-[9px] font-bold bg-[#5D7BAF]/10 text-[#5D7BAF] px-2 py-0.5 rounded-md mb-2 inline-block">MEDITATION</span>
                    <p className="text-gray-700 leading-relaxed" style={{ fontSize: `${fontSize - 2}px` }}>{item.meditation_content}</p>
                  </div>
                )}
                {item.is_prayer_sharing && item.prayer_content && (
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-100">
                    <span className="text-[9px] font-bold bg-orange-50 text-orange-500 px-2 py-0.5 rounded-md mb-2 inline-block">PRAYER</span>
                    <p className="text-gray-500 italic font-serif" style={{ fontSize: `${fontSize - 3}px` }}>"{item.prayer_content}"</p>
                  </div>
                )}
                <div className="flex justify-between items-end mt-4">
                  <span className="text-xs font-bold text-[#5D7BAF]">{item.is_meditation_anonymous ? "익명의 성도" : item.user_nickname}</span>
                  <span className="text-[10px] text-gray-300">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* 팝업 모달들 */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[32px] w-full max-w-xs text-center shadow-2xl">
              <p className="font-bold text-gray-800 mb-6 text-lg">기록을 삭제할까요?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold">취소</button>
                <button onClick={() => { handleDelete(deleteId); setDeleteId(null); }} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold">삭제</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCopyToast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-0 right-0 flex justify-center z-[110]">
            <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-400" />
              <span>클립보드에 복사되었습니다</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm relative shadow-2xl overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 text-gray-400"><X size={24}/></button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
