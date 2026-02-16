import React, { useState, useEffect, useRef } from "react";
import {
  Heart, Headphones, Share2, Copy, Bookmark,
  Play, Pause, X, Calendar as CalendarIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";

export default function DailyWordPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      if (selectedDate > today) {
        alert("?ㅻ뒛 ?댄썑??留먯?? 誘몃━ 蹂????놁뒿?덈떎.");
        return;
      }
      setCurrentDate(selectedDate);
    }
  };
  const [bibleData, setBibleData] = useState<any>(null);
  const [hasAmened, setHasAmened] = useState(false);
  const [amenCount, setAmenCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAudioControl, setShowAudioControl] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const [showCopyToast, setShowCopyToast] = useState(false); // ?좎뒪???쒖떆 ?щ?
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { fontSize = 16 } = useDisplaySettings();
 // 1. ?깅퀎(voiceType)??諛붾????ㅽ뻾?섎뒗 媛먯떆??
  useEffect(() => {
    // ?ㅻ뵒??而⑦듃濡ㅻ윭媛 耳쒖졇 ?덉쓣 ?뚮쭔 ?깅퀎 蹂寃쎌쓣 諛섏쁺?섏뿬 ?ㅼ떆 ?ъ깮??
    if (showAudioControl) {
      handlePlayTTS();
    }
  }, [voiceType]);

  useEffect(() => {
    fetchVerse();
  }, [currentDate]);

  const fetchVerse = async () => {
  const formattedDate = currentDate.toISOString().split('T')[0];

  // 1. ?ㅻ뒛??留먯? 媛?몄삤湲?
  const { data: verse } = await supabase
    .from('daily_bible_verses')
    .select('*')
    .eq('display_date', formattedDate)
    .maybeSingle();

  if (verse) {
    // 2. 以묒슂: bible_books ?뚯씠釉붿뿉???대떦 ?깃꼍???쒖꽌(book_order)瑜?媛?몄샂
    const { data: book } = await supabase
      .from('bible_books')
      .select('book_order')
      .eq('book_name', verse.bible_name) // bible_name?쇰줈 留ㅼ묶
      .maybeSingle();

    // 3. bible_books ?곗씠?곕? ?ы븿?댁꽌 ?곹깭 ?낅뜲?댄듃
    setBibleData({ ...verse, bible_books: book });
    setAmenCount(verse.amen_count || 0);
    setHasAmened(false);
  }
};

  const cleanContent = (text: string) => {
    if (!text) return "";
    return text
      .replace(/^[.\s]+/, "")
      .replace(/\d+장/g, "")
      .replace(/\d+/g, "")
      .replace(/[.\"'“”‘’]/g, "")
      .replace(/\.$/, "")
      .trim();
  };

  const handleAmenClick = async () => {
    if (hasAmened || !bibleData) return;
    // ?낇떛 諛섏쓳 異붽? (Success ?⑦꽩: ?? ????踰??뱀? 吏㏐쾶 ??踰?
  if (window.navigator && window.navigator.vibrate) {
    // 30ms ?숈븞 ?꾩＜ 吏㏐쾶 吏꾨룞 (iOS??釉뚮씪?곗? ?뺤콉???곕씪 ?쒗븳?곸씪 ???덉쓬)
    window.navigator.vibrate(30);
  }
    setHasAmened(true);
    setAmenCount(prev => prev + 1);
    await supabase.from('daily_bible_verses').update({ amen_count: amenCount + 1 }).eq('id', bibleData.id);
  };

  const handleCopy = () => {
  if (bibleData) {
    // ?ㅼ젣 蹂듭궗 濡쒖쭅
    navigator.clipboard.writeText(cleanContent(bibleData.content));

    // ?좎뒪??耳쒓퀬 2珥????꾧린
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);

    // ?낇떛 諛섏쓳 (?좏깮)
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
  }
};

// 1. ?ъ깮/?쇱떆?뺤? ?좉?
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  // 2. ?ㅻ뵒???대깽???ㅼ젙 (?먮옒 鍮좊Ⅸ ?띾룄???듭떖)
  const setupAudioEvents = (audio: HTMLAudioElement, startTime: number) => {
    audioRef.current = audio;
    audio.currentTime = startTime; // ?댁뼱?ｊ린 ?곸슜

    audio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      audioRef.current = null;
    };

    setShowAudioControl(true);
    setIsPlaying(true);
    audio.play().catch(e => console.log("?ъ깮 ?쒖옉 ?ㅻ쪟:", e));
  };

  // 3. TTS ?ㅽ뻾 ?⑥닔
