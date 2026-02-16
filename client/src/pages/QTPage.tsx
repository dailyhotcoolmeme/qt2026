import React, { useState, useEffect, useRef } from "react";
import {
  Headphones, Share2, Copy, Bookmark,
  Play, Pause, X, Calendar as CalendarIcon, Heart, Mic, Square
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import confetti from "canvas-confetti";
import { uploadFileToR2 } from "../utils/upload";

export default function QTPage() {
  const [location, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // ?ъ슜??愿???곹깭
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ?깃꼍 諛?UI 愿???곹깭
  const [bibleData, setBibleData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isMeditationCompleted, setIsMeditationCompleted] = useState(false);

  // 臾듭긽 湲곕줉 愿???곹깭
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showWriteSheet, setShowWriteSheet] = useState(false);
  const [meditationText, setMeditationText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [meditationRecords, setMeditationRecords] = useState<any[]>([]);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordAudioRef = useRef<HTMLAudioElement | null>(null);

  // ?ㅻ뵒??而⑦듃濡??쒖떆 ?곹깭 (TTS ?ъ깮??
  const [showAudioControl, setShowAudioControl] = useState(false);

  const { fontSize = 16 } = useDisplaySettings();

  // voiceType??諛붾????ㅻ뵒??而⑦듃濡ㅼ씠 耳쒖졇 ?덉쑝硫??ㅼ떆 ?ъ깮
  useEffect(() => {
    if (showAudioControl) {
      handlePlayTTS();
    }
  }, [voiceType]);

  // currentDate媛 蹂寃쎈맆 ??留먯? 媛?몄삤湲?
  useEffect(() => {
    fetchVerse();
  }, [currentDate]);

  // user??currentDate媛 蹂寃쎈맆 ??臾듭긽 ?꾨즺 ?곹깭 ?뺤씤
  useEffect(() => {
    checkMeditationStatus();
    loadMeditationRecords();
  }, [user?.id, currentDate]);

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

  // 臾듭긽 ?꾨즺 ?곹깭 ?뺤씤
  const checkMeditationStatus = async () => {
    if (!user?.id) {
      setIsMeditationCompleted(false);
      return;
    }

    const formattedDate = currentDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('user_meditation_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', formattedDate)
      .eq('meditation_type', 'daily_qt');

    if (error) {
      console.error('Error checking meditation status:', error);
      return;
    }

    setIsMeditationCompleted(data && data.length > 0);
  };

  // 臾듭긽 湲곕줉 紐⑸줉 遺덈윭?ㅺ린 (?띿뒪?몃굹 ?뚯꽦???덈뒗 寃껊쭔)
  const loadMeditationRecords = async () => {
    if (!user?.id) {
      setMeditationRecords([]);
      return;
    }

    const formattedDate = currentDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('user_meditation_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', formattedDate)
      .eq('meditation_type', 'daily_qt')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading meditation records:', error);
      return;
    }

    // ?띿뒪?몃굹 ?뚯꽦???덈뒗 湲곕줉留??꾪꽣留?
    const recordsWithContent = (data || []).filter(
      record => record.meditation_text || record.audio_url
    );
    setMeditationRecords(recordsWithContent);
  };



  // 臾듭긽 ?꾨즺 踰꾪듉 ?대┃
  const handleMeditationComplete = async () => {
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    // ?뱀씪留??쒖꽦??
    const isToday = currentDate.toDateString() === today.toDateString();
    if (!isToday) {
      return; // 怨쇨굅 ?좎쭨???대┃ 遺덇?
    }

    if (!isMeditationCompleted) {
      // ?뺤씤 紐⑤떖 ?쒖떆
      setShowConfirmModal(true);
    } else {
      // ?꾨즺 ?곹깭????痍⑥냼 紐⑤떖 ?쒖떆
      setShowCancelConfirmModal(true);
    }
  };

  // 臾듭긽 ?꾨즺 痍⑥냼
  const handleCancelMeditation = async () => {
    const formattedDate = currentDate.toISOString().split('T')[0];

    try {
      // ?대떦 ?좎쭨??紐⑤뱺 ?덉퐫??李얘린
      const recordsToDelete = meditationRecords.filter(
        record => record.date === formattedDate
      );

      // 媛??덉퐫?쒖쓽 ?뚯꽦 ?뚯씪 ??젣
      for (const record of recordsToDelete) {
        if (record.audio_url) {
          try {
            await fetch('/api/audio/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl: record.audio_url })
            });
          } catch (error) {
            console.error('[R2 ??젣] ?ㅻ쪟:', error);
          }
        }
      }

      // DB?먯꽌 ?대떦 ?좎쭨??紐⑤뱺 ?덉퐫????젣
      const { error } = await supabase
        .from('user_meditation_records')
        .delete()
        .eq('user_id', user!.id)
        .eq('date', formattedDate);

      if (error) throw error;

      setIsMeditationCompleted(false);
      setShowCancelConfirmModal(false);
      await loadMeditationRecords();

      if (window.navigator?.vibrate) window.navigator.vibrate([30, 30]);
    } catch (error) {
      console.error('Error canceling meditation:', error);
      alert('臾듭긽 ?꾨즺 痍⑥냼 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    }
  };

  // 臾듭긽 ?꾨즺留?泥댄겕 (湲곕줉 ?놁씠)
  const handleCompleteOnly = async () => {
    const formattedDate = currentDate.toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('user_meditation_records')
        .insert({
          user_id: user!.id,
          date: formattedDate,
          meditation_type: 'daily_qt',
          book_name: bibleData?.bible_name || null,
          chapter: bibleData?.chapter || null,
          verse: bibleData?.verse || null
        });

      if (error) throw error;

      setIsMeditationCompleted(true);
      setShowConfirmModal(false);

      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('Error completing meditation:', error);
      alert('臾듭긽 ?꾨즺 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    }
  };

  // ?뚯꽦 ?뱀쓬 ?쒖옉
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 48000
      });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // ?뱀쓬 ?쒓컙 移댁슫??
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('留덉씠??沅뚰븳???꾩슂?⑸땲??');
    }
  };

  // ?뚯꽦 ?뱀쓬 以묒?
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ?뚯꽦 ??젣
  const deleteAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // 臾듭긽 湲곕줉 ???
  const handleSubmitMeditation = async () => {
    if (!meditationText && !audioBlob) {
      alert('臾듭긽 湲곕줉???낅젰?섍굅???뚯꽦???뱀쓬?댁＜?몄슂.');
      return;
    }

    const kstDate = new Date(currentDate.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
    let audioUrl: string | null = null;

    try {
      // ?뚯꽦 ?뚯씪???덉쑝硫?R2???낅줈??
      if (audioBlob) {
        const timestamp = Date.now();
        const fileName = `audio/meditation/${user!.id}/${kstDate}/qt_${timestamp}.webm`;

        // Blob??File濡?蹂??
        const audioFile = new File([audioBlob], `qt_${timestamp}.webm`, { type: 'audio/webm' });

        // R2 ?낅줈??(湲곗〈 ?⑥닔 ?쒖슜, 寃쎈줈留??꾨떖)
        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            audioBase64: await blobToBase64(audioBlob)
          })
        });

        if (!response.ok) throw new Error('?뚯꽦 ?낅줈???ㅽ뙣');

        const { publicUrl } = await response.json();
        audioUrl = publicUrl;
      }

      // DB?????
      const { error } = await supabase
        .from('user_meditation_records')
        .insert({
          user_id: user!.id,
          date: formattedDate,
          meditation_type: 'daily_qt',
          book_name: bibleData?.bible_name || null,
          chapter: bibleData?.chapter || null,
          verse: bibleData?.verse || null,
          meditation_text: meditationText || null,
          audio_url: audioUrl,
          audio_duration: recordingTime
        });

      if (error) throw error;

      setIsMeditationCompleted(true);
      setShowWriteSheet(false);
      setShowConfirmModal(false);
      setEditingRecord(null);
      setMeditationText('');
      setAudioBlob(null);
      setRecordingTime(0);

      // 湲곕줉 紐⑸줉 ?덈줈怨좎묠
      await loadMeditationRecords();

      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('Error saving meditation:', error);
      alert('臾듭긽 湲곕줉 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    }
  };

  // 湲곕줉 ?섏젙 ?쒖옉
  const startEditRecord = (record: any) => {
    setEditingRecord(record);
    setMeditationText(record.meditation_text || '');
    setAudioBlob(null); // 湲곗〈 ?뚯꽦? URL濡?愿由?
    setRecordingTime(record.audio_duration || 0);
    setShowWriteSheet(true);
  };

  // 湲곕줉 ?섏젙 ???
  const handleUpdateMeditation = async () => {
    if (!meditationText && !audioBlob && !editingRecord.audio_url) {
      alert('臾듭긽 湲곕줉???낅젰?섍굅???뚯꽦???뱀쓬?댁＜?몄슂.');
      return;
    }

    let audioUrl = editingRecord.audio_url;

    try {
      // ???뚯꽦 ?뚯씪???덉쑝硫??낅줈??
      if (audioBlob) {
        const kstDate = new Date(currentDate.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const timestamp = Date.now();
        const fileName = `audio/meditation/${user!.id}/${kstDate}/qt_${timestamp}.webm`;

        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            audioBase64: await blobToBase64(audioBlob)
          })
        });

        if (!response.ok) throw new Error('?뚯꽦 ?낅줈???ㅽ뙣');

        const { publicUrl } = await response.json();
        audioUrl = publicUrl;
      }

      // DB ?낅뜲?댄듃
      const { error } = await supabase
        .from('user_meditation_records')
        .update({
          meditation_text: meditationText || null,
          audio_url: audioUrl,
          audio_duration: audioBlob ? recordingTime : editingRecord.audio_duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      setShowWriteSheet(false);
      setEditingRecord(null);
      setMeditationText('');
      setAudioBlob(null);
      setRecordingTime(0);

      await loadMeditationRecords();

      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('Error updating meditation:', error);
      alert('臾듭긽 湲곕줉 ?섏젙 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    }
  };

  // 湲곕줉 ??젣 ?뺤씤
  const confirmDeleteRecord = (recordId: number) => {
    setDeletingRecordId(recordId);
    setShowDeleteConfirm(true);
  };

  // 湲곕줉 ??젣 ?ㅽ뻾
  const handleDeleteRecord = async () => {
    if (!deletingRecordId) return;

    try {
      // ??젣???덉퐫??李얘린
      const recordToDelete = meditationRecords.find(r => r.id === deletingRecordId);

      // R2 ?뚯씪 ??젣 (?뚯꽦???덈뒗 寃쎌슦)
      if (recordToDelete?.audio_url) {
        try {
          console.log('[R2 ??젣] ?쒖옉:', recordToDelete.audio_url);

          const response = await fetch('/api/audio/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: recordToDelete.audio_url })
          });

          console.log('[R2 ??젣] ?묐떟 ?곹깭:', response.status, response.statusText);

          const result = await response.json();
          console.log('[R2 ??젣] 寃곌낵:', result);

          if (!response.ok || !result.success) {
            console.error('[R2 ??젣] ?ㅽ뙣:', result.error);
            console.warn('DB????젣 吏꾪뻾');
          } else {
            console.log('[R2 ??젣] ?깃났:', recordToDelete.audio_url);
          }
        } catch (error) {
          console.error('[R2 ??젣] ?ㅻ쪟:', error);
          // R2 ??젣 ?ㅽ뙣?대룄 DB ??젣??吏꾪뻾
        }
      }

      // DB?먯꽌 ??젣
      const { error } = await supabase
        .from('user_meditation_records')
        .delete()
        .eq('id', deletingRecordId);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setDeletingRecordId(null);
      await loadMeditationRecords();
      await checkMeditationStatus();

      if (window.navigator?.vibrate) window.navigator.vibrate([30, 30]);
    } catch (error) {
      console.error('Error deleting meditation:', error);
      alert('臾듭긽 湲곕줉 ??젣 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    }
  };

  // ?뚯꽦 ?ъ깮
  const playRecordAudio = (audioUrl: string, recordId: number) => {
    if (playingAudioId === recordId && recordAudioRef.current) {
      recordAudioRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (recordAudioRef.current) {
      recordAudioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    recordAudioRef.current = audio;
    setPlayingAudioId(recordId);
    setAudioProgress(0);

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setAudioProgress(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setPlayingAudioId(null);
      setAudioProgress(0);
    });

    audio.play();
  };

  // ?뚯꽦 吏꾪뻾諛??대┃
  const seekAudio = (progress: number) => {
    if (recordAudioRef.current) {
      recordAudioRef.current.currentTime = progress;
    }
  };

  // 湲곗〈 ?뚯꽦 ??젣 (?섏젙 紐⑤떖?먯꽌)
  const deleteExistingAudio = async () => {
    if (!editingRecord) return;

    try {
      const { error } = await supabase
        .from('user_meditation_records')
        .update({
          audio_url: null,
          audio_duration: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      setEditingRecord({ ...editingRecord, audio_url: null, audio_duration: 0 });
      await loadMeditationRecords();
    } catch (error) {
      console.error('Error deleting audio:', error);
      alert('?뚯꽦 ??젣 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    }
  };

  // Blob??Base64濡?蹂??
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ?뱀쓬 ?쒓컙 ?щ㎎??
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const handleCopy = () => {
    if (!bibleData) return;
    navigator.clipboard.writeText(cleanContent(bibleData.content));
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
  };

  const handleShare = async () => {
    if (window.navigator?.vibrate) window.navigator.vibrate(20);

    const shareDate = bibleData?.display_date;
    const shareUrl = shareDate
      ? `${window.location.origin}/?date=${shareDate}#/qt`
      : window.location.href;

    const shareData = {
      title: "성경 말씀",
      text: bibleData?.content ? cleanContent(bibleData.content) : "말씀을 공유해요.",
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("링크를 클립보드에 복사했습니다.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("share failed:", error);
      }
    }
  };

  // 1. 재생/일시정지 토글
  const handleBookmark = async () => {
    if (!bibleData) return;
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    const verseRef = `${bibleData.bible_name} ${bibleData.chapter}${bibleData.bible_name === '시편' ? '편' : '장'} ${bibleData.verse}절`;
    const { error } = await supabase.from("verse_bookmarks").insert({
      user_id: user.id,
      source: "qt",
      verse_ref: verseRef,
      content: cleanContent(bibleData.content),
      memo: null,
    });

    if (error) {
      if (error.code === "23505") {
        alert("이미 저장된 말씀입니다.");
        return;
      }
      alert("즐겨찾기 저장에 실패했습니다.");
      return;
    }

    alert("기록함에 저장되었습니다.");
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  // 2. 오디오 이벤트 설정
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

  // 3. TTS ?ㅽ뻾 ?⑥닔 (azure tts)
const handlePlayTTS = async (selectedVoice?: 'F' | 'M') => {
  if (!bibleData) return;

  if (window.navigator?.vibrate) window.navigator.vibrate(20);

  if (selectedVoice) {
    setVoiceType(selectedVoice);
    return;
  }

  const targetVoice = voiceType;
  const currentSrc = audioRef.current?.src || "";
  const isSameDate = currentSrc.includes(`qt_b${bibleData.bible_books?.book_order}_c${bibleData.chapter}`);
  const lastTime = isSameDate ? (audioRef.current?.currentTime || 0) : 0;

  setShowAudioControl(true);

  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.src = "";
    audioRef.current.load();
    audioRef.current = null;
  }

  // ?뚯씪 寃쎈줈 ?ㅼ젙 (qt ?대뜑)
  const bookOrder = bibleData.bible_books?.book_order || '0';
  const safeVerse = String(bibleData.verse).replace(/[: -]/g, '_');
  const fileName = `qt_b${bookOrder}_c${bibleData.chapter}_v${safeVerse}_${targetVoice}.mp3`;
  const storagePath = `qt/${fileName}`;
  const { data: { publicUrl } } = supabase.storage.from('bible-assets').getPublicUrl(storagePath);

  try {
    const checkRes = await fetch(publicUrl, { method: 'HEAD' });

    // 1. ?대? ?뚯씪???덈뒗 寃쎌슦 泥섎━ (?대? 濡쒖쭅?쇰줈 ?섏슜)
    if (checkRes.ok) {
      const savedAudio = new Audio(publicUrl);
      audioRef.current = savedAudio;
      savedAudio.currentTime = lastTime;
      savedAudio.onended = () => {
        setIsPlaying(false);
        setShowAudioControl(false);
        audioRef.current = null;
      };
      setIsPlaying(true);
      savedAudio.play().catch(e => console.log("?ъ깮 ?ㅻ쪟:", e));
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

    // 3. Azure API ?몄텧
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
            <prosody rate="1.0">${textToSpeak}</prosody>
          </voice>
        </speak>
      `,
    });

    if (!response.ok) throw new Error("API ?몄텧 ?ㅽ뙣");

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const ttsAudio = new Audio(audioUrl);

    // 4. ?ㅻ뵒???ㅼ젙 諛??ъ깮
    audioRef.current = ttsAudio;
    ttsAudio.currentTime = lastTime;
    ttsAudio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      audioRef.current = null;
    };
    setIsPlaying(true);
    ttsAudio.play().catch(e => console.log("?ъ깮 ?ㅻ쪟:", e));

    // ?ㅽ넗由ъ? ?낅줈??
    supabase.storage.from('bible-assets').upload(storagePath, audioBlob, {
      contentType: 'audio/mp3',
      upsert: true
    });

  } catch (error) {
    console.error("Azure TTS ?먮윭:", error);
    setIsPlaying(false);
  }
};

  // ?좊젮癒뱀뿀???ㅼ??댄봽 濡쒖쭅 蹂듦뎄
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
<div className="absolute left-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />

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
    className="w-[82%] max-w-sm h-auto min-h-[450px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-start justify-center px-8 py-6 text-left z-10 touch-none cursor-grab active:cursor-grabbing"
  >
    {bibleData ? (
      <>
        {/* 異쒖쿂 ?곸뿭 - ?곷떒?쇰줈 ?대룞 */}
        <span className="self-center text-center font-bold text-[#4A6741] opacity-60 mb-6" style={{ fontSize: `${fontSize * 0.9}px` }}>
          {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === "시편" ? "편" : "장"} {bibleData.verse}절
        </span>

        {/* 留먯? 蹂몃Ц ?곸뿭 - ?믪씠 怨좎젙 諛??ㅽ겕濡?異붽? */}
    <div className="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 text-zinc-800 leading-[1.5] break-keep font-medium"
         style={{ fontSize: `${fontSize}px`,maxHeight: "320px" // ??媛믪쓣 議곗젅?섏뿬 移대뱶???꾩껜?곸씤 ?믪씠媛먯쓣 寃곗젙?섏꽭??
        }}>
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
      </>
    ) : (
      <div className="animate-pulse text-zinc-200 w-full text-center">
        留먯???遺덈윭?ㅻ뒗 以?..
      </div>
    )}
  </motion.div>
</AnimatePresence>

  {/* ?ㅻⅨ履??뚰듃 移대뱶 (?댁씪) */}
<div className="absolute right-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      {/* 3. ?대컮 (移대뱶? 醫곴쾶, ?꾨옒? ?볤쾶) */}
  <div className="flex items-center gap-8 mt-3 mb-4">
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
    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>怨듭쑀</span></button>
  </div>
      {/* QT 臾듭긽 吏덈Ц ?곸뿭 */}
{bibleData?.qt_question && (
  <div className="w-full mt-8 mb-8 px-4">

    {/* ?쒕ぉ */}
    <div className="flex items-center gap-2 mb-6">
      <div className="w-1.5 h-4 bg-[#4A6741] rounded-full opacity-70" />
      <h4
        className="font-bold text-[#4A6741] opacity-80"
        style={{ fontSize: `${fontSize * 0.95}px` }}
      >
        臾듭긽 吏덈Ц
      </h4>
    </div>

    <div className="space-y-10">
      {bibleData.qt_question
        .split(/\n?\d+\.\s/) // 踰덊샇 湲곗? 遺꾨━
        .filter((q: string) => q.trim() !== "")
        .map((item: string, index: number, arr: string[]) => {

          // ?뵦 (25?? 媛숈? ?⑦꽩 湲곗??쇰줈 遺꾨━
const verseMatch = item.match(/\(\d+\)\s*[.!?]*/);

let description = item;
let question = "";

if (verseMatch) {
  const splitIndex = verseMatch.index! + verseMatch[0].length;

  description = item.slice(0, splitIndex).trim();
  question = item.slice(splitIndex).trim();
}

          return (
            <div key={index}>

              {/* 踰덊샇 + ?ㅻ챸 */}
              <p
                className="leading-[1.8] break-keep"
                style={{ fontSize: `${fontSize * 0.95}px` }}
              >
                <span className="text-zinc-700 mr-1">
                  {index + 1}.
                </span>
                <span className="text-zinc-700">
                  {description}
                </span>
              </p>

              {/* ?ㅼ젣 吏덈Ц */}
              {question && (
                <p
                  className="mt-4 text-[#4A6741] font-semibold opacity-80 leading-[1.9] break-keep"
                  style={{ fontSize: `${fontSize * 0.95}px` }}
                >
                  {question}
                </p>
              )}

              {/* 留덉?留??쒖쇅 ?뉗? 援щ텇??*/}
              {index < arr.length - 1 && (
                <div className="w-full h-[1px] bg-zinc-200 mt-8" />
              )}
            </div>
          );
        })}
    </div>
  </div>
)}

      {/* 臾듭긽 ?꾨즺 踰꾪듉 (?꾨찘 踰꾪듉 ?ㅽ??? */}
      <div className="flex flex-col items-center gap-3 pb-6 mt-8">
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* 鍮쏆쓽 ?뚮룞 ?④낵 */}
          <AnimatePresence>
            {isMeditationCompleted && (
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

          {/* ?ㅼ젣 踰꾪듉 */}
          <motion.button
            onClick={handleMeditationComplete}
            whileTap={{ scale: 0.9 }}
            disabled={currentDate.toDateString() !== today.toDateString()}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 relative z-10
              ${
                isMeditationCompleted
                  ? 'bg-[#4A6741] text-white border-none'
                  : 'bg-white text-[#4A6741] border border-green-50'
              }
              ${
                currentDate.toDateString() !== today.toDateString()
                  ? 'cursor-not-allowed opacity-60'
                  : ''
              }`}
          >
            <Heart
              className={`w-5 h-5 mb-1 ${isMeditationCompleted ? 'fill-white animate-bounce' : ''}`}
              strokeWidth={isMeditationCompleted ? 0 : 2}
            />
            <span className="font-bold" style={{ fontSize: `${fontSize * 0.85}px` }}>
              {isMeditationCompleted ? '臾듭긽 ?꾨즺' : '臾듭긽 ?꾨즺'}
            </span>
          </motion.button>
        </div>
      </div>

      {/* 臾듭긽 湲곕줉 紐⑸줉 */}
      {meditationRecords.length > 0 && (
        <div className="w-full max-w-md px-4 mb-6">
          <h3 className="font-bold text-[#4A6741] mb-3" style={{ fontSize: `${fontSize * 0.95}px` }}>
            臾듭긽 湲곕줉
          </h3>
          <div className="space-y-3">
            {meditationRecords.map((record) => (
              <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
                {/* ?띿뒪???댁슜 */}
                {record.meditation_text && (
                  <p className="text-zinc-700 leading-relaxed mb-3 whitespace-pre-wrap" style={{ fontSize: `${fontSize * 0.9}px` }}>
                    {record.meditation_text}
                  </p>
                )}

                {/* ?뚯꽦 ?ъ깮 */}
                {record.audio_url && (
                  <div className="bg-[#4A6741]/5 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => playRecordAudio(record.audio_url, record.id)}
                        className="w-8 h-8 flex items-center justify-center bg-[#4A6741] text-white rounded-full"
                      >
                        {playingAudioId === record.id ? (
                          <Pause size={16} fill="white" />
                        ) : (
                          <Play size={16} fill="white" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="text-xs text-zinc-600 mb-1">
                          {playingAudioId === record.id
                            ? `${formatTime(Math.floor(audioProgress))} / ${formatTime(Math.floor(audioDuration))}`
                            : formatTime(record.audio_duration || 0)}
                        </div>
                        <div
                          className="h-1.5 bg-zinc-200 rounded-full overflow-hidden cursor-pointer"
                          onClick={(e) => {
                            if (playingAudioId === record.id && audioDuration > 0) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const percentage = x / rect.width;
                              seekAudio(percentage * audioDuration);
                            }
                          }}
                        >
                          <div
                            className="h-full bg-[#4A6741] transition-all"
                            style={{
                              width: playingAudioId === record.id && audioDuration > 0
                                ? `${(audioProgress / audioDuration) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ?섏젙/??젣 踰꾪듉 */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                  <span className="text-xs text-zinc-400">
                    {new Date(record.created_at).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    }).replace(/\s?ㅼ쟾\s0(\d):/, ' ?ㅼ쟾 $1:').replace(/\s?ㅽ썑\s0(\d):/, ' ?ㅽ썑 $1:')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditRecord(record)}
                      className="text-sm text-[#4A6741] font-medium"
                    >
                      ?섏젙
                    </button>
                    <button
                      onClick={() => confirmDeleteRecord(record.id)}
                      className="text-sm text-red-500 font-medium"
                    >
                      ??젣
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 臾듭긽 湲곕줉 異붽??섍린 踰꾪듉 */}
      {isMeditationCompleted && (
        <div className="w-full max-w-md px-4 mb-6">
          <button
            onClick={() => {
              setEditingRecord(null);
              setMeditationText('');
              setAudioBlob(null);
              setRecordingTime(0);
              setShowWriteSheet(true);
            }}
            className="w-full py-3 bg-white border border-dashed border-[#4A6741]/30 text-[#4A6741] rounded-xl font-bold hover:bg-[#4A6741]/5 transition-colors"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            + 臾듭긽 湲곕줉 異붽??섍린
          </button>
        </div>
      )}

      {/* 臾듭긽 湲곕줉 ?뺤씤 紐⑤떖 */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-8 w-full max-w-[320px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize * 1.1}px` }}>
                臾듭긽 湲곕줉???④린?쒓쿋?듬땲源?
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                ?ㅻ뒛??臾듭긽??湲?대굹 ?뚯꽦?쇰줈 湲곕줉?????덉뒿?덈떎.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setShowWriteSheet(true);
                  }}
                  className="w-full py-3 rounded-xl bg-[#4A6741] text-white font-bold transition-active active:scale-95 shadow-lg"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  湲곕줉 ?④린湲?
                </button>
                <button
                  onClick={handleCompleteOnly}
                  className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  ?꾨즺留?泥댄겕
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 臾듭긽 湲곕줉 ?묒꽦 ?쒗듃 */}
      <AnimatePresence>
        {showWriteSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWriteSheet(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-zinc-50 rounded-t-[32px] z-[401] px-6 pt-2 pb-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-4" />

              <div className="flex justify-between items-center mb-6">
                <h3 className="font-medium text-zinc-700" style={{ fontSize: `${fontSize}px` }}>
                  {editingRecord ? '臾듭긽 湲곕줉 ?섏젙' : '臾듭긽 湲곕줉'}
                </h3>
                <button
                  onClick={editingRecord ? handleUpdateMeditation : handleSubmitMeditation}
                  className="text-[#4A6741] font-bold"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {editingRecord ? "저장" : "등록"}
                </button>
              </div>

              {/* ?띿뒪???낅젰 ?곸뿭 */}
              <textarea
                value={meditationText}
                onChange={(e) => setMeditationText(e.target.value)}
                placeholder="?ㅻ뒛 留먯??????臾듭긽??湲곕줉?대낫?몄슂"
                className="w-full h-40 bg-white rounded-2xl p-4 border-none focus:outline-none focus:ring-1 focus:ring-[#4A6741]/20 resize-none mb-4"
                style={{ fontSize: `${fontSize * 0.9}px` }}
              />

              {/* ?뚯꽦 ?뱀쓬 ?곸뿭 */}
              <div className="space-y-3">
                <p className="text-zinc-600 font-medium text-sm">?뚯꽦?쇰줈 湲곕줉</p>

                {/* 湲곗〈 ?뚯꽦 ?뚯씪 (?섏젙 紐⑤뱶) */}
                {editingRecord?.audio_url && !audioBlob && (
                  <div className="bg-white rounded-xl p-4 border border-zinc-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4A6741]/10 rounded-full flex items-center justify-center">
                          <Mic size={20} className="text-[#4A6741]" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-700" style={{ fontSize: `${fontSize * 0.9}px` }}>
                            湲곗〈 ?뚯꽦 ?뱀쓬
                          </p>
                          <p className="text-zinc-400 text-sm">{formatTime(editingRecord.audio_duration || 0)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => playRecordAudio(editingRecord.audio_url, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-[#4A6741] text-white rounded-full"
                      >
                        {playingAudioId === -1 ? (
                          <Pause size={14} fill="white" />
                        ) : (
                          <Play size={14} fill="white" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={deleteExistingAudio}
                      className="w-full py-2 text-red-500 font-medium text-sm"
                    >
                      湲곗〈 ?뚯꽦 ??젣
                    </button>
                  </div>
                )}

                {!audioBlob && (!editingRecord || !editingRecord.audio_url) ? (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-full py-4 rounded-xl font-bold transition-all ${
                      isRecording
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-700'
                    }`}
                    style={{ fontSize: `${fontSize * 0.9}px` }}
                  >
                    {isRecording ? (
                      <div className="flex items-center justify-center gap-2">
                        <Square size={20} className="fill-current" />
                        <span>?뱀쓬 以묒? ({formatTime(recordingTime)})</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Mic size={20} />
                        <span>?뚯꽦 ?뱀쓬 ?쒖옉</span>
                      </div>
                    )}
                  </button>
                ) : audioBlob ? (
                  <div className="bg-white rounded-xl p-4 border border-zinc-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4A6741]/10 rounded-full flex items-center justify-center">
                          <Mic size={20} className="text-[#4A6741]" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-700" style={{ fontSize: `${fontSize * 0.9}px` }}>
                            ?뚯꽦 ?뱀쓬 ?꾨즺
                          </p>
                          <p className="text-zinc-400 text-sm">{formatTime(recordingTime)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const url = URL.createObjectURL(audioBlob);
                          playRecordAudio(url, -2);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-[#4A6741] text-white rounded-full mr-2"
                      >
                        {playingAudioId === -2 ? (
                          <Pause size={14} fill="white" />
                        ) : (
                          <Play size={14} fill="white" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={deleteAudio}
                      className="w-full py-2 text-red-500 font-medium text-sm"
                    >
                      ??젣
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 臾듭긽 ?꾨즺 痍⑥냼 ?뺤씤 紐⑤떖 */}
      <AnimatePresence>
        {showCancelConfirmModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelConfirmModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-8 w-full max-w-[280px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize}px` }}>
                臾듭긽 ?꾨즺瑜?痍⑥냼?좉퉴??
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                ?ㅻ뒛 ?좎쭨??紐⑤뱺 臾듭긽 湲곕줉????젣?⑸땲??
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  ?꾨땲??
                </button>
                <button
                  onClick={handleCancelMeditation}
                  className="flex-1 py-3 rounded-xl bg-[#4A6741] text-white font-bold transition-active active:scale-95 shadow-lg"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  痍⑥냼?섍린
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ??젣 ?뺤씤 紐⑤떖 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-8 w-full max-w-[280px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize}px` }}>
                臾듭긽 湲곕줉????젣?좉퉴??
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                ??젣??湲곕줉? 蹂듦뎄?????놁뒿?덈떎.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  痍⑥냼
                </button>
                <button
                  onClick={handleDeleteRecord}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold transition-active active:scale-95 shadow-lg shadow-red-200"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  ??젣
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TTS ?쒖뼱 ?앹뾽 遺遺?*/}
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

{/* 濡쒓렇??紐⑤떖 */}
<LoginModal
  open={showLoginModal}
  onOpenChange={setShowLoginModal}
  returnTo={`${window.location.origin}/#/qt`}
/>
    </div>
  );
}
