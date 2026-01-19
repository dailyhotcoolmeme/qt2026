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
  
  // 묵상 기록용 상태 (DailyWord의 comment와 동일 구조)
  const [meditation, setMeditation] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [meditationList, setMeditationList] = useState<any[]>([]);
  const [bibleData, setBibleData] = useState<QTVerse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  
  // 음성 인식 관련
  const [isRecording, setIsRecording] = useState<'meditation' | 'prayer' | null>(null);
  const recognitionRef = useRef<any>(null);

  // 음성 재생 관련 (TTS)
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

  // --- TTS 로직 수정 (숫자 제거 후 읽기) ---
  const handlePlayTTS = async () => {
    if (!bibleData) return;
    if (audio) { setShowAudioControl(true); return; }

    // 정규표현식으로 "1. ", "12. " 등 숫자와 마침표 조합을 제거합니다.
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

  // --- 음성 인식 로직 ---
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

  // --- 데이터 페칭 ---
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

  const handleRegisterMeditation = async () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    if (!meditation.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.user_metadata;
    const finalNickname = isAnonymous ? "익명" : (meta?.full_name || meta?.nickname || "신실한 성도");

    const { error } = await supabase.from('meditations').insert([{
      my_meditation: meditation,
      my_prayer: prayer,
      user_id: user?.id,
      user_nickname: finalNickname,
      is_anonymous: isAnonymous,
      verse: bibleData ? `${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}` : ""
    }]);

    if (!error) { setMeditation(""); setPrayer(""); fetchMeditationPosts(); }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      {/* 헤더: DailyWord와 100% 동일 */}
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
        {/* 말씀 카드 */}
        <Card className="border-none bg-[#5D7BAF] shadow-none overflow-hidden rounded-sm">
          <CardContent className="pt-8 pb-5 px-6">
            {/* 1. 말씀 본문 영역 (높이 고정 및 스크롤) */}
            <div className="max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-white font-medium space-y-4"> {/* space-y-4로 절 사이 간격 확보 */}
                {bibleData ? (
                  bibleData.content.split('\n').map((line, index) => {
                    const trimmedLine = line.trim();
                    // "1. " 혹은 "12. " 패턴을 찾아 숫자와 본문을 분리
                    const match = trimmedLine.match(/^(\d+\.\s)(.*)/);
                    
                    if (match) {
                      const [_, verseNum, verseText] = match;
                      return (
                        <div 
                          key={index} 
                          className="flex items-start text-left" // flex로 숫자와 텍스트 분리
                          style={{ 
                            fontSize: `${fontSize}px`, 
                            lineHeight: '1.5', // 절 내부 줄간격
                          }}
                        >
                          {/* 숫자 부분: 고정 폭을 주어 들여쓰기 효과 생성 */}
                          <span className="shrink-0 opacity-80 mr-1.5 w-[1.5em]">{verseNum}</span>
                          {/* 본문 부분: 줄바꿈되어도 숫자 아래로 들어가지 않음 */}
                          <span className="break-keep">{verseText}</span>
                        </div>
                      );
                    }
                    
                    // 숫자가 없는 줄일 경우 (혹시 모를 예외 처리)
                    return (
                      <p key={index} className="pl-[1.5em] break-keep" style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}>
                        {trimmedLine}
                      </p>
                    );
                  })
                ) : (
                  <p className="text-white text-center py-10 opacity-70">등록된 묵상 말씀이 없습니다.</p>
                )}
              </div>
            </div>
            
            {/* 2. 성경 출처 영역 (가운데 정렬) */}
            {bibleData && (
              <div className="mt-8 pt-4 border-t border-white/20 flex justify-center">
                <p className="text-sm text-white/90 font-bold bg-white/10 px-4 py-1 rounded-full">
                  {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 스크롤바 스타일 */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        `}</style>

        {/* 액션 버튼 그룹 */}
        <div className="pt-0 pb-4 px-6 space-y-6">
          <div className="flex items-center justify-center gap-7 pt-1.5">
            <div className="relative flex flex-col items-center">
              <button onClick={handlePlayTTS} className="flex flex-row items-center gap-1.5">
                <Mic className="w-5 h-5 text-[#5D7BAF]" />
                <span className="text-[#5D7BAF] text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>음성으로 듣기</span>
              </button>
              {/* TTS 컨트롤 팝업 생략(DailyWord와 동일) */}
            </div>
            <button onClick={() => setIsFavorite(!isFavorite)} className="flex flex-row items-center gap-1.5">
              <Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
              <span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>기록함</span>
            </button>
            <button onClick={() => {}} className="flex flex-row items-center gap-1.5">
              <Copy className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>복사</span>
            </button>
            <button onClick={handleShareBibleText} className="flex flex-row items-center gap-1.5">
<Share2 className="w-5 h-5 text-gray-400" />
<span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>공유</span>
</button>
          </div>
        </div>

        {/* 입력 섹션: DailyWord 텍스트박스 구조 이식 */}
        <div className="space-y-4 px-1">
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>나의 묵상 기록</h3>
          </div>
          
          <div className="relative bg-gray-200 rounded-sm p-3 border border-gray-150">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-[0.5px] rounded-sm space-y-3">
                <Lock className="w-7 h-7 text-[#5D7BAF]" />
                <Button size="lg" onClick={() => setShowLoginModal(true)}>로그인 후 작성하기</Button>
              </div>
            )}
            <Textarea 
              placeholder="오늘 말씀을 통해 느낀 점을 기록해보세요."
              className="bg-white border-none resize-none min-h-[100px] p-2 text-gray-600 rounded-sm"
              value={meditation}
              onChange={(e) => setMeditation(e.target.value)}
            />
            
            {/* 묵상 기도 박스 추가 */}
            <div className="mt-3">
              <p className="text-[12px] font-bold text-gray-400 mb-1 ml-1">나의 묵상 기도</p>
              <Textarea 
                placeholder="주님께 드리는 기도를 적어보세요."
                className="bg-white/50 border-none resize-none min-h-[60px] p-2 text-gray-500 rounded-sm text-sm"
                value={prayer}
                onChange={(e) => setPrayer(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={isAnonymous} onCheckedChange={(val) => setIsAnonymous(!!val)} className="border-gray-400" />
                  <span className="text-sm font-bold text-gray-500">익명</span>
                </label>
                <button onClick={() => toggleSpeechRecognition('meditation')} className={`flex items-center gap-1 ${isRecording ? "text-primary animate-pulse" : "text-[#5D7BAF]"}`}>
                  <Mic className="w-4 h-4" />
                  <span className="text-xs font-bold">{isRecording ? "녹음중" : "음성 입력"}</span>
                </button>
              </div>
              <Button onClick={handleRegisterMeditation} disabled={!meditation.trim()} className="rounded-full px-6 font-bold bg-[#5D7BAF]">등록</Button>
            </div>
          </div>
        </div>

        {/* 묵상 목록: DailyWord 스타일 이식 */}
        <div className="space-y-4 pb-20">
          <div className="flex items-center gap-2 px-1 pt-4">
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
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-3" style={{ fontSize: `${fontSize}px` }}>{post.my_meditation}</p>
              {post.my_prayer && (
                <div className="bg-gray-50 p-3 rounded-sm border-l-2 border-[#5D7BAF]">
                  <p className="text-[13px] text-[#5D7BAF] italic font-medium">🙏 {post.my_prayer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* 로그인 모달 (DailyWord와 동일) */}
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
    </div>
  );
}
