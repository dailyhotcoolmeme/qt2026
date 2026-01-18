import { useState, useEffect, useRef } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
Share2, Star, MessageCircle, ChevronLeft, ChevronRight, Copy, Lock, CheckCircle2,
Mic, Trash2, Pause, Play, X
} from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";
import AuthPage from "./AuthPage";
import { supabase } from "@/lib/supabase"; 
import { useDisplaySettings } from "@/components/DisplaySettingsProvider";

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

// TTS 재생 함수
const handlePlayTTS = async () => {
if (!bibleData) return;
if (audio) {
setShowAudioControl(true);
return;
}

// 시편이면 '편', 그 외에는 '장'을 사용하도록 처리
const unit = bibleData.bible_name === "시편" ? "편" : "장";
const textToSpeak = `${bibleData.content}. ${bibleData.bible_name} ${bibleData.chapter}${unit} ${bibleData.verse}절 말씀.`;
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

audioBlob.onended = () => {
setIsPlaying(false);
setShowAudioControl(false);
setAudio(null);
};
} catch (error) {
console.error(error);
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
  if (!isAuthenticated || !currentUserId) { setShowLoginModal(true); return; }
  if (!comment.trim()) return;

  // 1. DB의 profiles 테이블에서 현재 유저의 진짜 닉네임을 가져옵니다.
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', currentUserId)
    .single();

  // 2. 닉네임 결정 순위: 익명 > DB의 full_name > DB의 username > 기본값
  const displayName = isAnonymous 
    ? "익명" 
    : (profileData?.full_name || profileData?.username || "신실한 성도");

  const newPost = {
    content: comment,
    user_nickname: displayName,
    is_anonymous: isAnonymous,
    user_id: currentUserId
  };

  const { error } = await supabase.from('sharing_posts').insert([newPost]);
  if (!error) { 
    setComment(""); 
    fetchSharingPosts(); 
  }
};

