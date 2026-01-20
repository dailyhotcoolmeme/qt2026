import { useState, useEffect, useRef } from "react"; 
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Share2, Star, MessageCircle, ChevronLeft, ChevronRight, Copy, Lock, CheckCircle2,
  Mic, Trash2, Pause, Play, X
} from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";
import AuthPage from "./AuthPage";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

interface BibleVerse {
  bible_name: string;
  chapter: string;
  verse: string;
  content: string;
}

export default function DailyWordsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false); 
  const { fontSize } = useDisplaySettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [comment, setComment] = useState("");
  const [sharingList, setSharingList] = useState<any[]>([]);
  const [bibleData, setBibleData] = useState<BibleVerse | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 음성 재생 관련 상태
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);

  // 말씀 포맷팅 함수
  const formatBibleContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\d+\.)/g).filter(Boolean);
    const verses: { num: string; text: string }[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i].match(/\d+\./)) {
        verses.push({ num: parts[i], text: parts[i + 1] || "" });
      } else {
        verses.push({ num: "", text: parts[i] });
        i--;
      }
    }
    return verses;
  };

  useEffect(() => {
    if (showLoginModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showLoginModal]);

  useEffect(() => {
    fetchDailyVerse(currentDate);
    fetchSharingPosts();

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

  const handlePlayTTS = async () => {
  if (!bibleData) return;
  
  // 기존 로직: 이미 오디오 객체가 있으면 제어창만 보여주고 리턴
  if (audio) {
    setShowAudioControl(true);
    return;
  }

  // 1. 텍스트 가공 (기존 로직 유지)
  const cleanContent = bibleData.content.replace(/\d+\./g, "").trim();
  const unit = bibleData.bible_name === "시편" ? "편" : "장";
  const textToSpeak = `${cleanContent}. ${bibleData.bible_name} ${bibleData.chapter}${unit} ${bibleData.verse}절 말씀.`;

  // 파일명 및 Storage URL 설정
  const fileName = `audio_${bibleData.bible_name}_${bibleData.chapter}_${bibleData.verse}.mp3`;
  const { data: publicUrlData } = supabase.storage.from('bible-audio').getPublicUrl(fileName);
  const audioUrl = publicUrlData.publicUrl;

  try {
    // 2. [추가] 먼저 저장소에 파일이 있는지 확인
    const checkRes = await fetch(audioUrl, { method: 'HEAD' });
    
    let audioSource = "";

    if (checkRes.ok) {
      // 이미 있으면 저장소 URL 사용
      audioSource = audioUrl;
    } else {
      // 없으면 Google API 호출 (기존 로직)
      const apiKey = import.meta.env.VITE_GOOGLE_TTS_API_KEY;
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          input: { text: textToSpeak },
          voice: { languageCode: "ko-KR", name: "ko-KR-Neural2-B" },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });

      const data = await response.json();
      if (!data.audioContent) throw new Error("TTS 생성 실패");

      // [추가] 파일 변환 및 Supabase 업로드 (비동기로 실행하여 사용자 체감 속도 향상)
      const binary = atob(data.audioContent);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
      const blob = new Blob([array], { type: 'audio/mp3' });

      // 업로드는 성공 여부와 상관없이 진행 (비회원일 경우 실패하겠지만 에러로 멈추지 않음)
      supabase.storage
        .from('bible-audio')
        .upload(fileName, blob, { contentType: 'audio/mp3', upsert: true })
        .catch(err => console.warn("Upload failed:", err));

      audioSource = `data:audio/mp3;base64,${data.audioContent}`;
    }

    // 3. 오디오 객체 생성 및 재생 (기존 로직 유지)
    const audioBlob = new Audio(audioSource);
    setAudio(audioBlob);
    setShowAudioControl(true);
    audioBlob.play();
    setIsPlaying(true);

    audioBlob.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      setAudio(null);
    };

  } catch (error) {
    console.error("TTS 에러:", error);
  }
};

  const togglePlayPause = () => {
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  };

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAudio(null);
    setIsPlaying(false);
    setShowAudioControl(false);
  };

  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.shouldStop = true;
        recognitionRef.current.stop();
      }
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("음성 인식을 지원하지 않는 브라우저입니다."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.onstart = () => { setIsRecording(true); recognition.shouldStop = false; };
    recognition.onend = () => { if (recognition.shouldStop === false) recognition.start(); else setIsRecording(false); };
    recognition.onresult = (event: any) => {
      let newText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) newText += event.results[i][0].transcript;
      }
      if (newText) setComment((prev) => (prev.trim() + " " + newText.trim()).trim());
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const fetchDailyVerse = async (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    const formattedDate = localDate.toISOString().split('T')[0];
    const { data } = await supabase.from('daily_bible_verses').select('*').eq('display_date', formattedDate).maybeSingle();
    setBibleData(data);
  };

  const fetchSharingPosts = async () => {
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    const { data, error } = await supabase.from('sharing_posts').select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });
    if (!error) setSharingList(data || []);
  };

  const handleRegisterSharing = async () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    if (!comment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.user_metadata;
    const kakaoName = meta?.full_name || meta?.name || meta?.nickname;
    const finalNickname = isAnonymous ? "익명" : (kakaoName || "신실한 성도");
    const newPost = { content: comment, user_id: user?.id, user_nickname: finalNickname, is_anonymous: isAnonymous };
    const { error } = await supabase.from('sharing_posts').insert([newPost]);
    if (!error) { setComment(""); fetchSharingPosts(); }
  };

  const handleDeleteSharing = async (id: number) => {
    const { error } = await supabase.from('sharing_posts').delete().eq('id', id);
    if (!error) {
      setSharingList(prev => prev.filter(post => post.id !== id));
      setShowDeleteToast(true);
      setTimeout(() => setShowDeleteToast(false), 2000);
    }
  };

  const handleCopyBibleText = async () => {
    if (!bibleData) return;
    const textToCopy = `"${bibleData.content}" - ${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}`;
    await navigator.clipboard.writeText(textToCopy);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000); 
  };

  const handleShareBibleText = async () => {
    if (!bibleData) return;
    const shareData = { title: '오늘의 말씀', text: `"${bibleData.content}" - ${bibleData.bible_name} ${bibleData.chapter}:${bibleData.verse}`, url: window.location.href };
    try { if (navigator.share) await navigator.share(shareData); else handleCopyBibleText(); } catch (err) { console.log(err); }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" className="text-black-700 font-bold" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate()-1); setCurrentDate(d);
          }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-bold text-center" style={{ fontSize: `${fontSize + 3}px` }}>오늘의 말씀</h1>
            <p className="text-sm text-gray-400 font-bold text-center">
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              {` (${currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})`}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-black-700 font-bold" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() + 1);
            if (d <= today) setCurrentDate(d);
          }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-10 space-y-3">
        <Card className="border-none bg-[#5D7BAF] shadow-none overflow-hidden rounded-lg">
          <CardContent className="pt-8 pb-5 px-6">
            <div className="text-center py-1">
              <div className="text-white font-bold leading-[1.8] break-keep px-4 pb-0 text-center">
                {bibleData ? (
                  <div className="flex flex-col gap-5"> 
                    {formatBibleContent(bibleData.content)?.map((verse, idx) => (
                      <p key={idx} style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}>
                        {verse.text.trim()}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-white pb-6">등록된 말씀이 없습니다.</p>
                )}
              </div>
              {bibleData && (
                <div className="mt-8 pt-4 border-t border-white/20 flex justify-center">
                  <p className="text-sm text-white/90 font-bold bg-white/10 text-center px-4 py-1 rounded-full">
                    {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="pt-0 pb-24 px-1 space-y-6">
          <div className="flex items-center justify-center gap-7 pt-1.5">
            <button onClick={handlePlayTTS} className="flex flex-row items-center gap-1.5">
              <Mic className="w-5 h-5 text-[#5D7BAF]" />
              <span className="text-[#5D7BAF] text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>음성으로 듣기</span>
            </button>
            <button onClick={() => setIsFavorite(!isFavorite)} className="flex flex-row items-center gap-1.5">
              <Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
              <span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>기록함</span>
            </button>
            <button onClick={handleCopyBibleText} className="flex flex-row items-center gap-1.5">
              <Copy className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>복사</span>
            </button>
            <button onClick={handleShareBibleText} className="flex flex-row items-center gap-1.5">
              <Share2 className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>공유</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-[#5D7BAF]">함께 나누기</h3>
            </div>
            <div className="relative bg-gray-200 rounded-[10px] p-3 border border-gray-150">
              {!isAuthenticated && (
                <div className="absolute inset-0 z-8 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-[0.5px] rounded-[10px] space-y-3">
                  <Lock className="w-7 h-7 text-[#5D7BAF]" />
                  <Button size="lg" onClick={() => setShowLoginModal(true)}>로그인 후 나누기</Button>
                </div>
              )}
              <Textarea 
                placeholder="오늘 말씀의 느낀점을 나눠주세요."
                className="bg-white border-none focus-visible:ring-1 ring-blue-200 resize-none min-h-[80px] p-2 text-gray-600"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex items-center justify-between mt-4 pt-0">
                <div className="flex items-center gap-10">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={isAnonymous} onCheckedChange={(val) => setIsAnonymous(!!val)} className="border-gray-400 data-[state=checked]:bg-gray-500 data-[state=checked]:border-gray-500" />
                    <span className="text-sm font-bold text-gray-500">익명으로 나누기</span>
                  </label>
                  <button onClick={(e) => { e.preventDefault(); toggleSpeechRecognition(); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all active:scale-95 ${isRecording ? "bg-[#5D7BAF] animate-pulse text-white shadow-none" : "text-[#5D7BAF] hover:bg-gray-200"}`}>
                    <Mic className="w-4 h-4 pointer-events-none" />
                    <span className="text-sm font-bold pointer-events-none">{isRecording ? "녹음 중(터치 시 중단)" : "음성으로 입력하기"}</span>
                  </button>
                </div>
                <Button size="sm" className="rounded-full px-7 font-bold bg-[#5D7BAF] text-white border-none ring-0 shadow-none outline-none" onClick={handleRegisterSharing} disabled={!comment.trim()} style={{ fontSize: `${fontSize - 2}px` }}>등록</Button>
              </div>
            </div>

            <div className="space-y-4 pb-10">
              {sharingList.map((post) => (
                <div key={post.id} className="bg-white border border-gray-150 rounded-lg p-4 shadow-xs relative">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize}px` }}>{post.is_anonymous ? "익명" : post.user_nickname}</p>
                      <p className="text-gray-400 flex items-center gap-2" style={{ fontSize: `${fontSize - 3}px` }}>
                        {(() => {
                          const d = new Date(post.created_at);
                          const date = d.toLocaleDateString('en-CA');
                          const time = d.toTimeString().split(' ')[0].substring(0, 5);
                          return <><span className="font-bold">{date}</span><span className="text-gray-300">|</span><span className="font-bold">{time}</span></>;
                        })()}
                      </p>
                    </div>
                    {isAuthenticated && currentUserId === post.user_id && (
                      <button onClick={() => setDeleteId(post.id)} className="text-gray-300 hover:text-red-400 p-1"><Trash2 style={{ width: `${fontSize}px`, height: `${fontSize}px` }} /></button>
                    )}
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAudioControl && (
          <motion.div drag="y" dragConstraints={{ top: -300, bottom: 50 }} initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-4 left-2 right-2 z-[250] max-w-full mx-auto">
            <div className="bg-[#5D7BAF] text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full animate-pulse"><Mic size={20} /></div>
                <div>
                  <p className="font-bold text-sm">말씀을 음성으로 읽고 있습니다..</p>
                  <p className="opacity-70 text-xs">드래그하여 위치 조절 가능</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-white" onClick={togglePlayPause}>
                  {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-white" onClick={stopAudio}><X size={22} /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCopyToast && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-gray-600/90 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg whitespace-nowrap">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="font-bold text-sm">말씀이 복사되었습니다</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-[280px] text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">정말 삭제할까요?</h3>
              <p className="text-sm text-gray-500 mb-6">삭제된 내용은 복구할 수 없습니다.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">취소</button>
                <button onClick={() => { handleDeleteSharing(deleteId); setDeleteId(null); }} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">삭제하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteToast && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 flex items-center justify-center z-[110] pointer-events-none">
            <div className="bg-gray-600/90 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2">
              <Trash2 className="text-white" size={18} />
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
    </div>
  );
}
