import { useState, useEffect, useRef } from "react"; 
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Share2, Star, MessageCircle, ChevronLeft, ChevronRight, Copy, Lock,
  Mic, Trash2, CheckCircle2, PenLine, Pause, Play, X
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
  const { fontSize } = useDisplaySettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [showCopyToast, setShowCopyToast] = useState(false); // 복사 알림용

  const [meditation, setMeditation] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [meditationList, setMeditationList] = useState<any[]>([]);
  const [bibleData, setBibleData] = useState<QTVerse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  
  // 수정 포인트 1: 오디오 객체를 useRef로 관리하여 백화 현상 해결
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [isRecording, setIsRecording] = useState<'meditation' | 'prayer' | null>(null);
  const recognitionRef = useRef<any>(null);

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
    const { data } = await supabase.from('daily_qt_verses').select('*').eq('display_date', formattedDate).maybeSingle();
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
      setIsAnonymous(false);
      fetchMeditationPosts();
    }
  };
  const handleCopyBibleText = async () => {
    if (!bibleData) return;
    const textToCopy = `[오늘의 묵상]\n\n${bibleData.content}\n\n- ${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}`;
    await navigator.clipboard.writeText(textToCopy);
    
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000); 
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('meditations').delete().eq('id', id);
    if (!error) {
      setMeditationList(prev => prev.filter(item => item.id !== id));
      setShowDeleteToast(true);
      setTimeout(() => setShowDeleteToast(false), 2000);
    }
  };

  // 수정 포인트 2: 구글 Neural2-B 음성 적용 및 재생 로직
  const handlePlayAudio = async () => {
    if (!bibleData) return;
    
    if (audioRef.current) {
      setShowAudioControl(true);
      return;
    }

    const cleanText = bibleData.content.replace(/\d+\.\s+/g, "");
    const textToSpeak = `${cleanText}. ${bibleData.bible_name} ${bibleData.chapter}장 ${bibleData.verse}절 말씀.`;
    
    const apiKey = "AIzaSyA3hMflCVeq84eovVNuB55jHCUDoQVVGnw";
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          input: { text: textToSpeak },
          voice: { languageCode: "ko-KR", name: "ko-KR-Neural2-B" },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });

      const data = await response.json();
      
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audioRef.current = audio;
        
        setShowAudioControl(true);
        setIsPlaying(true);
        audio.play().catch(e => console.error("재생 에러:", e));

        audio.onended = () => {
          setIsPlaying(false);
          setShowAudioControl(false);
          audioRef.current = null;
        };
      }
    } catch (error) {
      console.error("TTS 에러:", error);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error("재생 에러:", e));
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setShowAudioControl(false);
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

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-10 space-y-3">
        <Card className="border-none bg-[#5D7BAF] shadow-none overflow-hidden rounded-sm">
          <CardContent className="pt-8 pb-5 px-6">
            <div className="max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-white font-medium space-y-4">
                {bibleData ? (
                  bibleData.content.split('\n').map((line, index) => {
                    const trimmedLine = line.trim();
                    const match = trimmedLine.match(/^(\d+\.\s)(.*)/);
                    if (match) {
                      const [_, verseNum, verseText] = match;
                      return (
                        <div key={index} className="flex items-start text-left" style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}>
                          <span className="shrink-0 opacity-80 mr-1.5 w-[1.5em]">{verseNum}</span>
                          <span className="break-keep">{verseText}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={index} className="pl-[1.5em] break-keep" style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}>{trimmedLine}</p>
                    );
                  })
                ) : (
                  <p className="text-white text-center py-10 opacity-70">등록된 묵상 말씀이 없습니다.</p>
                )}
              </div>
            </div>
            {bibleData && (
              <div className="mt-8 pt-4 border-t border-white/20 flex justify-end">
                <p className="text-sm text-white/90 font-bold bg-white/10 px-4 py-1 rounded-full">
                  • {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse} •
                </p>
              </div>
            )}
          </CardContent>
        </Card>

                {/* 도구함 */}
        <div className="pt-0 pb-4 px-6">
          <div className="flex items-center justify-center gap-7 pt-1.5">
            {/* 음성으로 듣기 */}
            <button onClick={handlePlayAudio} className="flex flex-row items-center gap-1.5 text-[#5D7BAF] font-bold">
              <Mic className="w-5 h-5" /><span style={{ fontSize: `${fontSize - 2}px` }}>음성으로 듣기</span>
            </button>
            
            {/* 기록함 (기존 기능 유지) */}
            <button onClick={() => setIsFavorite(!isFavorite)} className="flex flex-row items-center gap-1.5 text-gray-400 font-bold">
              <Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} /><span style={{ fontSize: `${fontSize - 2}px` }}>기록함</span>
            </button>
            
                                    {/* 복사하기 버튼 + 버튼 바로 아래 팝업 */}
<div className="relative flex flex-col items-center">
  <button 
    onClick={handleCopyBibleText} 
    className="flex flex-row items-center gap-1.5 text-gray-400 font-bold"
  >
    <Copy className="w-5 h-5" />
    <span style={{ fontSize: `${fontSize - 2}px` }}>복사</span>
  </button>

  <AnimatePresence>
    {showCopyToast && (
      <motion.div 
        initial={{ opacity: 0, y: 0 }} 
        animate={{ opacity: 1, y: 10 }} // 버튼에서 10px 아래로 등장
        exit={{ opacity: 0, y: 0 }} 
        className="absolute top-full mt-1 whitespace-nowrap z-[300] bg-gray-600/90 text-white px-3 py-3 rounded-lg flex items-center gap-2 shadow-lg"
      >
        {/* Lucide의 CheckCircle2 아이콘이 import 되어 있어야 합니다 */}
        <CheckCircle2 className="w-5 h-5 text-green-400" />
        <span className="text-[14px] font-bold" style={{ fontSize: `${fontSize - 2}px`}}>
          복사되었습니다
        </span>
      </motion.div>
    )}
  </AnimatePresence>
