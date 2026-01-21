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

export default function QTPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { fontSize } = useDisplaySettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [showCopyToast, setShowCopyToast] = useState(false); 
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F'); // F: 여성, M: 남성

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | null>(null);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [meditation, setMeditation] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [meditationList, setMeditationList] = useState<any[]>([]);
  const [bibleData, setBibleData] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [isRecording, setIsRecording] = useState<'meditation' | 'prayer' | null>(null);
  const recognitionRef = useRef<any>(null);

  // 1. 절 분할 로직 (가로 정렬 보장형)
  const getVerses = () => {
    if (!bibleData || !bibleData.content) return [];
    const rawText = bibleData.content.replace(/\r?\n|\r/g, " ").trim();
    const parts = rawText.split(/(\d+\.)/g).filter(p => p.trim() !== "");
    const result = [];
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i+1]) {
        result.push({ num: parts[i].trim(), text: parts[i+1].trim() });
      } else {
        result.push({ num: "", text: parts[i].trim() });
      }
    }
    return result;
  };

    // 성별(voiceType)이 바뀔 때 재생 중이면 즉시 다시 재생하는 감시자
  useEffect(() => {
    if (showAudioControl && isPlaying) {
      handlePlayAudio();
    }
  }, [voiceType]);

  // 날짜 변경 시 말씀 데이터 불러오기
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

    const { data: verse, error: verseError } = await supabase
      .from('daily_qt_verses')
      .select('*')
      .eq('display_date', formattedDate)
      .maybeSingle();

    if (verseError) {
      console.error("QT 말씀 불러오기 에러:", verseError);
      return;
    }

    if (verse) {
      const { data: book } = await supabase
        .from('bible_books')
        .select('book_order')
        .eq('book_name', verse.bible_name)
        .maybeSingle();

      setBibleData({ ...verse, bible_books: book }); // <- 에러가 났던 지점
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
    if (!error) { setMeditation(""); setPrayer(""); setIsAnonymous(false); fetchMeditationPosts(); }
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

          const handlePlayAudio = async () => {
    if (!bibleData) return;
    
    // 현재 재생 중인 위치(초)를 기억 (이어듣기용)
    const lastTime = audioRef.current ? audioRef.current.currentTime : 0;

    // 기존 오디오 중단 및 초기화
    if (audioRef.current) {
       audioRef.current.pause();
       audioRef.current = null;
    }

    let bookOrder = '0';
    if (bibleData.bible_books) {
      bookOrder = Array.isArray(bibleData.bible_books) 
        ? bibleData.bible_books[0]?.book_order?.toString() || '0'
        : (bibleData.bible_books as any).book_order?.toString() || '0';
    }

    const chapter = bibleData.chapter;
    const verse = bibleData.verse.replace(/:/g, '_');
    
    // 성별 구분자(_F, _M) 포함 파일명
    const fileName = `qt_b${bookOrder}_c${chapter}_v${verse}_${voiceType}.mp3`;
    const storagePath = `qt/${fileName}`; 

    const cleanText = bibleData.content.replace(/\d+\.\s+/g, "");
    const textToSpeak = `${cleanText}. ${bibleData.bible_name} ${chapter}장 ${bibleData.verse}절 말씀.`;

    try {
      const { data: existingFile } = supabase.storage
        .from('bible-assets')
        .getPublicUrl(storagePath);

      const checkRes = await fetch(existingFile.publicUrl, { method: 'HEAD' });

      if (checkRes.ok) {
        const savedAudio = new Audio(existingFile.publicUrl);
        savedAudio.currentTime = lastTime; // 이어듣기 적용
        setupAudioEvents(savedAudio); 
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_TTS_API_KEY;
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          input: { text: textToSpeak },
          voice: { 
            languageCode: "ko-KR", 
            name: voiceType === 'F' ? "ko-KR-Neural2-B" : "ko-KR-Neural2-C" 
          },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });

      const resData = await response.json();
      if (!resData.audioContent) return;

      const binary = atob(resData.audioContent);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
      const blob = new Blob([array], { type: 'audio/mp3' });

      await supabase.storage
        .from('bible-assets')
        .upload(storagePath, blob, { contentType: 'audio/mp3', upsert: true });

      const audio = new Audio(`data:audio/mp3;base64,${resData.audioContent}`);
      audio.currentTime = lastTime; // 이어듣기 적용
      setupAudioEvents(audio);
    } catch (error) {
      console.error("QT TTS 에러:", error);
    }
  };




  const setupAudioEvents = (audio: HTMLAudioElement) => {
    audioRef.current = audio;
    audio.ontimeupdate = () => {
      if (!audio.duration) return; // 이 부분 뒤에 ;이 없거나 문장이 안 끝나서 에러가 났었습니다.
      
      const currentTime = audio.currentTime;
      const duration = audio.duration;
      const vList = getVerses();
      
      const totalChars = vList.reduce((sum, v) => sum + v.text.length, 0);
      let accumulatedTime = 0;
      let currentIndex = 0;

      for (let i = 0; i < vList.length; i++) {
        const verseDuration = (vList[i].text.length / totalChars) * duration;
        accumulatedTime += verseDuration;
        if (currentTime <= accumulatedTime) {
          currentIndex = i;
          break;
        }
      }

      if (currentIndex !== currentSentenceIndex) {
        setCurrentSentenceIndex(currentIndex);
        sentenceRefs.current[currentIndex]?.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        });
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      audioRef.current = null;
      setCurrentSentenceIndex(null);
    };

    setShowAudioControl(true);
    setIsPlaying(true);
    audio.play();
  };



  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
    setShowAudioControl(false);
    setCurrentSentenceIndex(null);
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
          <div className="text-center relative">
  <h1 className="text-[#5D7BAF] font-bold" style={{ fontSize: `${fontSize + 3}px` }}>오늘의 묵상</h1>
  
  {/* 날짜 클릭 영역 */}
  <div 
    className="relative cursor-pointer group flex flex-col items-center" 
    onClick={() => (document.getElementById('date-picker') as any).showPicker()}
  >
    <p 
      className="text-sm text-gray-400 font-bold transition-all duration-200 group-hover:text-[#5D7BAF] group-active:scale-95 flex items-center justify-center gap-1"
      style={{ fontSize: `${fontSize - 4}px` }}
    >
      {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
      {` (${currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})`}
      <span className="text-[12px] opacity-50">▼</span>
    </p>

    {/* 숨겨진 달력 입력창 */}
    <input
      id="date-picker"
      type="date"
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      max={new Date().toISOString().split("T")[0]}
      value={currentDate.toISOString().split("T")[0]}
      onChange={(e) => {
        if (!e.target.value) return;
        setCurrentDate(new Date(e.target.value));
      }}
    />
  </div>
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
              <div className="text-white font-medium">
                {bibleData ? (
                  <div style={{ fontSize: `${fontSize}px` }}>
                    {getVerses().map((verse, idx) => (
  <motion.div
    key={idx}
    // 스크롤 기능은 유지하기 위해 ref는 남겨둡니다.
    ref={(el) => (sentenceRefs.current[idx] = el)}
    // 하이라이트 배경색(animate) 속성을 제거했습니다.
    transition={{ duration: 0.2 }}
    // grid 레이아웃과 간격은 그대로 유지하여 정렬을 보존합니다.
    className="grid grid-cols-[1.8rem_1fr] items-start mb-3 px-1 py-1"
  >
    {/* 절 숫자 영역 */}
    <span className="font-bold opacity-80 text-left">
      {verse.num}
    </span>
    {/* 본문 내용 영역 */}
    <span className="break-keep leading-relaxed pt-[1px]">
      {verse.text}
    </span>
  </motion.div>
))}

                  </div>
                ) : (
                  <div className="text-center py-10 opacity-70"><p>등록된 말씀이 없습니다.</p></div>
                )}
              </div>
            </div>
            {bibleData && (
              <div className="mt-8 pt-4 border-t border-white/20 flex justify-center">
                <p className="text-sm text-white/90 font-bold bg-white/10 text-center px-4 py-1 rounded-full">
                 {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="pt-0 pb-4 px-6">
          <div className="flex items-center justify-center gap-7 pt-1.5">
            <button onClick={handlePlayAudio} className="flex flex-row items-center gap-1.5 text-[#5D7BAF] font-bold">
              <Mic className="w-5 h-5" /><span style={{ fontSize: `${fontSize - 2}px` }}>음성으로 듣기</span>
            </button>
            <button onClick={() => setIsFavorite(!isFavorite)} className="flex flex-row items-center gap-1.5 text-gray-400 font-bold">
              <Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} /><span style={{ fontSize: `${fontSize - 2}px` }}>기록함</span>
            </button>
            <div className="relative flex flex-col items-center">
              <button onClick={handleCopyBibleText} className="flex flex-row items-center gap-1.5 text-gray-400 font-bold">
                <Copy className="w-5 h-5" /><span style={{ fontSize: `${fontSize - 2}px` }}>복사</span>
              </button>
              <AnimatePresence>
                {showCopyToast && (
                  <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 10 }} exit={{ opacity: 0, y: 0 }} className="absolute top-full mt-1 whitespace-nowrap z-[300] bg-gray-600/90 text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-bold">복사되었습니다</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => {
              if (!bibleData) return;
              const text = `[오늘의 묵상]\n${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}\n\n${bibleData.content}`;
              if (navigator.share) { navigator.share({ title: '오늘의 묵상', text: text, url: window.location.href }); }
              else { alert("공유하기를 지원하지 않는 브라우저입니다."); }
            }} className="flex flex-row items-center gap-1.5 text-gray-400 font-bold">
              <Share2 className="w-5 h-5" /><span style={{ fontSize: `${fontSize - 2}px` }}>공유</span>
            </button>
          </div>
        </div>

        <div className="mt-10 px-1">
          <div className="flex items-center gap-2 px-1">
            <PenLine className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>오늘의 묵상 나누기</h3>
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
                <span className="text-[12px] font-bold text-[#5D7BAF] ml-1">묵상 기록 📖 </span>
                <button onClick={() => toggleSpeechRecognition('meditation')} className={`text-[#5D7BAF] ${isRecording === 'meditation' ? 'animate-pulse' : ''}`}>
                  <Mic size={16} />
                </button>
              </div>
              <Textarea placeholder={`오늘 말씀에 대한 기록을 남겨보세요\n(음성 기록 가능)`} className="bg-white border-none resize-none min-h-[100px] p-4 text-gray-600 rounded-xl text-sm" value={meditation} onChange={(e) => setMeditation(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[#5D7BAF] ml-1">묵상 기도 🙏</span>
                <button onClick={() => toggleSpeechRecognition('prayer')} className={`text-[#5D7BAF] ${isRecording === 'prayer' ? 'animate-pulse' : ''}`}>
                  <Mic size={16} />
                </button>
              </div>
              <Textarea placeholder={`오늘 묵상에 대한 기도을 남겨보세요\n(음성 기록 가능)`} className="bg-white border-none resize-none min-h-[100px] p-4 text-gray-600 rounded-xl text-sm" value={prayer} onChange={(e) => setPrayer(e.target.value)} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={isAnonymous} onCheckedChange={(val) => setIsAnonymous(!!val)} />
                <span className="text-sm font-bold text-gray-500">익명으로 나누기</span>
              </label>
              <Button onClick={handleRegister} disabled={!meditation.trim() && !prayer.trim()} className="rounded-full px-8 bg-[#5D7BAF] font-bold">등록</Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 pb-20 pt-4 px-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>묵상 나눔 리스트</h3>
          </div>
          <AnimatePresence initial={false}>
            {meditationList.map((post) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-[#5D7BAF]">{post.user_nickname}</span>
                  {currentUserId === post.user_id && (
                    <button onClick={() => setDeleteId(post.id)} className="text-gray-300"><Trash2 size={16} /></button>
                  )}
                </div>
                <div className="space-y-3 text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {post.my_meditation && <p>📖  {post.my_meditation}</p>}
                  {post.my_prayer && <p>🙏  {post.my_prayer}</p>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

                  {/* 오디오 컨트롤러 */}
      <AnimatePresence>
        {showAudioControl && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }} 
            className="fixed bottom-6 left-4 right-4 z-[200]"
          >
            <div className="bg-[#5D7BAF] text-white p-4 rounded-2xl shadow-xl flex flex-col gap-3 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full animate-pulse"><Mic size={18}/></div>
                  <div>
                    <p className="text-[11px] font-bold opacity-90">말씀을 음성으로 재생중입니다...</p>
                    <div className="flex gap-2 mt-1">
  <button 
    onClick={() => setVoiceType('F')} 
    className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${voiceType === 'F' ? "bg-white text-[#5D7BAF] font-bold" : "border-white/40 text-white/70"}`}
  >여성 목소리</button>
  <button 
    onClick={() => setVoiceType('M')} 
    className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${voiceType === 'M' ? "bg-white text-[#5D7BAF] font-bold" : "border-white/40 text-white/70"}`}
  >남성 목소리</button>
</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleAudio}>
                    {isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={stopAudio}><X size={20}/></Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {deleteId !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-[280px] text-center"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">정말 삭제할까요?</h3>
              <p className="text-sm text-gray-500 mb-6">삭제된 내용은 복구할 수 없습니다.</p>
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
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 flex items-center justify-center z-[110] pointer-events-none">
            <div className="bg-gray-600/90 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2">
              <Trash2 className="text-white w-5 h-5" />
              <span>삭제되었습니다</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative p-6 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 z-[210]">✕</button>
              <AuthPage />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div> // 파일의 가장 마지막 div (전체 컨테이너 닫기)
  );
}
