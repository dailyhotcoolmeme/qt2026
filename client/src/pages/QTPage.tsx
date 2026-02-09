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

  // 사용자 관련 상태
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 성경 및 UI 관련 상태
  const [bibleData, setBibleData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceType, setVoiceType] = useState<'F' | 'M'>('F');
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isMeditationCompleted, setIsMeditationCompleted] = useState(false);

  // 묵상 기록 관련 상태
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  // 오디오 컨트롤 표시 상태 (TTS 재생용)
  const [showAudioControl, setShowAudioControl] = useState(false);

  const { fontSize = 16 } = useDisplaySettings();

  // voiceType이 바뀔 때 오디오 컨트롤이 켜져 있으면 다시 재생
  useEffect(() => {
    if (showAudioControl) {
      handlePlayTTS();
    }
  }, [voiceType]);

  // currentDate가 변경될 때 말씀 가져오기
  useEffect(() => {
    fetchVerse();
  }, [currentDate]);

  // user나 currentDate가 변경될 때 묵상 완료 상태 확인
  useEffect(() => {
    checkMeditationStatus();
    loadMeditationRecords();
  }, [user?.id, currentDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      if (selectedDate > today) {
        alert("오늘 이후의 말씀은 미리 볼 수 없습니다.");
        return;
      }
      setCurrentDate(selectedDate);
    }
  };

  // 묵상 완료 상태 확인
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

  // 묵상 기록 목록 불러오기
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

    setMeditationRecords(data || []);
  };



  // 묵상 완료 버튼 클릭
  const handleMeditationComplete = async () => {
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    // 당일만 활성화
    const isToday = currentDate.toDateString() === today.toDateString();
    if (!isToday) {
      alert('묵상 완료는 당일에만 가능합니다.');
      return;
    }

    if (!isMeditationCompleted) {
      // 확인 모달 표시
      setShowConfirmModal(true);
    }
    // 완료 상태일 때는 길게 누르기로만 취소 가능 (handleEnd에서 처리)
  };

  // 묵상 완료만 체크 (기록 없이)
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
      
      // Confetti 효과
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('Error completing meditation:', error);
      alert('묵상 완료 중 오류가 발생했습니다.');
    }
  };

  // 음성 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
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

      // 녹음 시간 카운터
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('마이크 권한이 필요합니다.');
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 음성 삭제
  const deleteAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // 묵상 기록 저장
  const handleSubmitMeditation = async () => {
    if (!meditationText && !audioBlob) {
      alert('묵상 기록을 입력하거나 음성을 녹음해주세요.');
      return;
    }

    const formattedDate = currentDate.toISOString().split('T')[0];
    let audioUrl: string | null = null;

    try {
      // 음성 파일이 있으면 R2에 업로드
      if (audioBlob) {
        const timestamp = Date.now();
        const fileName = `audio/meditation/${user!.id}/${formattedDate}/qt_${timestamp}.mp3`;
        
        // Blob을 File로 변환
        const audioFile = new File([audioBlob], `qt_${timestamp}.webm`, { type: 'audio/webm' });
        
        // R2 업로드 (기존 함수 활용, 경로만 전달)
        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            audioBase64: await blobToBase64(audioBlob)
          })
        });

        if (!response.ok) throw new Error('음성 업로드 실패');
        
        const { publicUrl } = await response.json();
        audioUrl = publicUrl;
      }

      // DB에 저장
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
      
      // 기록 목록 새로고침
      await loadMeditationRecords();
      
      // Confetti 효과
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('Error saving meditation:', error);
      alert('묵상 기록 저장 중 오류가 발생했습니다.');
    }
  };

  // 기록 수정 시작
  const startEditRecord = (record: any) => {
    setEditingRecord(record);
    setMeditationText(record.meditation_text || '');
    setAudioBlob(null); // 기존 음성은 URL로 관리
    setRecordingTime(record.audio_duration || 0);
    setShowWriteSheet(true);
  };

  // 기록 수정 저장
  const handleUpdateMeditation = async () => {
    if (!meditationText && !audioBlob && !editingRecord.audio_url) {
      alert('묵상 기록을 입력하거나 음성을 녹음해주세요.');
      return;
    }

    let audioUrl = editingRecord.audio_url;

    try {
      // 새 음성 파일이 있으면 업로드
      if (audioBlob) {
        const formattedDate = currentDate.toISOString().split('T')[0];
        const timestamp = Date.now();
        const fileName = `audio/meditation/${user!.id}/${formattedDate}/qt_${timestamp}.mp3`;
        
        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            audioBase64: await blobToBase64(audioBlob)
          })
        });

        if (!response.ok) throw new Error('음성 업로드 실패');
        
        const { publicUrl } = await response.json();
        audioUrl = publicUrl;
      }

      // DB 업데이트
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
      alert('묵상 기록 수정 중 오류가 발생했습니다.');
    }
  };

  // 기록 삭제 확인
  const confirmDeleteRecord = (recordId: number) => {
    setDeletingRecordId(recordId);
    setShowDeleteConfirm(true);
  };

  // 기록 삭제 실행
  const handleDeleteRecord = async () => {
    if (!deletingRecordId) return;

    try {
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
      alert('묵상 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  // 음성 재생
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

  // 음성 진행바 클릭
  const seekAudio = (progress: number) => {
    if (recordAudioRef.current) {
      recordAudioRef.current.currentTime = progress;
    }
  };

  // 기존 음성 삭제 (수정 모달에서)
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
      alert('음성 삭제 중 오류가 발생했습니다.');
    }
  };

  // Blob을 Base64로 변환
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

  // 녹음 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. 성별(voiceType)이 바뀔 때 실행되는 감시자
  useEffect(() => {
    // 오디오 컨트롤러가 켜져 있을 때만 성별 변경을 반영하여 다시 재생함
    if (showAudioControl) {
      handlePlayTTS();
    }
  }, [voiceType]);

  useEffect(() => {
    fetchVerse();
  }, [currentDate]);
  
  const fetchVerse = async () => {
  const formattedDate = currentDate.toISOString().split('T')[0];
  
  // 1. 오늘의 말씀 가져오기
  const { data: verse } = await supabase
    .from('daily_qt_verses')
    .select('*')
    .eq('display_date', formattedDate)
    .maybeSingle();
  
  if (verse) {
    // 2. 중요: bible_books 테이블에서 해당 성경의 순서(book_order)를 가져옴
    const { data: book } = await supabase
      .from('bible_books')
      .select('book_order')
      .eq('book_name', verse.bible_name) // bible_name으로 매칭
      .maybeSingle();

    // 3. bible_books 데이터를 포함해서 상태 업데이트
    setBibleData({ ...verse, bible_books: book });
  }
};

  const cleanContent = (text: string) => {
    if (!text) return "";
    return text
      .replace(/^[.\s]+/, "") 
      .replace(/\d+절/g, "")
      .replace(/\d+/g, "")
      .replace(/[."'“”‘’]/g, "")
      .replace(/\.$/, "")
      .trim();
  };

  const handleCopy = () => {
  if (bibleData) {
    // 실제 복사 로직
    navigator.clipboard.writeText(cleanContent(bibleData.content));
    
    // 토스트 켜고 2초 뒤 끄기
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
    
    // 햅틱 반응 (선택)
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
  }
};
const handleShare = async () => {
  if (window.navigator?.vibrate) window.navigator.vibrate(20);

  const shareDate = bibleData?.display_date;
  const shareUrl = shareDate
    ? `${window.location.origin}/?date=${shareDate}#/qt`
    : window.location.href;

  const shareData = {
    title: '성경 말씀',
    text: bibleData?.content
      ? cleanContent(bibleData.content)
      : '말씀을 공유해요.',
    url: shareUrl,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("링크가 클립보드에 복사되었습니다.");
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error("공유 실패:", error);
    }
  }
};
  
// 1. 재생/일시정지 토글
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  // 2. 오디오 이벤트 설정 (원래 빠른 속도의 핵심)
  const setupAudioEvents = (audio: HTMLAudioElement, startTime: number) => {
    audioRef.current = audio;
    audio.currentTime = startTime; // 이어듣기 적용

    audio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      audioRef.current = null;
    };

    setShowAudioControl(true);
    setIsPlaying(true);
    audio.play().catch(e => console.log("재생 시작 오류:", e));
  };

  // 3. TTS 실행 함수 (azure tts)
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

  // 파일 경로 설정 (qt 폴더)
  const bookOrder = bibleData.bible_books?.book_order || '0';
  const safeVerse = String(bibleData.verse).replace(/[: -]/g, '_');
  const fileName = `qt_b${bookOrder}_c${bibleData.chapter}_v${safeVerse}_${targetVoice}.mp3`;
  const storagePath = `qt/${fileName}`; 
  const { data: { publicUrl } } = supabase.storage.from('bible-assets').getPublicUrl(storagePath);

  try {
    const checkRes = await fetch(publicUrl, { method: 'HEAD' });
    
    // 1. 이미 파일이 있는 경우 처리 (내부 로직으로 수용)
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
      savedAudio.play().catch(e => console.log("재생 오류:", e));
      return;
    }

    // 2. 숫자 변환 및 텍스트 정제 (함수 내부 정의)
    const toKorNum = (num: number | string) => {
      const n = Number(num);
      if (isNaN(n)) return String(num);
      const units = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
      const tens = ["", "십", "이십", "삼십", "사십", "오십", "육십", "칠십", "팔십", "구십"];
      if (n === 0) return "영";
      if (n < 10) return units[n];
      if (n < 100) return tens[Math.floor(n / 10)] + units[n % 10];
      return String(n);
    };

    const cleanText = (text: string) => {
      return text.replace(/^[.\s]+/, "").replace(/\d+절/g, "").replace(/\d+/g, "").replace(/[."'“”‘’]/g, "").replace(/\.$/, "").trim();
    };

    const mainContent = cleanContent(
  bibleData.tts_content || bibleData.content
);
    const unit = bibleData.bible_name === "시편" ? "편" : "장";
    const chapterKor = toKorNum(bibleData.chapter);
    const verseRaw = String(bibleData.verse);
    let verseKor = verseRaw.includes('-') || verseRaw.includes(':') 
      ? `${toKorNum(verseRaw.split(/[-:]/)[0])}절에서 ${toKorNum(verseRaw.split(/[-:]/)[1])}`
      : toKorNum(verseRaw);

    const textToSpeak = `${mainContent}. ${bibleData.bible_name} ${chapterKor}${unit} ${verseKor}절 말씀.`;

    // 3. Azure API 호출
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

    if (!response.ok) throw new Error("API 호출 실패");

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const ttsAudio = new Audio(audioUrl);
    
    // 4. 오디오 설정 및 재생
    audioRef.current = ttsAudio;
    ttsAudio.currentTime = lastTime;
    ttsAudio.onended = () => {
      setIsPlaying(false);
      setShowAudioControl(false);
      audioRef.current = null;
    };
    setIsPlaying(true);
    ttsAudio.play().catch(e => console.log("재생 오류:", e));

    // 스토리지 업로드
    supabase.storage.from('bible-assets').upload(storagePath, audioBlob, { 
      contentType: 'audio/mp3', 
      upsert: true 
    });

  } catch (error) {
    console.error("Azure TTS 에러:", error);
    setIsPlaying(false);
  }
};

  // 날려먹었던 스와이프 로직 복구
  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) { // 이전 날짜
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (info.offset.x < -100) { // 다음 날짜
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) setCurrentDate(d);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      
      {/* 상단 날짜 영역 */}
            <header className="text-center mb-3 flex flex-col items-center w-full relative">
              <p className="font-bold text-gray-400 tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
                {currentDate.getFullYear()}
              </p>
               {/* 날짜 정렬 영역 */}
              <div className="flex items-center justify-center w-full">
              {/* 1. 왼쪽 공간 확보용 (달력 버튼 포함) */}
          <div className="flex-1 flex justify-end pr-3">
            <button 
              onClick={() => dateInputRef.current?.showPicker()} 
              className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform"
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
          {/* 2. 중앙 날짜 (고정석) */}
          <h2 className="font-black text-zinc-900 tracking-tighter shrink-0" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
           {/* 3. 오른쪽: 가상의 빈 공간 (연필 버튼과 똑같은 너비를 확보하여 날짜를 중앙으로 밀어줌) */}
    <div className="flex-1 flex justify-start pl-3">
      {/* 아이콘이 없더라도 버튼과 똑같은 크기(w-[32px] h-[32px])의 
          투명한 박스를 두어 왼쪽 버튼과 무게 중심을 맞춥니다. 
      */}
      <div className="w-[28px] h-[28px]" aria-hidden="true" />
    </div>
    {/* 숨겨진 날짜 입력 input */}
    <input 
      type="date"
      ref={dateInputRef}
      onChange={handleDateChange}
      max={new Date().toISOString().split("T")[0]} 
      className="absolute opacity-0 pointer-events-none"
    />
  </div>
</header>

      {/* 2. 말씀 카드 (양옆 힌트 카드 디자인 복구) */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
  
  {/* 왼쪽 힌트 카드 (어제) */}
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
        {/* 출처 영역 - 상단으로 이동 */}
        <span className="self-center text-center font-bold text-[#4A6741] opacity-60 mb-6" style={{ fontSize: `${fontSize * 0.9}px` }}>
          {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse}절
        </span>

        {/* 말씀 본문 영역 - 높이 고정 및 스크롤 추가 */}
    <div className="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 text-zinc-800 leading-[1.5] break-keep font-medium" 
         style={{ fontSize: `${fontSize}px`,maxHeight: "320px" // 이 값을 조절하여 카드의 전체적인 높이감을 결정하세요
        }}>
          {bibleData.content.split('\n').map((line: string, i: number) => {
            // 정규식 수정: 숫자(\d+) 뒤에 점(\.)이 있으면 무시하고 숫자와 나머지 텍스트만 가져옴
            const match = line.match(/^(\d+)\.?\s*(.*)/);
            
            if (match) {
              const [_, verseNum, textContent] = match;
              return (
                <p key={i} className="flex items-start gap-2">
                  {/* 점 없이 숫자만 출력 */}
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
        말씀을 불러오는 중...
      </div>
    )}
  </motion.div>
</AnimatePresence>

  {/* 오른쪽 힌트 카드 (내일) */}
<div className="absolute right-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      {/* 3. 툴바 (카드와 좁게, 아래와 넓게) */}
  <div className="flex items-center gap-8 mt-3 mb-4"> 
    <button onClick={() => handlePlayTTS()}  // 반드시 빈 괄호를 넣어주세요!
              className="flex flex-col items-center gap-1.5 text-zinc-400">
      <Headphones size={22} strokeWidth={1.5} />
      <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 재생</span>
    </button>
{/* 말씀 복사 버튼 찾아서 수정 */}
<button onClick={handleCopy} className="flex flex-col items-center gap-1.5 text-zinc-400">
  <Copy size={22} strokeWidth={1.5} />
  <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
</button>
    <button className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
  </div>
      {/* QT 묵상 질문 영역 */}
{bibleData?.qt_question && (
  <div className="w-full mt-8 mb-8 px-4">

    {/* 제목 */}
    <div className="flex items-center gap-2 mb-6">
      <div className="w-1.5 h-4 bg-[#4A6741] rounded-full opacity-70" />
      <h4
        className="font-bold text-[#4A6741] opacity-80"
        style={{ fontSize: `${fontSize * 0.95}px` }}
      >
        묵상 질문
      </h4>
    </div>

    <div className="space-y-10">
      {bibleData.qt_question
        .split(/\n?\d+\.\s/) // 번호 기준 분리
        .filter((q: string) => q.trim() !== "")
        .map((item: string, index: number, arr: string[]) => {

          // 🔥 (25절) 같은 패턴 기준으로 분리
const verseMatch = item.match(/\(\d+절\)[\.\!\?…"”"]*/);

let description = item;
let question = "";

if (verseMatch) {
  const splitIndex = verseMatch.index! + verseMatch[0].length;

  description = item.slice(0, splitIndex).trim();
  question = item.slice(splitIndex).trim();
}

          return (
            <div key={index}>

              {/* 번호 + 설명 */}
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

              {/* 실제 질문 */}
              {question && (
                <p
                  className="mt-4 text-[#4A6741] font-semibold opacity-80 leading-[1.9] break-keep"
                  style={{ fontSize: `${fontSize * 0.95}px` }}
                >
                  {question}
                </p>
              )}

              {/* 마지막 제외 얇은 구분선 */}
              {index < arr.length - 1 && (
                <div className="w-full h-[1px] bg-zinc-200 mt-8" />
              )}
            </div>
          );
        })}
    </div>
  </div>
)}

      {/* 묵상 완료 버튼 (아멘 버튼 스타일) */}
      <div className="flex flex-col items-center gap-3 pb-6 mt-8">
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* 빛의 파동 효과 */}
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

          {/* 실제 버튼 */}
          <motion.button 
            onClick={handleMeditationComplete}
            whileTap={{ scale: 0.9 }} 
            disabled={currentDate.toDateString() !== today.toDateString()}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 relative z-10
              ${
                currentDate.toDateString() !== today.toDateString()
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : isMeditationCompleted
                  ? 'bg-[#4A6741] text-white border-none' 
                  : 'bg-white text-[#4A6741] border border-green-50'
              }`}
          >
            <Heart 
              className={`w-5 h-5 mb-1 ${isMeditationCompleted ? 'fill-white animate-bounce' : ''}`} 
              strokeWidth={isMeditationCompleted ? 0 : 2} 
            />
            <span className="font-bold" style={{ fontSize: `${fontSize * 0.85}px` }}>
              {isMeditationCompleted ? '완료됨' : '묵상 완료'}
            </span>
          </motion.button>
        </div>
      </div>

      {/* 묵상 기록 목록 */}
      {meditationRecords.length > 0 && (
        <div className="w-full max-w-md px-4 mb-6">
          <h3 className="font-bold text-[#4A6741] mb-3" style={{ fontSize: `${fontSize * 0.95}px` }}>
            묵상 기록
          </h3>
          <div className="space-y-3">
            {meditationRecords.map((record) => (
              <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
                {/* 텍스트 내용 */}
                {record.meditation_text && (
                  <p className="text-zinc-700 leading-relaxed mb-3 whitespace-pre-wrap" style={{ fontSize: `${fontSize * 0.9}px` }}>
                    {record.meditation_text}
                  </p>
                )}
                
                {/* 음성 재생 */}
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
                
                {/* 수정/삭제 버튼 */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                  <span className="text-xs text-zinc-400">
                    {new Date(record.created_at).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditRecord(record)}
                      className="text-sm text-[#4A6741] font-medium"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => confirmDeleteRecord(record.id)}
                      className="text-sm text-red-500 font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 묵상 기록 추가하기 버튼 */}
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
            className="w-full py-3 bg-white border-2 border-dashed border-[#4A6741]/30 text-[#4A6741] rounded-xl font-bold hover:bg-[#4A6741]/5 transition-colors"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            + 묵상 기록 추가하기
          </button>
        </div>
      )}

      {/* 묵상 기록 확인 모달 */}
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
                묵상 기록을 남기시겠습니까?
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                오늘의 묵상을 글이나 음성으로 기록할 수 있습니다.
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
                  기록 남기기
                </button>
                <button 
                  onClick={handleCompleteOnly}
                  className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  완료만 체크
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 묵상 기록 작성 시트 */}
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
                  {editingRecord ? '묵상 기록 수정' : '묵상 기록'}
                </h3>
                <button 
                  onClick={editingRecord ? handleUpdateMeditation : handleSubmitMeditation}
                  className="text-[#4A6741] font-bold" 
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {editingRecord ? '저장' : '등록'}
                </button>
              </div>

              {/* 텍스트 입력 영역 */}
              <textarea 
                value={meditationText}
                onChange={(e) => setMeditationText(e.target.value)}
                placeholder="오늘 말씀에 대한 묵상을 기록해보세요"
                className="w-full h-40 bg-white rounded-2xl p-4 border-none focus:outline-none focus:ring-1 focus:ring-[#4A6741]/20 resize-none mb-4"
                style={{ fontSize: `${fontSize * 0.9}px` }}
              />

              {/* 음성 녹음 영역 */}
              <div className="space-y-3">
                <p className="text-zinc-600 font-medium text-sm">음성으로 기록</p>
                
                {/* 기존 음성 파일 (수정 모드) */}
                {editingRecord?.audio_url && !audioBlob && (
                  <div className="bg-white rounded-xl p-4 border border-zinc-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4A6741]/10 rounded-full flex items-center justify-center">
                          <Mic size={20} className="text-[#4A6741]" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-700" style={{ fontSize: `${fontSize * 0.9}px` }}>
                            기존 음성 녹음
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
                      기존 음성 삭제
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
                        <span>녹음 중지 ({formatTime(recordingTime)})</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Mic size={20} />
                        <span>음성 녹음 시작</span>
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
                            음성 녹음 완료
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
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 삭제 확인 모달 */}
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
                묵상 기록을 삭제할까요?
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                삭제된 기록은 복구할 수 없습니다.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소
                </button>
                <button 
                  onClick={handleDeleteRecord}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold transition-active active:scale-95 shadow-lg shadow-red-200"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TTS 제어 팝업 부분 */}
<AnimatePresence>
  {showAudioControl && (
    <motion.div 
      initial={{ y: 80, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      exit={{ y: 80, opacity: 0 }} 
      className="fixed bottom-24 left-6 right-6 bg-[#4A6741] text-white p-5 rounded-[24px] shadow-2xl z-[100]"
    >
      <div className="flex flex-col gap-4">
        {/* 상단 컨트롤 영역 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={togglePlay} 
              className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              {isPlaying ? <Pause fill="white" size={14} /> : <Play fill="white" size={14} />}
            </button>
            <p className="text-[13px] font-bold">
              {isPlaying ? "말씀을 음성으로 읽고 있습니다" : "일시 정지 상태입니다."}
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
        
        {/* 목소리 선택 영역 (수정본) */}
        <div className="flex gap-2">
          <button 
            onClick={() => setVoiceType('F')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'F' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}
          >
            여성 목소리
          </button>
          <button 
            onClick={() => setVoiceType('M')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${voiceType === 'M' ? 'bg-white text-[#4A6741]' : 'bg-white/10 text-white border border-white/20'}`}
          >
            남성 목소리
          </button>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
<AnimatePresence>
  {showCopyToast && (
    <motion.div 
      initial={{ opacity: 0, x: "-50%", y: 20 }} // x는 중앙 고정, y만 움직임
      animate={{ opacity: 1, x: "-50%", y: 0 }} 
      exit={{ opacity: 0, x: "-50%", y: 20 }} 
      transition={{ duration: 0.3 }}
      className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap"
      style={{ left: '50%', transform: 'translateX(-50%)' }} // 인라인 스타일로 한 번 더 강제
    >
      말씀이 복사되었습니다
    </motion.div>
  )}
</AnimatePresence>

{/* 로그인 모달 */}
<LoginModal 
  open={showLoginModal} 
  onOpenChange={setShowLoginModal}
  returnTo={`${window.location.origin}/#/qt`}
/> 
    </div>
  );
}