</div>



            
            {/* 공유 버튼: 브라우저 공유 기능 호출 */}
            <button 
              onClick={() => {
                if (!bibleData) return;
                const text = `[오늘의 묵상]\n${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}\n\n${bibleData.content}`;
                if (navigator.share) {
                  navigator.share({ title: '오늘의 묵상', text: text, url: window.location.href });
                } else {
                  alert("공유하기를 지원하지 않는 브라우저입니다.");
                }
              }} 
              className="flex flex-row items-center gap-1.5 text-gray-400 font-bold"
            >
              <Share2 className="w-5 h-5" /><span style={{ fontSize: `${fontSize - 2}px` }}>공유</span>
            </button>
          </div>
        </div>


        <div className="space-y-4 px-1">
          <div className="flex items-center gap-2 px-1">
            <PenLine className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>나의 묵상 나눔</h3>
          </div>
          
          <div className="relative bg-gray-100/50 rounded-2xl p-5 border border-gray-100 space-y-4">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-[0.5px] rounded-2xl space-y-3">
                <Lock className="w-7 h-7 text-[#5D7BAF]" />
                <Button size="lg" onClick={() => setShowLoginModal(true)}>로그인 후 작성하기</Button>
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[#5D7BAF] ml-1">묵상 기록</span>
                <button onClick={() => toggleSpeechRecognition('meditation')} className={`text-[#5D7BAF] ${isRecording === 'meditation' ? 'animate-pulse' : ''}`}>
                  <Mic size={16} />
                </button>
              </div>
              <Textarea 
                placeholder="오늘 묵상을 통해 느낀 점을 남겨보세요"
                className="bg-white border-none resize-none min-h-[100px] p-4 text-gray-600 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[#5D7BAF]"
                value={meditation}
                onChange={(e) => setMeditation(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[#5D7BAF] ml-1">묵상 기도</span>
                <button onClick={() => toggleSpeechRecognition('prayer')} className={`text-[#5D7BAF] ${isRecording === 'prayer' ? 'animate-pulse' : ''}`}>
                  <Mic size={16} />
                </button>
              </div>
              <Textarea 
                placeholder="오늘 묵상에 대한 기도를 남겨보세요"
                className="bg-white border-none resize-none min-h-[100px] p-4 text-gray-600 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[#5D7BAF]"
                value={prayer}
                onChange={(e) => setPrayer(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <Checkbox checked={isAnonymous} onCheckedChange={(val) => setIsAnonymous(!!val)} className="rounded-md border-gray-300" />
                <span className="text-sm font-bold text-gray-500">익명으로 나눔</span>
              </label>
              <Button onClick={handleRegister} disabled={!meditation.trim() && !prayer.trim()} className="rounded-full px-8 h-10 font-bold bg-[#5D7BAF] hover:bg-[#4A638F] shadow-md transition-all">등록</Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 pb-20 pt-4 px-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>성도님들의 묵상 나눔</h3>
          </div>
          
          <AnimatePresence initial={false}>
            {meditationList.map((post) => (
              <motion.div 
                key={post.id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize}px` }}>
                      {post.user_nickname}
                    </span>
                    <span className="text-gray-300 font-medium" style={{ fontSize: `${fontSize - 2}px`, paddingTop: '2px' }}>
                      {new Date(post.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '')}
                      {" | "}
                      {new Date(post.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>
                  {currentUserId === post.user_id && (
                    <button onClick={() => setDeleteId(post.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {(post.my_meditation?.trim() && post.my_prayer?.trim()) ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50/80 rounded-xl p-4">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>
                          📖 묵상 기록: {post.my_meditation}
                        </p>
                      </div>
                      <div className="bg-gray-50/80 rounded-xl p-4">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>
                          🙏 묵상 기도: {post.my_prayer}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.my_meditation?.trim() && (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap px-1" style={{ fontSize: `${fontSize}px` }}>
                          📖 묵상 기록: {post.my_meditation}
                        </p>
                      )}
                      {post.my_prayer?.trim() && (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap px-1" style={{ fontSize: `${fontSize}px` }}>
                          🙏 묵상 기도: {post.my_prayer}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showAudioControl && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-4 right-4 z-[250] max-w-md mx-auto"
          >
            <div className="bg-[#5D7BAF] text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full animate-pulse">
                  <Mic size={20} />
                </div>
                <div>
                  <p className="font-bold" style={{ fontSize: `${fontSize - 2}px` }}>말씀을 음성으로 읽고 있습니다../p>
                  <p className="opacity-70" style={{ fontSize: `${fontSize - 4}px` }}>오늘의 묵상 말씀</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleAudio}>
                  {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={stopAudio}>
                  <X size={22} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[24px] w-full max-w-[280px] p-6 shadow-2xl">
              <h4 className="text-center font-bold text-gray-900 mb-2">나눔 삭제</h4>
              <p className="text-center text-sm text-gray-500 mb-6">작성하신 기록을 삭제하시겠습니까?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">취소</button>
                <button onClick={() => { handleDelete(deleteId); setDeleteId(null); }} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">삭제하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteToast && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 left-0 right-0 flex items-center justify-center z-[310] pointer-events-none">
            <div className="bg-gray-800/90 text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2">
              <Trash2 size={16} className="text-red-400" /> <span>삭제되었습니다</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