const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
  if (!bibleData) return;
  if (window.navigator?.vibrate) window.navigator.vibrate(20);

  if (selectedVoice) {
    setVoiceType(selectedVoice);
    return;
  }

  const targetVoice = voiceType;
  const currentSrc = audioRef.current?.src || "";
  const isSameDate = currentSrc.includes(`daily_b${bibleData.bible_books?.book_order}_c${bibleData.chapter}`);
  const lastTime = isSameDate ? (audioRef.current?.currentTime || 0) : 0;

  setShowAudioControl(true);

  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.src = "";
    audioRef.current.load();
    audioRef.current = null;
  }

  // ?뚯씪紐??앹꽦 ???뱀닔臾몄옄 ?쒓굅
  const bookOrder = bibleData.bible_books?.book_order || '0';
  const safeVerse = String(bibleData.verse).replace(/[: -]/g, '_');
  const fileName = `daily/daily_b${bookOrder}_c${bibleData.chapter}_v${safeVerse}_${targetVoice}.mp3`;

  try {
    // R2?먯꽌 ?뚯씪 ?뺤씤
    const checkRes = await fetch(`/api/audio/${encodeURIComponent(fileName)}`);

    if (checkRes.ok) {
      const { publicUrl } = await checkRes.json();
      const savedAudio = new Audio(publicUrl);
      setupAudioEvents(savedAudio, lastTime);
      return;
    }

    const toKoreanNumberText = (num: number | string) => String(num).trim();
    const mainContent = cleanContent(bibleData.tts_content || bibleData.content);
    const unit = bibleData.bible_name === "시편" ? "편" : "장";
    const chapterKor = toKoreanNumberText(bibleData.chapter);

    const verseRaw = String(bibleData.verse).trim();
    let verseKor = verseRaw;
    if (verseRaw.includes("-") || verseRaw.includes(":")) {
      const separator = verseRaw.includes("-") ? "-" : ":";
      const [start, end] = verseRaw.split(separator);
      verseKor = `${toKoreanNumberText(start)}에서 ${toKoreanNumberText(end)}`;
    } else {
      verseKor = toKoreanNumberText(verseRaw);
    }

    const textToSpeak = `${mainContent}. ${bibleData.bible_name} ${chapterKor}${unit} ${verseKor}절 말씀.`;

    const AZURE_KEY = import.meta.env.VITE_AZURE_TTS_API_KEY;
    const AZURE_REGION = import.meta.env.VITE_AZURE_TTS_REGION;
    const azureVoice = targetVoice === 'F' ? "ko-KR-SoonBokNeural" : "ko-KR-BongJinNeural";

    const response = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      },
      body: `
        <speak version='1.0' xml:lang='ko-KR'>
          <voice xml:lang='ko-KR' name='${azureVoice}'>
            <prosody rate="1.0">
              ${textToSpeak}
            </prosody>
          </voice>
        </speak>
      `,
    });

    if (!response.ok) throw new Error("API ?몄텧 ?ㅽ뙣");

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const ttsAudio = new Audio(audioUrl);
    setupAudioEvents(ttsAudio, lastTime);

    // R2 ?낅줈??(諛깃렇?쇱슫??
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      await fetch('/api/audio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, audioBase64: base64Audio })
      });
    };
    reader.readAsDataURL(audioBlob);

  } catch (error) {
    console.error("TTS ?먮윭:", error);
    setIsPlaying(false);
  }
};






  const handleShare = async () => {
    // ?낇떛 諛섏쓳 異붽?
  if (window.navigator?.vibrate) window.navigator.vibrate(20);
    const shareData = {
      title: '?깃꼍 留먯?',
      text: bibleData?.content ? cleanContent(bibleData.content) : '留먯???怨듭쑀?댁슂.',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("留곹겕媛 ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("怨듭쑀 ?ㅽ뙣:", error);
      }
    }
  };
  // ?좊젮癒뱀뿀???ㅼ??댄봽 濡쒖쭅 蹂듦뎄
  const handleBookmark = async () => {
    if (!bibleData) return;
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    const verseRef = `${bibleData.bible_name} ${bibleData.chapter}${bibleData.bible_name === "시편" ? "편" : "장"} ${bibleData.verse}절`;
    const { error } = await supabase.from("verse_bookmarks").insert({
      user_id: user.id,
      source: "daily_word",
      verse_ref: verseRef,
      content: cleanContent(bibleData.content),
      memo: null,
    });

    if (error) {
      if (error.code === "23505") {
        alert("?대? ??λ맂 留먯??낅땲??");
        return;
      }
      alert("利먭꺼李얘린 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.");
      return;
    }

    alert("湲곕줉?⑥뿉 ??λ릺?덉뒿?덈떎.");
  };

  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) { // ?댁쟾 ?좎쭨
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (info.offset.x < -100) { // ?ㅼ쓬 ?좎쭨
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) setCurrentDate(d);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">

      {/* ?곷떒 ?좎쭨 ?곸뿭 */}
            <header className="text-center mb-3 flex flex-col items-center w-full relative">
              <p className="font-bold text-gray-400 tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
                {currentDate.getFullYear()}
              </p>
               {/* ?좎쭨 ?뺣젹 ?곸뿭 */}
              <div className="flex items-center justify-center w-full">
              {/* 1. ?쇱そ 怨듦컙 ?뺣낫??(?щ젰 踰꾪듉 ?ы븿) */}
          <div className="flex-1 flex justify-end pr-3">
            <button
              onClick={() => dateInputRef.current?.showPicker()}
              className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform"
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
          {/* 2. 以묒븰 ?좎쭨 (怨좎젙?? */}
          <h2 className="font-black text-zinc-900 tracking-tighter shrink-0" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
           {/* 3. ?ㅻⅨ履? 媛?곸쓽 鍮?怨듦컙 (?고븘 踰꾪듉怨??묎컳? ?덈퉬瑜??뺣낫?섏뿬 ?좎쭨瑜?以묒븰?쇰줈 諛?댁쨲) */}
    <div className="flex-1 flex justify-start pl-3">
      {/* ?꾩씠肄섏씠 ?녿뜑?쇰룄 踰꾪듉怨??묎컳? ?ш린(w-[32px] h-[32px])??
          ?щ챸??諛뺤뒪瑜??먯뼱 ?쇱そ 踰꾪듉怨?臾닿쾶 以묒떖??留욎땅?덈떎.
      */}
      <div className="w-[28px] h-[28px]" aria-hidden="true" />
    </div>
    {/* ?④꺼吏??좎쭨 ?낅젰 input */}
    <input
      type="date"
      ref={dateInputRef}
      onChange={handleDateChange}
      max={new Date().toISOString().split("T")[0]}
      className="absolute opacity-0 pointer-events-none"
    />
  </div>
</header>

      {/* 2. 留먯? 移대뱶 (?묒쁿 ?뚰듃 移대뱶 ?붿옄??蹂듦뎄) */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">

  {/* ?쇱そ ?뚰듃 移대뱶 (?댁젣) */}
<div className="absolute left-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />

  <AnimatePresence mode="wait">
  <motion.div
    key={currentDate.toISOString()}
    drag="x"
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.2}
    onDragEnd={onDragEnd}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-start justify-center p-10 pb-8 text-left z-10 touch-none cursor-grab active:cursor-grabbing"
  >
    {bibleData ? (
      <>
        {/* 留먯? 蹂몃Ц ?곸뿭 */}
        <div className="space-y-5 text-zinc-800 leading-[1.7] break-keep font-medium mb-10 w-full" style={{ fontSize: `${fontSize}px` }}>
          {bibleData.content.split('\n').map((line: string, i: number) => {
            // ?뺢퇋???섏젙: ?レ옄(\d+) ?ㅼ뿉 ??\.)???덉쑝硫?臾댁떆?섍퀬 ?レ옄? ?섎㉧吏 ?띿뒪?몃쭔 媛?몄샂
            const match = line.match(/^(\d+)\.?\s*(.*)/);

            if (match) {
              const [_, verseNum, textContent] = match;
              return (
                <p key={i} className="flex items-start gap-2">
                  {/* ???놁씠 ?レ옄留?異쒕젰 */}
                  <span className="text-[#4A6741] opacity-40 text-[0.8em] font-bold mt-[2px] flex-shrink-0">
                    {verseNum}
                  </span>
                  <span className="flex-1">{textContent}</span>
                </p>
              );
            }
            return <p key={i}>{line}</p>;
          })}
        </div>

        {/* 異쒖쿂 ?곸뿭 */}
        <span className="self-center text-center font-bold text-[#4A6741] opacity-60" style={{ fontSize: `${fontSize * 0.9}px` }}>
          {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === "시편" ? "편" : "장"} {bibleData.verse}절
        </span>
      </>
    ) : (
      <div className="animate-pulse text-zinc-200 w-full text-center">
        留먯???遺덈윭?ㅻ뒗 以?..
      </div>
    )}
  </motion.div>
</AnimatePresence>

  {/* ?ㅻⅨ履??뚰듃 移대뱶 (?댁씪) */}
<div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      {/* 3. ?대컮 (移대뱶? 醫곴쾶, ?꾨옒? ?볤쾶) */}
  <div className="flex items-center gap-8 mt-3 mb-14">
    <button onClick={() => handlePlayTTS()}  // 諛섎뱶??鍮?愿꾪샇瑜??ｌ뼱二쇱꽭??
              className="flex flex-col items-center gap-1.5 text-zinc-400">
      <Headphones size={22} strokeWidth={1.5} />
      <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>?뚯꽦 ?ъ깮</span>
    </button>
{/* 留먯? 蹂듭궗 踰꾪듉 李얠븘???섏젙 */}
<button onClick={handleCopy} className="flex flex-col items-center gap-1.5 text-zinc-400">
  <Copy size={22} strokeWidth={1.5} />
  <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>留먯? 蹂듭궗</span>
</button>
    <button onClick={handleBookmark} className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
  </div>

{/* 4. ?꾨찘 踰꾪듉 ?곸뿭 */}
<div className="flex flex-col items-center gap-3 pb-6">
  {/* ?뚮룞 ?덉씠?댁? 踰꾪듉??寃뱀튂湲??꾪빐 relative 而⑦뀒?대꼫 ?ъ슜 */}
  <div className="relative w-24 h-24 flex items-center justify-center">

    {/* 鍮쏆쓽 ?뚮룞 ?④낵 (hasAmened媛 true???뚮쭔 ?ㅽ뻾) */}
    <AnimatePresence>
      {hasAmened && (
        <>
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            className="absolute inset-0 bg-[#4A6741] rounded-full"
          />
          <motion.div
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 1.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
            className="absolute inset-0 bg-[#4A6741] rounded-full"
          />
        </>
      )}
    </AnimatePresence>

    {/* ?ㅼ젣 踰꾪듉 (?됱긽 濡쒖쭅 蹂듦뎄) */}
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleAmenClick}
      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 relative z-10
        ${hasAmened
          ? 'bg-[#4A6741] text-white border-none'
          : 'bg-white text-[#4A6741] border border-green-50'
        }`}
    >
      <Heart
        className={`w-5 h-5 mb-1 ${hasAmened ? 'fill-white animate-bounce' : ''}`}
        strokeWidth={hasAmened ? 0 : 2}
      />
      <span className="font-bold" style={{ fontSize: `${fontSize * 0.9}px` }}>?꾨찘</span>
      <span className="font-bold opacity-70" style={{ fontSize: `${fontSize * 0.9}px` }}>
        {amenCount.toLocaleString()}
      </span>
    </motion.button>
  </div>
</div>

      {/* 5. TTS ?쒖뼱 ?앹뾽 遺遺?*/}
<AnimatePresence>
  {showAudioControl && (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-24 left-6 right-6 bg-[#4A6741] text-white p-5 rounded-[24px] shadow-2xl z-[100]"
    >
      <div className="flex flex-col gap-4">
        {/* ?곷떒 而⑦듃濡??곸뿭 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              {isPlaying ? <Pause fill="white" size={14} /> : <Play fill="white" size={14} />}
            </button>
            <p className="text-[13px] font-bold">
              {isPlaying ? "留먯????뚯꽦?쇰줈 ?쎄퀬 ?덉뒿?덈떎" : "?쇱떆 ?뺤? ?곹깭?낅땲??"}
            </p>
          </div>
          <button onClick={() => {
            if(audioRef.current) audioRef.current.pause();
            setShowAudioControl(false);
            setIsPlaying(false);
          }}>
            <X size={20}/>
          </button>
        </div>

        {/* 紐⑹냼由??좏깮 ?곸뿭 (?섏젙蹂? */}
        <div className="flex gap-2">
          <button
            onClick={() => setVoiceType('F')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}
          >
            ?ъ꽦 紐⑹냼由?
          </button>
          <button
            onClick={() => setVoiceType('M')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}
          >
            ?⑥꽦 紐⑹냼由?
          </button>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
<AnimatePresence>
  {showCopyToast && (
    <motion.div
      initial={{ opacity: 0, x: "-50%", y: 20 }} // x??以묒븰 怨좎젙, y留??吏곸엫
      animate={{ opacity: 1, x: "-50%", y: 0 }}
      exit={{ opacity: 0, x: "-50%", y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap"
      style={{ left: '50%', transform: 'translateX(-50%)' }} // ?몃씪???ㅽ??쇰줈 ??踰???媛뺤젣
    >
      留먯???蹂듭궗?섏뿀?듬땲??
    </motion.div>
  )}
</AnimatePresence>
<LoginModal
  open={showLoginModal}
  onOpenChange={setShowLoginModal}
  returnTo={`${window.location.origin}/#/`}
/>
    </div>
  );
}
