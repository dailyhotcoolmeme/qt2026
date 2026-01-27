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

  // 오디오 상태 (DailyWordPage 기능 대응용)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);

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

    setBibleData(verse || null);
  };

  const fetchMeditationPosts = async () => {
    const startOfDay = new Date(currentDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate); endOfDay.setHours(23, 59, 59, 999);
    const { data } = await supabase.from('meditations').select('*')
      .gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });
    setMeditationList(data || []);
  };

  // 날짜 변경 (스와이프 로직)
  const changeDate = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + offset);
    if (newDate > today) {
      alert("오늘 이후의 말씀은 미리 볼 수 없습니다.");
      return;
    }
    setCurrentDate(newDate);
  };

  const handleRegister = async () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    if (!meditation.trim() && !prayer.trim()) { alert("내용을 입력해주세요."); return; }
    
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
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] overflow-x-hidden pt-24 pb-32 no-scrollbar">
      
      {/* 1. 날짜 헤더 (DailyWord 스타일) */}
      <header className="text-center mb-10 flex flex-col items-center relative z-20">
        <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.3}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button onClick={() => dateInputRef.current?.showPicker()} className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-90 transition-transform">
            <CalendarIcon size={18} strokeWidth={2.5} />
          </button>
          <input type="date" ref={dateInputRef} onChange={(e) => setCurrentDate(new Date(e.target.value))} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      {/* 2. 말씀 카드 + 스와이프 힌트 카드 영역 */}
      <div className="relative w-full flex justify-center items-center overflow-visible mb-12">
        {/* 왼쪽 힌트 카드 */}
        <div className="absolute -left-[82%] w-[85%] max-w-md bg-white/40 rounded-[32px] p-8 blur-[1.5px] scale-90 select-none pointer-events-none border border-white/50" />

        {/* 메인 말씀 카드 */}
        <motion.div 
          key={currentDate.toISOString()}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 100) changeDate(-1);
            else if (info.offset.x < -100) changeDate(1);
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-[90%] max-w-md bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-white p-8 relative z-10 cursor-grab active:cursor-grabbing"
        >
          <div className="max-h-[350px] overflow-y-auto no-scrollbar mb-6">
            {bibleData ? (
              <div className="space-y-5 text-zinc-800 leading-[1.75] break-keep" style={{ fontSize: `${fontSize}px` }}>
                {bibleData.content.split('\n').map((line: string, i: number) => (
                  <p key={i} className="font-medium">{line}</p>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-zinc-300 font-bold" style={{ fontSize: `${fontSize}px` }}>등록된 말씀이 없습니다.</p>
              </div>
            )}
          </div>
          {bibleData && (
            <div className="text-center pt-5 border-t border-zinc-50">
              <span className="font-bold text-[#4A6741] opacity-50 italic" style={{ fontSize: `${fontSize * 0.9}px` }}>
                {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}
              </span>
            </div>
          )}
        </motion.div>

        {/* 오른쪽 힌트 카드 */}
        <div className="absolute -right-[82%] w-[85%] max-w-md bg-white/40 rounded-[32px] p-8 blur-[1.5px] scale-90 select-none pointer-events-none border border-white/50" />
      </div>

      {/* 3. 툴바 (DailyWordPage 디자인 복제) */}
      <div className="flex items-center justify-center gap-10 mb-20 relative z-20">
        <button className="flex flex-col items-center gap-2 text-zinc-400 hover:text-[#4A6741] transition-all active:scale-90">
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
            <Heart size={24} strokeWidth={1.5} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
          </div>
          <span className="font-bold" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span>
        </button>

        <button 
          onClick={() => {
            if(!bibleData) return;
            navigator.clipboard.writeText(bibleData.content);
            alert("복사되었습니다.");
          }}
          className="flex flex-col items-center gap-2 text-zinc-400 hover:text-[#4A6741] transition-all active:scale-90"
        >
          <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center border border-zinc-50">
            <Copy size={24} strokeWidth={1.5} />
          </div>
          <span className="font-bold" style={{ fontSize: `${fontSize * 0.75}px` }}>복사</span>
        </button>
      </div>

      {/* 4. 묵상 나눔 리스트 (공간 확보 mt-16) */}
      <div className="w-full max-w-md space-y-5 mt-16 px-4 relative z-20">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-1.5 h-6 bg-[#4A6741] rounded-full" />
          <h3 className="font-black text-zinc-800" style={{ fontSize: `${fontSize * 1.15}px` }}>
            오늘의 묵상 나눔
          </h3>
        </div>
        
        {meditationList.length > 0 ? meditationList.map((post) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            key={post.id} className="bg-white rounded-[28px] p-6 shadow-sm border border-zinc-100/50"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 0.9}px` }}>{post.user_nickname}</span>
              <span className="text-[11px] font-bold text-zinc-300 bg-zinc-50 px-2 py-1 rounded-lg">
                {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="space-y-4 text-zinc-600 font-medium leading-relaxed" style={{ fontSize: `${fontSize * 0.95}px` }}>
              {post.my_meditation && (
                <div className="flex gap-3">
                  <span className="shrink-0 text-[#4A6741]">📖</span>
                  <p className="break-all">{post.my_meditation}</p>
                </div>
              )}
              {post.my_prayer && (
                <div className="flex gap-3">
                  <span className="shrink-0 text-[#4A6741]">🙏</span>
                  <p className="break-all">{post.my_prayer}</p>
                </div>
              )}
            </div>
          </motion.div>
        )) : (
          <div className="py-24 text-center">
            <p className="text-zinc-300 font-bold" style={{ fontSize: `${fontSize * 0.95}px` }}>첫 번째 묵상을 남겨주세요!</p>
          </div>
        )}
      </div>

      {/* 5. 플로팅 버튼 (작성 팝업 트리거) */}
      <button 
        onClick={() => isAuthenticated ? setShowWriteModal(true) : setShowLoginModal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-[#4A6741] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* 6. 작성 팝업 모달 (잘림 방지 및 폰트 연동) */}
      <AnimatePresence>
        {showWriteModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setShowWriteModal(false)} 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-md rounded-t-[40px] shadow-2xl overflow-hidden"
              style={{ maxHeight: '94vh' }}
            >
              {/* 스크롤 가능한 내부 컨테이너 (pb-32로 하단 여백 확보) */}
              <div className="overflow-y-auto px-10 pt-12 pb-32 no-scrollbar" style={{ maxHeight: '94vh' }}>
                <div className="flex justify-between items-center mb-10">
                  <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.4}px` }}>오늘의 묵상 기록</h3>
                  <button onClick={() => setShowWriteModal(false)} className="p-2.5 bg-zinc-100 rounded-full text-zinc-400 active:scale-90 transition-transform">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="block font-black text-[#4A6741] ml-1" style={{ fontSize: `${fontSize * 0.9}px` }}>나의 묵상 📖</label>
                    <textarea 
                      value={meditation} onChange={(e) => setMeditation(e.target.value)} 
                      style={{ fontSize: `${fontSize}px` }} 
                      className="w-full h-48 bg-zinc-50 rounded-[32px] p-6 focus:outline-none focus:ring-2 focus:ring-[#4A6741]/10 border-none resize-none font-medium leading-relaxed" 
                      placeholder="말씀을 통해 주신 마음을 적어주세요." 
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block font-black text-[#4A6741] ml-1" style={{ fontSize: `${fontSize * 0.9}px` }}>나의 기도 🙏</label>
                    <textarea 
                      value={prayer} onChange={(e) => setPrayer(e.target.value)} 
                      style={{ fontSize: `${fontSize}px` }} 
                      className="w-full h-48 bg-zinc-50 rounded-[32px] p-6 focus:outline-none focus:ring-2 focus:ring-[#4A6741]/10 border-none resize-none font-medium leading-relaxed" 
                      placeholder="주님께 드리는 짧은 기도를 남겨주세요." 
                    />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <button type="button" onClick={() => setIsAnonymous(!isAnonymous)} className="flex items-center gap-3 active:opacity-70">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isAnonymous ? 'bg-[#4A6741]' : 'border-2 border-zinc-200'}`}>
                        {isAnonymous && <CheckCircle2 size={16} className="text-white" />}
                      </div>
                      <span className="font-bold text-zinc-400" style={{ fontSize: `${fontSize * 0.9}px` }}>익명으로 나누기</span>
                    </button>
                  </div>

                  {/* 등록 버튼 (잘림 방지 여백 안쪽 배치) */}
                  <button 
                    onClick={handleRegister} 
                    className="w-full h-[76px] bg-[#4A6741] text-white rounded-[24px] font-black shadow-xl active:scale-95 transition-all mb-4" 
                    style={{ fontSize: `${fontSize * 1.1}px` }}
                  >
                    나눔 등록하기
                  </button>
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] w-full max-w-sm p-10 relative shadow-2xl">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-8 right-8 text-zinc-300"><X /></button>
              <AuthPage />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}