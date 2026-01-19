import { useState, useEffect, useRef } from "react"; 
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Share2, Star, MessageCircle, ChevronLeft, ChevronRight, Copy, Lock, CheckCircle2,
  Mic, Trash2, Pause, Play, X, PenLine
} from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";
import AuthPage from "./AuthPage";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

interface QTVerse {
  bible_name: string;
  chapter: string;
  verse: string;
  content: string;
}

export default function QTPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false); 
  const { fontSize } = useDisplaySettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  
  // 입력 필드 (한 세트)
  const [meditation, setMeditation] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [meditationList, setMeditationList] = useState<any[]>([]);
  const [bibleData, setBibleData] = useState<QTVerse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // 삭제 관련 상태 (DailyWordPage와 100% 동일)
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  
  const [isRecording, setIsRecording] = useState<'meditation' | 'prayer' | null>(null);
  const recognitionRef = useRef<any>(null);

  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);

  useEffect(() => {
    fetchQTVerse(currentDate);
    fetchMeditationPosts();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setCurrentUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setCurrentUserId(session?.user?.id || null);
      if (session) setShowLoginModal(false);
    });

    return () => { subscription.unsubscribe(); };
  }, [currentDate]);

  const fetchQTVerse = async (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    const formattedDate = localDate.toISOString().split('T')[0];
    const { data } = await supabase.from('meditations_table').select('*').eq('display_date', formattedDate).maybeSingle(); 
    // 위 테이블명은 환경에 따라 daily_qt_verses 등 기존 명칭으로 수정 가능합니다.
    setBibleData(data);
  };

  const fetchMeditationPosts = async () => {
    const startOfDay = new Date(currentDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate); endOfDay.setHours(23, 59, 59, 999);
    const { data } = await supabase.from('meditations').select('*')
      .gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });
    setMeditationList(data || []);
  };

  const handleRegister = async () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    if (!meditation.trim() && !prayer.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    const finalNickname = isAnonymous ? "익명" : (user?.user_metadata?.full_name || user?.user_metadata?.nickname || "성도");

    const { error } = await supabase.from('meditations').insert([{
      my_meditation: meditation,
      my_prayer: prayer,
      user_id: user?.id,
      user_nickname: finalNickname,
      is_anonymous: isAnonymous,
      verse: bibleData ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}` : ""
    }]);

    if (!error) {
      setMeditation("");
      setPrayer("");
      setIsAnonymous(false);
      fetchMeditationPosts();
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('meditations').delete().eq('id', id);
    if (!error) {
      setMeditationList(prev => prev.filter(item => item.id !== id));
      setShowDeleteToast(true);
      setTimeout(() => setShowDeleteToast(false), 2000);
    }
  };

  const toggleSpeechRecognition = (target: 'meditation' | 'prayer') => {
    if (isRecording) {
      if (recognitionRef.current) { recognitionRef.current.shouldStop = true; recognitionRef.current.stop(); }
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.onstart = () => { setIsRecording(target); recognition.shouldStop = false; };
    recognition.onend = () => { if (recognition.shouldStop === false) recognition.start(); else setIsRecording(null); };
    recognition.onresult = (event: any) => {
      let newText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) newText += event.results[i][0].transcript;
      }
      if (target === 'meditation') setMeditation(prev => (prev.trim() + " " + newText.trim()).trim());
      else setPrayer(prev => (prev.trim() + " " + newText.trim()).trim());
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate()-1); setCurrentDate(d);
          }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-bold text-center" style={{ fontSize: `${fontSize + 3}px` }}>오늘의 묵상</h1>
            <p className="text-sm text-gray-400 font-bold text-center">
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              {` (${currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() + 1);
            if (d <= today) setCurrentDate(d);
          }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-10 space-y-6">
        {/* 말씀 카드 섹션 (기존 디자인 유지) */}
        {bibleData && (
          <Card className="border-none bg-[#5D7BAF] shadow-none overflow-hidden rounded-sm">
            <CardContent className="pt-8 pb-5 px-6 text-white font-medium">
              <div className="max-h-[280px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {bibleData.content.split('\n').map((line, idx) => (
                  <p key={idx} style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }} className="break-keep opacity-90">{line}</p>
                ))}
              </div>
              <div className="mt-8 pt-4 border-t border-white/20 text-center">
                <span className="text-sm font-bold bg-white/10 px-4 py-1 rounded-full">
                  {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 입력 섹션: DailyWordPage와 100% 동일한 디자인 */}
        <div className="space-y-4 px-1">
          <div className="flex items-center gap-2 px-1">
            <PenLine className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>나의 묵상 나눔</h3>
          </div>
          
          <div className="relative bg-gray-100/50 rounded-2xl p-5 border border-gray-100 space-y-5">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-[0.5px] rounded-2xl space-y-3">
                <Lock className="w-7 h-7 text-[#5D7BAF]" />
                <Button size="lg" onClick={() => setShowLoginModal(true)}>로그인 후 작성하기</Button>
              </div>
            )}
            
            {/* 묵상 기록 입력창 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[#5D7BAF] ml-1">묵상 기록</span>
                <button onClick={() => toggleSpeechRecognition('meditation')} className={`text-[#5D7BAF] ${isRecording === 'meditation' ? 'animate-pulse' : ''}`}>
                  <Mic size={16} />
                </button>
              </div>
              <Textarea 
                placeholder="오늘 말씀을 통해 느낀 점을 기록해보세요."
                className="bg-white border-none resize-none min-h-[100px] p-4 text-gray-600 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[#5D7BAF]"
                value={meditation}
                onChange={(e) => setMeditation(e.target.value)}
              />
            </div>

            {/* 묵상 기도 입력창 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[#5D7BAF] ml-1">묵상 기도</span>
                <button onClick={() => toggleSpeechRecognition('prayer')} className={`text-[#5D7BAF] ${isRecording === 'prayer' ? 'animate-pulse' : ''}`}>
                  <Mic size={16} />
                </button>
              </div>
              <Textarea 
                placeholder="주님께 드리는 기도를 적어보세요."
                className="bg-white border-none resize-none min-h-[100px] p-4 text-gray-600 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[#5D7BAF]"
                value={prayer}
                onChange={(e) => setPrayer(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <Checkbox checked={isAnonymous} onCheckedChange={(val) => setIsAnonymous(!!val)} className="rounded-md border-gray-300 group-hover:border-[#5D7BAF]" />
                <span className="text-sm font-bold text-gray-500 group-hover:text-[#5D7BAF] transition-colors">익명으로 나눔</span>
              </label>
              <Button onClick={handleRegister} disabled={!meditation.trim() && !prayer.trim()} className="rounded-full px-8 h-10 font-bold bg-[#5D7BAF] hover:bg-[#4A638F] shadow-md transition-all">등록</Button>
            </div>
          </div>
        </div>

        {/* 하단 리스트: DailyWordPage와 디자인 및 기능 100% 동기화 */}
        <div className="space-y-4 pb-20">
          <div className="flex items-center gap-2 px-1 pt-4">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[#5D7BAF]">성도님들의 묵상 나눔</h3>
          </div>
          
          <AnimatePresence initial={false}>
            {meditationList.map((post) => (
              <motion.div 
                key={post.id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#5D7BAF]/10 rounded-full flex items-center justify-center text-[#5D7BAF] font-bold text-sm">
                      {post.user_nickname[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-[14px]">{post.user_nickname}</p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {new Date(post.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {currentUserId === post.user_id && (
                    <button onClick={() => setDeleteId(post.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {post.my_meditation && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-[#5D7BAF] opacity-60 ml-0.5 uppercase tracking-wider">[묵상 기록]</p>
                      <p className="text-gray-700 leading-relaxed text-[15px] whitespace-pre-wrap">{post.my_meditation}</p>
                    </div>
                  )}
                  {post.my_prayer && (
                    <div className="bg-gray-50/70 p-4 rounded-xl space-y-1 border border-gray-100">
                      <p className="text-[11px] font-bold text-[#5D7BAF] opacity-60 ml-0.5 uppercase tracking-wider">[묵상 기도]</p>
                      <p className="text-gray-600 text-[14px] italic leading-relaxed">🙏 {post.my_prayer}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* 삭제 확인 팝업 (DailyWordPage와 100% 동일) */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[24px] w-full max-w-[280px] p-6 shadow-2xl">
              <h4 className="text-center font-bold text-gray-900 mb-2">나눔 삭제</h4>
              <p className="text-center text-sm text-gray-500 mb-6">작성하신 묵상을 삭제하시겠습니까?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">취소</button>
                <button onClick={() => { handleDelete(deleteId); setDeleteId(null); }} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">삭제하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 삭제 완료 토스트 */}
      <AnimatePresence>
        {showDeleteToast && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 left-0 right-0 flex items-center justify-center z-[310] pointer-events-none">
            <div className="bg-gray-800/90 text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2">
              <Trash2 size={16} className="text-red-400" /> <span>삭제되었습니다</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-sm p-6 relative">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
              <AuthPage />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
