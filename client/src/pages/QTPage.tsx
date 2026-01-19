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
  
  const [meditation, setMeditation] = useState("");
  const [isAnonMeditation, setIsAnonMeditation] = useState(false);
  const [prayer, setPrayer] = useState("");
  const [isAnonPrayer, setIsAnonPrayer] = useState(false);
  
  const [meditationList, setMeditationList] = useState<any[]>([]);
  const [bibleData, setBibleData] = useState<QTVerse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
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

  const handleShareBibleText = async () => {
    if (!bibleData) return;
    const shareText = `[오늘의 묵상]\n${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}\n\n${bibleData.content}`;
    if (navigator.share) {
      try { await navigator.share({ title: "오늘의 묵상", text: shareText }); } catch (err) { console.error(err); }
    } else {
      await navigator.clipboard.writeText(shareText);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    }
  };

  const handlePlayTTS = async () => {
    if (!bibleData) return;
    if (audio) { audio.play(); setIsPlaying(true); setShowAudioControl(true); return; }
    const pureContent = bibleData.content.replace(/\d+\.\s/g, "");
    const unit = bibleData.bible_name === "시편" ? "편" : "장";
    const textToSpeak = `${pureContent}. ${bibleData.bible_name} ${bibleData.chapter}${unit} ${bibleData.verse}절 말씀.`;
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
      const audioBlob = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      setAudio(audioBlob);
      setShowAudioControl(true);
      audioBlob.play();
      setIsPlaying(true);
      audioBlob.onended = () => { setIsPlaying(false); setShowAudioControl(false); setAudio(null); };
    } catch (error) { console.error(error); }
  };

  const stopAudio = () => {
    if (audio) { audio.pause(); audio.currentTime = 0; setIsPlaying(false); setShowAudioControl(false); setAudio(null); }
  };

  const toggleSpeechRecognition = (type: 'meditation' | 'prayer') => {
    if (isRecording) {
      if (recognitionRef.current) { recognitionRef.current.shouldStop = true; recognitionRef.current.stop(); }
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("지원하지 않는 브라우저입니다."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.onstart = () => { setIsRecording(type); recognition.shouldStop = false; };
    recognition.onend = () => { if (recognition.shouldStop === false) recognition.start(); else setIsRecording(null); };
    recognition.onresult = (event: any) => {
      let newText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) newText += event.results[i][0].transcript;
      }
      if (newText) {
        if (type === 'meditation') setMeditation(prev => (prev.trim() + " " + newText.trim()).trim());
        else setPrayer(prev => (prev.trim() + " " + newText.trim()).trim());
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

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

  // 등록 로직 수정: 인자 없이 상태값을 직접 참조하여 작동 보증
  const handleRegisterMeditation = async () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    if (!meditation.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const finalNickname = isAnonMeditation ? "익명" : (user?.user_metadata?.full_name || "성도");
    const { error } = await supabase.from('meditations').insert([{
      my_meditation: meditation,
      my_prayer: "",
      user_id: user?.id,
      user_nickname: finalNickname,
      is_anonymous: isAnonMeditation,
      verse: bibleData ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}` : ""
    }]);
    if (!error) { setMeditation(""); fetchMeditationPosts(); }
  };

  const handleRegisterPrayer = async () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    if (!prayer.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const finalNickname = isAnonPrayer ? "익명" : (user?.user_metadata?.full_name || "성도");
    const { error } = await supabase.from('meditations').insert([{
      my_meditation: "",
      my_prayer: prayer,
      user_id: user?.id,
      user_nickname: finalNickname,
      is_anonymous: isAnonPrayer,
      verse: bibleData ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}` : ""
    }]);
    if (!error) { setPrayer(""); fetchMeditationPosts(); }
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

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-0 space-y-3">
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
              <div className="mt-8 pt-4 border-t border-white/20 flex justify-center">
                <p className="text-sm text-white/90 font-bold bg-white/10 px-4 py-1 rounded-full">
                  {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="pt-0 pb-4 px-6">
          <div className="flex items-center justify-center gap-7 pt-1.5">
            <button onClick={handlePlayTTS} className="flex flex-row items-center gap-1.5 text-[#5D7BAF] font-bold">
              <Mic className="w-5 h-5" /><span style={{ fontSize: `${fontSize - 2}px` }}>음성으로 듣기</span>
            </button>
            <button onClick={() => setIsFavorite(!isFavorite)} className="flex flex-row items-center gap-1.5 text-gray-400 font-bold">
              <Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} /><span style={{ fontSize: `${fontSize - 2}px` }}>기록함</span>
            </button>
            <button onClick={() => { if(bibleData){ navigator.clipboard.writeText(bibleData.content); setShowCopyToast(true); setTimeout(()=>setShowCopyToast(false), 2000); }}} className="flex flex-row items-center gap-1.5 text-gray-400 font-bold">
              <Copy className="w-5 h-5" /><span style={{ fontSize: `${fontSize - 2}px` }}>복사</span>
            </button>
            <button onClick={handleShareBibleText} className="flex flex-row items-center gap-1.5 text-gray-400 font-bold">
              <Share2 className="w-5 h-5" /><span style={{ fontSize: `${fontSize - 2}px` }}>공유</span>
            </button>
          </div>
        </div>

        {/* 입력 섹션: DailyWordPage 디자인 완벽 적용 (bg-gray-100/50, rounded-2xl) */}
        <div className="space-y-6 px-1">
          {/* 묵상 기록 박스 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <PenLine className="w-5 h-5 text-[#5D7BAF]" />
              <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>나의 묵상 기록</h3>
            </div>
            <div className="relative bg-gray-100/50 rounded-2xl p-4 border border-gray-100">
              {!isAuthenticated && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-[0.5px] rounded-2xl space-y-3">
                  <Lock className="w-7 h-7 text-[#5D7BAF]" />
                  <Button size="sm" onClick={() => setShowLoginModal(true)}>로그인 후 작성하기</Button>
                </div>
              )}
              <Textarea 
                placeholder="오늘 말씀을 통해 느낀 점을 기록해보세요."
                className="bg-transparent border-none resize-none min-h-[100px] p-0 text-gray-600 focus-visible:ring-0"
                value={meditation}
                onChange={(e) => setMeditation(e.target.value)}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={isAnonMeditation} onCheckedChange={(val) => setIsAnonMeditation(!!val)} />
                    <span className="text-xs font-bold text-gray-400">익명</span>
                  </label>
                  <button onClick={() => toggleSpeechRecognition('meditation')} className={`flex items-center gap-1 ${isRecording === 'meditation' ? "text-primary animate-pulse" : "text-[#5D7BAF]"}`}>
                    <Mic className="w-4 h-4" />
                    <span className="text-xs font-bold">음성 입력</span>
                  </button>
                </div>
                <Button onClick={handleRegisterMeditation} disabled={!meditation.trim()} className="rounded-full px-5 h-8 font-bold bg-[#5D7BAF] text-xs">등록</Button>
              </div>
            </div>
          </div>

          {/* 묵상 기도 박스 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <MessageCircle className="w-5 h-5 text-[#5D7BAF]" />
              <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>나의 묵상 기도</h3>
            </div>
            <div className="relative bg-gray-100/50 rounded-2xl p-4 border border-gray-100">
              {!isAuthenticated && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-[0.5px] rounded-2xl space-y-3">
                  <Lock className="w-7 h-7 text-[#5D7BAF]" />
                  <Button size="sm" onClick={() => setShowLoginModal(true)}>로그인 후 작성하기</Button>
                </div>
              )}
              <Textarea 
                placeholder="주님께 드리는 기도를 적어보세요."
                className="bg-transparent border-none resize-none min-h-[100px] p-0 text-gray-600 focus-visible:ring-0"
                value={prayer}
                onChange={(e) => setPrayer(e.target.value)}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={isAnonPrayer} onCheckedChange={(val) => setIsAnonPrayer(!!val)} />
                    <span className="text-xs font-bold text-gray-400">익명</span>
                  </label>
                  <button onClick={() => toggleSpeechRecognition('prayer')} className={`flex items-center gap-1 ${isRecording === 'prayer' ? "text-primary animate-pulse" : "text-[#5D7BAF]"}`}>
                    <Mic className="w-4 h-4" />
                    <span className="text-xs font-bold">음성 입력</span>
                  </button>
                </div>
                <Button onClick={handleRegisterPrayer} disabled={!prayer.trim()} className="rounded-full px-5 h-8 font-bold bg-[#5D7BAF] text-xs">등록</Button>
              </div>
            </div>
          </div>
        </div>

        {/* 묵상 목록 */}
        <div className="space-y-4 pb-20 pt-6">
          <div className="flex items-center gap-2 px-1">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[#5D7BAF]">성도님들의 묵상 나눔</h3>
          </div>
          {meditationList.map((post) => (
            <div key={post.id} className="bg-white border border-gray-150 rounded-sm p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize}px` }}>{post.user_nickname}</p>
                  <p className="text-[11px] text-gray-400 font-bold">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {post.my_meditation && <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-3" style={{ fontSize: `${fontSize}px` }}>{post.my_meditation}</p>}
              {post.my_prayer && (
                <div className="bg-gray-50 p-3 rounded-sm border-l-2 border-[#5D7BAF]">
                  <p className="text-[13px] text-[#5D7BAF] italic font-medium">🙏 {post.my_prayer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {showAudioControl && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 bg-[#5D7BAF] text-white p-4 z-[150] rounded-t-2xl shadow-2xl">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse"><Mic className="w-5 h-5" /></div>
                <div><p className="text-xs opacity-70">오늘의 묵상 낭독</p><p className="text-sm font-bold">말씀을 듣고 있습니다...</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => { if(isPlaying){ audio?.pause(); setIsPlaying(false); } else { audio?.play(); setIsPlaying(true); } }}>
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={stopAudio}><X className="w-6 h-6" /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-sm p-6 relative">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
              <AuthPage />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCopyToast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-24 left-0 right-0 flex justify-center z-[110]">
            <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-400" />
              <span>클립보드에 복사되었습니다</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
