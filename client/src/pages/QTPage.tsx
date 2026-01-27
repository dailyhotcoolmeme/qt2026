import React, { useState, useEffect, useRef } from "react";
import {
  Share2, Star, MessageCircle, ChevronLeft, ChevronRight, Copy, Lock,
  Mic, Trash2, CheckCircle2, PenLine, Pause, Play, X, Plus, Heart, Calendar as CalendarIcon
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
  const [showWriteModal, setShowWriteModal] = useState(false); // 작성 팝업 제어

  // 작성 폼 상태
  const [meditation, setMeditation] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isRecording, setIsRecording] = useState<'meditation' | 'prayer' | null>(null);

  // 오디오/TTS 상태
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
      const { data: book } = await supabase
        .from('bible_books')
        .select('book_order')
        .eq('book_name', verse.bible_name)
        .maybeSingle();
      setBibleData({ ...verse, bible_books: book });
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

  // 디자인 컨셉 차용: DailyWordPage 스타일의 날짜 헤더
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F8F8F8] overflow-y-auto pt-24 pb-24 px-4">
      
      {/* 1. 날짜 헤더 (DailyWord 컨셉) */}
      <header className="text-center mb-6 flex flex-col items-center relative">
        <p className="font-bold text-[#4A6741] tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
          <button onClick={() => dateInputRef.current?.showPicker()} className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741]">
            <CalendarIcon size={18} strokeWidth={2.5} />
          </button>
          <input type="date" ref={dateInputRef} onChange={(e) => setCurrentDate(new Date(e.target.value))} className="absolute opacity-0 pointer-events-none" />
        </div>
      </header>

      {/* 2. 말씀 카드 (QTpage 형식 + DailyWord 디자인) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.05)] border border-white p-8 mb-8"
      >
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar mb-6">
          {bibleData ? (
            <div className="space-y-4 text-zinc-800 leading-relaxed break-keep" style={{ fontSize: `${fontSize}px` }}>
              {bibleData.content.split('\n').map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          ) : <p className="text-center py-10 text-zinc-300">오늘의 QT 말씀이 없습니다.</p>}
        </div>
        {bibleData && (
          <div className="text-center pt-4 border-t border-zinc-50">
            <span className="font-bold text-[#4A6741] opacity-60" style={{ fontSize: `${fontSize * 0.9}px` }}>
              {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}
            </span>
          </div>
        )}
      </motion.div>

      {/* 3. 툴바 (DailyWord 스타일) */}
      <div className="flex items-center gap-8 mb-12">
        <button className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Mic size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 듣기</span>
        </button>
        <button onClick={() => setIsFavorite(!isFavorite)} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Star size={22} strokeWidth={1.5} className={isFavorite ? "fill-yellow-400 text-yellow-400" : ""} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span>
        </button>
        <button onClick={() => {navigator.clipboard.writeText(bibleData?.content); alert("복사되었습니다.");}} className="flex flex-col items-center gap-1.5 text-zinc-400">
          <Copy size={22} strokeWidth={1.5} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>복사</span>
        </button>
      </div>

      {/* 4. 묵상 나눔 리스트 (DailyWord 카드 컨셉) */}
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-2 mb-2 px-2">
          <MessageCircle className="w-5 h-5 text-[#4A6741]" />
          <h3 className="font-bold text-zinc-800" style={{ fontSize: `${fontSize}px` }}>묵상 나눔 리스트</h3>
        </div>
        {meditationList.map((post) => (
          <motion.div key={post.id} className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-50">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-[#4A6741] text-sm">{post.user_nickname}</span>
              <span className="text-[10px] text-zinc-300">{new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="space-y-3 text-zinc-600 text-sm leading-relaxed">
              {post.my_meditation && <p>📖 {post.my_meditation}</p>}
              {post.my_prayer && <p>🙏 {post.my_prayer}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 5. 플로팅 버튼 (작성 팝업 트리거) */}
      <button 
        onClick={() => isAuthenticated ? setShowWriteModal(true) : setShowLoginModal(true)}
        className="fixed bottom-28 right-6 w-14 h-14 bg-[#4A6741] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <Plus size={28} />
      </button>

      {/* 6. 작성 팝업 모달 */}
      <AnimatePresence>
        {showWriteModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWriteModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-zinc-800">오늘의 묵상 나누기</h3>
                <button onClick={() => setShowWriteModal(false)} className="text-zinc-400"><X /></button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[#4A6741] mb-2 ml-1">묵상 기록 📖</label>
                  <textarea 
                    value={meditation} onChange={(e) => setMeditation(e.target.value)}
                    className="w-full h-32 bg-zinc-50 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20"
                    placeholder="오늘 말씀에서 깨달은 점을 기록해보세요."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A6741] mb-2 ml-1">묵상 기도 🙏</label>
                  <textarea 
                    value={prayer} onChange={(e) => setPrayer(e.target.value)}
                    className="w-full h-32 bg-zinc-50 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20"
                    placeholder="오늘의 기도를 남겨보세요."
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded text-[#4A6741]" />
                    <span className="text-sm font-bold text-zinc-400">익명으로 나누기</span>
                  </label>
                  <button 
                    onClick={handleRegister}
                    className="bg-[#4A6741] text-white px-8 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
                  >
                    등록하기
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white rounded-[32px] w-full max-w-sm p-8 relative">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 text-zinc-400">✕</button>
              <AuthPage />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}