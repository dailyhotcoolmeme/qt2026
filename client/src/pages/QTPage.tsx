import React, { useState, useEffect, useRef } from "react";
import {
  Share2, Star, MessageCircle, ChevronLeft, ChevronRight, Copy, Lock,
  Mic, Trash2, CheckCircle2, PenLine, Pause, Play, X, Plus, Heart, Calendar as CalendarIcon,
  Headphones
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import AuthPage from "./AuthPage";

export default function QTPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { fontSize = 16 } = useDisplaySettings();

  // 상태 관리
  const [bibleData, setBibleData] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [meditationList, setMeditationList] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);

  // 작성 폼 상태
  const [meditation, setMeditation] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // 오디오 상태
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');

  useEffect(() => {
    fetchQTVerse();
    fetchMeditationPosts();
    checkAuth();
  }, [currentDate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setCurrentUserId(session?.user?.id || null);
  };

  const fetchQTVerse = async () => {
    const formattedDate = currentDate.toISOString().split('T')[0];
    const { data: verse } = await supabase
      .from('daily_qt_verses')
      .select('*')
      .eq('display_date', formattedDate)
      .maybeSingle();

    if (verse) {
      setBibleData(verse);
    } else {
      setBibleData(null);
    }
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
    const { data: { user } } = await supabase.auth.getUser();
    const finalNickname = isAnonymous ? "익명" : (user?.user_metadata?.full_name || "성도");
    
    const { error } = await supabase.from('meditations').insert([{
      my_meditation: meditation.trim(),
      my_prayer: prayer.trim(),
      user_id: user?.id,
      user_nickname: finalNickname,
      is_anonymous: isAnonymous,
      verse: bibleData ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}` : ""
    }]);

    if (!error) {
      setMeditation("");
      setPrayer("");
      setShowWriteModal(false);
      fetchMeditationPosts();
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] overflow-y-auto pt-24 pb-32 px-4 no-scrollbar">
      
      {/* 1. 날짜 헤더 */}
      <header className="text-center mb-10 flex flex-col items-center relative">
        <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.3}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button onClick={() => dateInputRef.current?.showPicker()} className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741]">
            <CalendarIcon size={18} strokeWidth={2.5} />
          </button>
          <input type="date" ref={dateInputRef} onChange={(e) => setCurrentDate(new Date(e.target.value))} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      {/* 2. 말씀 카드 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.04)] border border-white/50 p-8 mb-10"
      >
        <div className="max-h-[350px] overflow-y-auto no-scrollbar mb-6">
          {bibleData ? (
            <div className="space-y-5 text-zinc-800 leading-[1.7] break-keep" style={{ fontSize: `${fontSize}px` }}>
              {bibleData.content.split('\n').map((line: string, i: number) => (
                <p key={i} className="font-medium">{line}</p>
              ))}
            </div>
          ) : <p className="text-center py-10 text-zinc-300">오늘의 QT 말씀이 등록되지 않았습니다.</p>}
        </div>
        {bibleData && (
          <div className="text-center pt-5 border-t border-zinc-50">
            <span className="font-bold text-[#4A6741] opacity-50 italic" style={{ fontSize: `${fontSize * 0.9}px` }}>
              {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}
            </span>
          </div>
        )}
      </motion.div>

      {/* 3. 툴바 (DailyWordPage 스타일 그대로 적용) */}
      <div className="flex items-center justify-center gap-10 mb-16">
        <button 
          onClick={() => setShowAudioControl(true)}
          className="flex flex-col items-center gap-2 text-zinc-400 hover:text-[#4A6741] transition-all active:scale-90"
        >
          <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center border border-zinc-50">
            <Headphones size={24} strokeWidth={1.5} />
          </div>
          <span className="font-bold" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 듣기</span>
        </button>

        <button 
          onClick={() => setIsFavorite(!isFavorite)}
          className="flex flex-col items-center gap-2 text-zinc-400 hover:text-[#4A6741] transition-all active:scale-90"
        >
          <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center border border-zinc-50">
            <Heart 
              size={24} 
              strokeWidth={1.5} 
              className={isFavorite ? "fill-red-500 text-red-500" : ""} 
            />
          </div>
          <span className="font-bold" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span>
        </button>

        <button 
          onClick={() => {
            if(!bibleData) return;
            navigator.clipboard.writeText(`${bibleData.content}\n\n(${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse})`);
            alert("말씀이 복사되었습니다.");
          }}
          className="flex flex-col items-center gap-2 text-zinc-400 hover:text-[#4A6741] transition-all active:scale-90"
        >
          <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center border border-zinc-50">
            <Copy size={24} strokeWidth={1.5} />
          </div>
          <span className="font-bold" style={{ fontSize: `${fontSize * 0.75}px` }}>복사</span>
        </button>
      </div>

      {/* 4. 묵상 나눔 리스트 (상단 공간 확보 mt-16) */}
      <div className="w-full max-w-md space-y-5 mt-16">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-1 h-5 bg-[#4A6741] rounded-full" />
          <h3 className="font-black text-zinc-800" style={{ fontSize: `${fontSize * 1.1}px` }}>
            오늘의 묵상 나눔
          </h3>
        </div>
        
        {meditationList.length > 0 ? meditationList.map((post) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            key={post.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-zinc-100/50"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 0.9}px` }}>{post.user_nickname}</span>
              <span className="text-[11px] font-bold text-zinc-300 bg-zinc-50 px-2 py-1 rounded-md">
                {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="space-y-4 text-zinc-600 font-medium leading-relaxed" style={{ fontSize: `${fontSize * 0.9}px` }}>
              {post.my_meditation && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-[#4A6741]">📖</span>
                  <p className="break-all">{post.my_meditation}</p>
                </div>
              )}
              {post.my_prayer && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-[#4A6741]">🙏</span>
                  <p className="break-all">{post.my_prayer}</p>
                </div>
              )}
            </div>
          </motion.div>
        )) : (
          <div className="py-20 text-center">
            <p className="text-zinc-300 font-bold" style={{ fontSize: `${fontSize * 0.9}px` }}>아직 남겨진 묵상이 없습니다.<br/>첫 번째 묵상을 남겨보세요!</p>
          </div>
        )}
      </div>

      {/* 5. 플로팅 버튼 */}
      <button 
        onClick={() => isAuthenticated ? setShowWriteModal(true) : setShowLoginModal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-[#4A6741] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* 6. 작성 팝업 (버튼 잘림 방지 pb-20 및 글자 크기 연동) */}
      <AnimatePresence>
        {showWriteModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setShowWriteModal(false)} 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-md rounded-t-[40px] shadow-2xl overflow-hidden"
              style={{ maxHeight: '92vh' }}
            >
              {/* 스크롤 가능한 내부 영역 */}
              <div className="overflow-y-auto px-10 pt-12 pb-24 no-scrollbar" style={{ maxHeight: '92vh' }}>
                <div className="flex justify-between items-center mb-10">
                  <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.35}px` }}>
                    오늘의 묵상 기록
                  </h3>
                  <button onClick={() => setShowWriteModal(false)} className="p-2 bg-zinc-100 rounded-full text-zinc-400">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-10">
                  <div>
                    <label className="block font-black text-[#4A6741] mb-4 ml-1" style={{ fontSize: `${fontSize * 0.9}px` }}>나의 묵상 📖</label>
                    <textarea 
                      value={meditation} onChange={(e) => setMeditation(e.target.value)}
                      style={{ fontSize: `${fontSize * 1}px` }}
                      className="w-full h-44 bg-zinc-50 rounded-[28px] p-6 focus:outline-none focus:ring-2 focus:ring-[#4A6741]/10 border-none resize-none font-medium"
                      placeholder="말씀을 통해 주신 마음을 적어주세요."
                    />
                  </div>

                  <div>
                    <label className="block font-black text-[#4A6741] mb-4 ml-1" style={{ fontSize: `${fontSize * 0.9}px` }}>나의 기도 🙏</label>
                    <textarea 
                      value={prayer} onChange={(e) => setPrayer(e.target.value)}
                      style={{ fontSize: `${fontSize * 1}px` }}
                      className="w-full h-44 bg-zinc-50 rounded-[28px] p-6 focus:outline-none focus:ring-2 focus:ring-[#4A6741]/10 border-none resize-none font-medium"
                      placeholder="주님께 드리는 짧은 기도를 남겨주세요."
                    />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <button 
                      type="button" 
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className="flex items-center gap-3 group"
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isAnonymous ? 'bg-[#4A6741]' : 'border-2 border-zinc-200'}`}>
                        {isAnonymous && <CheckCircle2 size={16} className="text-white" />}
                      </div>
                      <span className="font-bold text-zinc-400" style={{ fontSize: `${fontSize * 0.9}px` }}>익명으로 올리기</span>
                    </button>
                  </div>

                  {/* 하단 버튼: 잘림 방지를 위해 하단 여백 내부에 배치 */}
                  <div className="pt-2">
                    <button 
                      onClick={handleRegister}
                      className="w-full h-[76px] bg-[#4A6741] text-white rounded-[24px] font-black shadow-xl active:scale-95 transition-all"
                      style={{ fontSize: `${fontSize * 1.1}px` }}
                    >
                      나눔 등록하기
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] w-full max-w-sm p-10 relative shadow-2xl">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-8 right-8 text-zinc-300"><X /></button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}