const handleDeleteSharing = async (id: number) => {
const { error } = await supabase
.from('sharing_posts')
.delete()
.eq('id', id);

if (!error) {
setSharingList(prev => prev.filter(post => post.id !== id));

// 삭제 성공 메시지 띄우기
setShowDeleteToast(true);
setTimeout(() => setShowDeleteToast(false), 2000); // 2초 뒤 사라짐
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

const getTimeLabel = (dateStr: string) => {
const date = new Date(dateStr);
const now = new Date();
const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
if (diff < 60) return "방금 전";
if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

  return (
    /* 전체 컨테이너에 pt-[64px] (TopBar 높이)를 추가하여 내용이 가려지지 않게 합니다. */
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden pt-[64px]">
<header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
<div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
<Button variant="ghost" size="icon" className="text-black-700 font-bold" onClick={() => {
const d = new Date(currentDate); d.setDate(d.getDate()-1); setCurrentDate(d);
}}><ChevronLeft className="w-6 h-6" /></Button>
  <div className="text-center">
    <h1 className="text-[#5D7BAF] font-bold text-center" 
      style={{ fontSize: `${fontSize + 3}px` }}>
      오늘의 말씀
    </h1>
    <p className="text-sm text-gray-400 font-bold text-center">
      {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
      {` (${currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})`}
    </p>
  </div>
<Button 
variant="ghost" 
size="icon" 
className="text-black-700 font-bold"
onClick={() => {
const d = new Date(currentDate);
d.setDate(d.getDate() + 1);
if (d <= today) {
setCurrentDate(d);
}
}}
>
<ChevronRight className="w-6 h-6" />
</Button>
</div>
</header>

<main className="flex-1 overflow-y-auto pt-4 px-4 pb-0 space-y-3">
<Card className="border-none bg-[#5D7BAF] shadow-none overflow-hidden rounded-lg">
<CardContent className="pt-6 pb-0 px-4">
<div className="text-center py-1">
<div className="font-serif text-white font-bold leading-[1.8] break-keep px-4 pb-0 text-center">
{bibleData ? (
<p style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}>{bibleData.content}</p>
) : (
<p className="text-white pb-6">등록된 말씀이 없습니다.</p>
)}
</div>
{bibleData && <p className="text-base text-white font-bold pb-6 mt-4">•  {bibleData.bible_name} {bibleData.chapter}:{bibleData.verse}  •</p>}
</div>
</CardContent>
</Card>

<div className="pt-0 pb-24 px-6 space-y-6">
<div className="flex items-center justify-center gap-7 pt-1.5">
{/* 음성으로 듣기 버튼 + 재생 컨트롤 팝업 */}
<div className="relative flex flex-col items-center">
<button onClick={handlePlayTTS} className="flex flex-row items-center gap-1.5">
<Mic className={`w-5 h-5 ${isPlaying ? "text-[#5D7BAF]" : "text-[#5D7BAF]"}`} />
<span 
className={`${isPlaying ? "text-[#5D7BAF]" : "text-[#5D7BAF]"} text-sm font-bold`} 
style={{ fontSize: `${fontSize - 2}px` }}
>
음성으로 듣기
</span>
</button>

<AnimatePresence>
{showAudioControl && (
<motion.div 
initial={{ opacity: 0, y: 0, x:45 }} 
animate={{ opacity: 1, y: 10, x:45 }} 
exit={{ opacity: 0, y: 0, x:45 }} 
className="absolute top-full mt-1 whitespace-nowrap z-[300] bg-gray-600/90 text-white px-4 py-3 rounded-lg flex items-center gap-1 shadow-lg"
>
<div className="flex items-center gap-2 h-5 border-r border-gray pr-4">
<button onClick={togglePlayPause} className="hover:text-white flex items-center gap-1">
{isPlaying ? (
<>
<Pause className="w-5 h-5 text-white-400" />
<span className="text-[14px] font-bold text-white-400" style={{ fontSize: `${fontSize - 2}px`}}>일시 정지</span>
</>
) : (
<>
<Play className="w-5 h-5 text-white-400" />
<span className="text-[14px] font-bold text-white-400" style={{ fontSize: `${fontSize - 2}px`}}>이어 재생</span>
</>
)}
</button>
</div>
<button onClick={stopAudio} className="hover:text-red flex items-center gap-1 ml-2 text-red-400">
<X className="w-5 h-5 text-red-400" />
<span className="text-[14px] text-red font-bold" style={{ fontSize: `${fontSize - 2}px`}}>그만 듣기</span>
</button>
</motion.div>
)}
</AnimatePresence>
</div>

<button onClick={() => setIsFavorite(!isFavorite)} className="flex flex-row items-center gap-1.5">
<Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
<span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>기록함</span>
</button>

{/* 복사하기 버튼 + 하단 토스트 */}
<div className="relative flex flex-col items-center">
<button onClick={handleCopyBibleText} className="flex flex-row items-center gap-1.5">
<Copy className="w-5 h-5 text-gray-400" />
<span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>복사</span>
</button>
<AnimatePresence>
{showCopyToast && (
<motion.div 
initial={{ opacity: 0, y: 0 }} 
animate={{ opacity: 1, y: 10 }} 
exit={{ opacity: 0, y: 0 }} 
className="absolute top-full mt-1 whitespace-nowrap z-[300] bg-gray-600/90 text-white px-3 py-3 rounded-lg flex items-center gap-2 shadow-lg"
>
<CheckCircle2 className="w-5 h-5 text-green-400" />
<span className="text-[14px] font-bold" style={{ fontSize: `${fontSize - 2}px`}}>복사되었습니다</span>
</motion.div>
)}
</AnimatePresence>
</div>

<button onClick={handleShareBibleText} className="flex flex-row items-center gap-1.5">
<Share2 className="w-5 h-5 text-gray-400" />
<span className="text-gray-400 text-sm font-bold" style={{ fontSize: `${fontSize - 2}px` }}>공유</span>
</button>
</div>
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
<Checkbox 
checked={isAnonymous} 
onCheckedChange={(val) => setIsAnonymous(!!val)}
// 테두리 색상을 글자색(gray-500)과 비슷한 gray-400~500 계열로 설정
className="border-gray-400 data-[state=checked]:bg-gray-500 data-[state=checked]:border-gray-500" 
/>
<span className="text-sm font-bold text-gray-500">익명으로 나누기</span>
</label>
<button 
onClick={(e) => {
e.preventDefault(); // 기본 동작 방지
toggleSpeechRecognition();
}} 
className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all active:scale-95 ${ // 클릭 시 살짝 작아지는 효과 추가
isRecording 
? "bg-[#5D7BAF] animate-pulse shadow-none cursor-pointer" 
: "text-red-400 hover:bg-gray-200 cursor-pointer"
}`}
style={{ touchAction: 'manipulation' }} // 모바일 터치 반응성 향상
>
{/* 아이콘과 텍스트에 pointer-events-none을 주어 클릭 방해를 막음 */}
<Mic className={`w-4 h-4 pointer-events-none ${isRecording ? "text-white" : "text-[#5D7BAF]"}`} />

<span className={`text-sm font-bold pointer-events-none ${isRecording ? "text-white" : "text-[#5D7BAF]"}`}>
{isRecording ? "녹음 중(터치 시 중단)" : "음성으로 입력하기"}
</span>
</button>
</div>
<Button 
size="sm" 
// border-none(테두리 없음), ring-0(외곽선 없음), shadow-none(그림자 없음) 추가
className="rounded-full px-7 font-bold bg-[#5D7BAF] text-white hover:bg-[#4a638c] border-none ring-0 shadow-none outline-none"
onClick={handleRegisterSharing} 
disabled={!comment.trim()}
style={{ fontSize: `${fontSize - 2}px` }}
>
등록
</Button>
</div>
</div>

{/* 공유 리스트 영역 */}
<div className="space-y-4 pb-10">
{sharingList.map((post) => (
<div key={post.id} className="bg-white border border-gray-150 rounded-lg p-4 shadow-xs relative group">
<div className="flex justify-between items-center mb-3">
<div className="flex items-center gap-2">
<p className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize}px` }}>
{post.is_anonymous ? "익명" : post.user_nickname}
</p>
<p className="text-gray-400 flex items-center gap-2" style={{ fontSize: `${fontSize - 3}px` }}>
{(() => {
const d = new Date(post.created_at);
const date = d.toLocaleDateString('en-CA'); // 2026-01-17 형식
const time = d.toTimeString().split(' ')[0].substring(0, 5); // 22:15 형식
return (
<>
<span>{date}</span>
<span className="text-gray-300">|</span> {/* 연한 구분선 */}
<span>{time}</span>
</>
);
})()}
</p>
</div>

{isAuthenticated && currentUserId === post.user_id && (
<button 
onClick={() => setDeleteId(post.id)} // 바로 삭제하지 않고 ID만 저장해서 모달을 띄움
className="text-gray-300 hover:text-red-400 transition-colors p-1"
>
<Trash2 style={{ width: `${fontSize}px`, height: `${fontSize}px` }} />
</button>
)}
</div>
<p 
className="text-gray-700 leading-relaxed whitespace-pre-wrap" 
style={{ fontSize: `${fontSize}px` }}
>
{post.content}
</p>
</div>
))}
</div> {/* sharingList를 감싸는 div 끝 */}
</div> {/* main 내부 컨텐츠를 감싸는 div 끝 */}
</main>
<AnimatePresence>
{deleteId !== null && (
<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
{/* 배경 어둡게 */}
<motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
onClick={() => setDeleteId(null)}
className="absolute inset-0 bg-black/40 backdrop-blur-sm"
/>

{/* 모달 본체 */}
<motion.div 
initial={{ opacity: 0, scale: 0.9, y: 20 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.9, y: 20 }}
className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-[280px] text-center"
>
<h3 className="text-lg font-bold text-gray-900 mb-2">정말 삭제할까요?</h3>
<p className="text-sm text-gray-500 mb-6">삭제된 내용은 복구할 수 없습니다.</p>

<div className="flex gap-3">
<button
onClick={() => setDeleteId(null)}
className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm"
>
취소
</button>
<button
onClick={() => {
handleDeleteSharing(deleteId);
setDeleteId(null);
}}
className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm"
>
삭제하기
</button>
</div>
</motion.div>
</div>
)}
</AnimatePresence>
<AnimatePresence>
{showDeleteToast && (
<motion.div
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.9 }}
// bottom-20 대신 inset-0 flex를 사용하여 정중앙 정렬
className="fixed inset-0 flex items-center justify-center z-[110] pointer-events-none"
>
<div className="bg-gray-600/90 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2">
<Trash2 style={{ width: `${fontSize}px`, height: `${fontSize}px` }} className="text-white" />
<span>삭제되었습니다</span>
</div>
</motion.div>
)}
</AnimatePresence>
<AnimatePresence>
{showLoginModal && (
<motion.div 
initial={{ opacity: 0 }} 
animate={{ opacity: 1 }} 
exit={{ opacity: 0 }} 
className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 overflow-y-auto"
>
<motion.div 
initial={{ scale: 0.95 }} 
animate={{ scale: 1 }} 
className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative p-6 max-h-[90vh] overflow-y-auto"
>
<button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 z-[210]">✕</button>
<AuthPage />
</motion.div>
</motion.div>
)}
</AnimatePresence>
</div>
);
}