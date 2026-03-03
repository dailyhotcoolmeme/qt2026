import React, { useState, useEffect, useRef } from "react";
import { LoginModal } from "../components/LoginModal";
import { motion, AnimatePresence } from "framer-motion";
import { HandHeart, Plus, CirclePlus, X, Mic, Heart, Square, Play, Pause, Check, ClipboardPen, Download, Share2, Copy, Trash2, BarChart3, ChevronDown, ChevronUp, Headphones, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { ActivityGroupLinkModal } from "../components/ActivityGroupLinkModal";
import { ActivityCalendarModal } from "../components/ActivityCalendarModal";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateKey(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatLocalDate(parsed);
}

export default function PrayerPage() {
  // 최상단에 상태 변수, ref, useEffect 선언
  const { user } = useAuth();
  const { fontSize } = useDisplaySettings();
  const [publicTopics, setPublicTopics] = useState<any[]>([]);
  const [publicTopicAuthors, setPublicTopicAuthors] = useState<Record<string, string>>({});
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [topicOpacity, setTopicOpacity] = useState(1);
  const [myTopics, setMyTopics] = useState<any[]>([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [deleteTopicId, setDeleteTopicId] = useState<number | null>(null);
  const [isPrayingMode, setIsPrayingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [tempAudioUrl, setTempAudioUrl] = useState<string | null>(null);
  const [showPlayback, setShowPlayback] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveHashtags, setSaveHashtags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [prayerRecords, setPrayerRecords] = useState<any[]>([]);
  const [deleteRecordId, setDeleteRecordId] = useState<number | null>(null);
  const [deleteRecordUrl, setDeleteRecordUrl] = useState<string | null>(null);
  const [playingRecordId, setPlayingRecordId] = useState<number | null>(null);
  const [recordDuration, setRecordDuration] = useState<{ [key: number]: number }>({});
  const [recordCurrentTime, setRecordCurrentTime] = useState<{ [key: number]: number }>({});
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);
  const [showKeywords, setShowKeywords] = useState<number | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGroupLinkModal, setShowGroupLinkModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [prayerSubTab, setPrayerSubTab] = useState<"topics" | "archive">("topics");
  const [currentDate, setCurrentDate] = useState(new Date());

  // ref
  const todayRef = useRef(new Date());
  const audioChunksRef = useRef<any[]>([]);
  const mediaRecorderRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);
  const recordedAudioRef = useRef<any>(null);
  const audioProgressRef = useRef<any>(null);
  const audioRef = useRef<any>(null);

  // 모임 연결 관련 useEffect 제거

  // 상태 변수 선언 바로 아래에 함수 선언
  const loadMyTopics = async () => {
    if (!user) return;
    const { data } = await supabase.from('prayer_topics').select('*').eq('user_id', user.id);
    setMyTopics(data || []);
  };

  const loadPublicTopics = async () => {
    const { data } = await supabase.from('prayer_topics').select('*').eq('is_public', true);
    const topics = data || [];
    setPublicTopics(topics);

    const userIds = Array.from(new Set(topics.map((t: any) => t.user_id).filter(Boolean)));
    if (userIds.length === 0) {
      setPublicTopicAuthors({});
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, username')
      .in('id', userIds);

    const authorMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => {
      authorMap[p.id] = p.nickname || p.username || '모임원';
    });
    setPublicTopicAuthors(authorMap);
  };

  const loadPrayerRecords = async () => {
    if (!user) return;
    const { data } = await supabase.from('prayer_records').select('*').eq('user_id', user.id);
    if (data) {
      // 최신(created_at 내림차순) 정렬
      setPrayerRecords([...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } else {
      setPrayerRecords([]);
    }
  };

  const handleAddTopic = async () => {
    if (!user) return;
    if (!newTopic.trim()) return;
    const { error } = await supabase.from('prayer_topics').insert({
      user_id: user!.id,
      topic_text: newTopic.trim(),
      is_public: false
    });
    if (!error) {
      setNewTopic("");
      setShowAddInput(false);
      await loadMyTopics();
      await loadPublicTopics();
    }
  };

  // useEffect 예시 (공개 기도제목 자동 로딩)
  useEffect(() => {
    loadPublicTopics();
    // 하단 기도제목 리스트 초기 로딩
    if (user) {
      loadMyTopics();
      loadPrayerRecords();
    }
  }, [user]);

  // ...기존 handler, 함수, JSX, return 등 전체 코드...
  // (기존 코드 전체를 함수 내부에 위치시키고, 함수 밖에는 import/export만 남도록 정리)

  // 아래 기존 코드 전체를 함수 내부에 위치시키는 구조로 정리
  // (이미 함수 내부에 있는 코드들은 그대로 두고, 누락된 상태 변수/handler/ref/useEffect 등 추가)

  // (기존 return JSX는 그대로 유지)

  // 기도제목 삭제
  const handleDeleteTopic = async () => {
    if (!deleteTopicId) return;

    const { error } = await supabase
      .from('prayer_topics')
      .update({ is_public: null })
      .eq('id', deleteTopicId);

    if (!error) {
      await loadMyTopics();
      await loadPublicTopics();
      setDeleteTopicId(null);
    }
  };

  // 기도 이모지 클릭
  const handlePrayForTopic = async (topicId: number) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // prayer_interactions 테이블에 기록
    const { error: interactionError } = await supabase
      .from('prayer_interactions')
      .insert({
        user_id: user.id,
        prayer_topic_id: topicId
      });

    // prayer_count 증가
    const { error: updateError } = await supabase.rpc('increment_prayer_count', {
      topic_id: topicId
    });

    // prayer_count를 프론트에서 즉시 증가
    if (!interactionError && !updateError) {
      setPublicTopics((prev) => {
        return prev.map((topic, idx) => {
          if (topic.id === topicId) {
            return {
              ...topic,
              prayer_count: (topic.prayer_count || 0) + 1
            };
          }
          return topic;
        });
      });
      if (window.navigator?.vibrate) window.navigator.vibrate([20, 50, 20]);
      // 2초 후 전체 리스트 갱신
      setTimeout(() => {
        loadPublicTopics();
      }, 2000);
    }
  };

  // 기도하기 버튼 클릭 (전체 화면 모드 진입)
  const handleStartPrayerMode = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setIsPrayingMode(true);
  };

  // 기도 시작 버튼 (실제 녹음 시작)
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 48000
      });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }

        // temp 폴더로 업로드 (백그라운드)
        if (user) {
          uploadToTemp(blob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 권한이 필요합니다.');
      setIsPrayingMode(false);
    }
  };

  // 녹음 일시정지
  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // 녹음 재개
  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  // 녹음 종료
  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setShowPlayback(true);
    }
  };

  // temp 폴더 업로드 (백그라운드)
  const uploadToTemp = async (blob: Blob) => {
    try {
      const timestamp = Date.now();
      const fileName = `audio/temp/${user!.id}/prayer_${timestamp}.webm`;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, audioBase64: base64 })
        });

        if (response.ok) {
          const { publicUrl } = await response.json();
          setTempAudioUrl(publicUrl);
          console.log('[PrayerPage] Temp 업로드 완료:', publicUrl);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('[PrayerPage] Temp 업로드 실패:', error);
    }
  };

  // 재생
  const playRecordedAudio = () => {
    if (!audioBlob) return;

    if (recordedAudioRef.current) {
      if (recordedAudioRef.current.paused) {
        recordedAudioRef.current.play();
      } else {
        recordedAudioRef.current.pause();
      }
      return;
    }

    const audio = new Audio(URL.createObjectURL(audioBlob));
    recordedAudioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      if (audioProgressRef.current) {
        audioProgressRef.current.value = String(audio.currentTime);
      }
    });

    audio.addEventListener('ended', () => {
      if (audioProgressRef.current) {
        audioProgressRef.current.value = '0';
      }
    });

    audio.play();
  };

  // 재생 위치 변경
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (recordedAudioRef.current) {
      recordedAudioRef.current.currentTime = parseFloat(e.target.value);
    }
  };

  // 저장 모달 열기
  const handleOpenSaveModal = () => {
    setShowPlayback(false);
    setShowSaveModal(true);
  };

  // 기도 저장
  const handleSavePrayer = async () => {
    if (!audioBlob || !user) return;

    try {
      setIsSaving(true);
      setSavingProgress(0);

      const kstDate = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const timestamp = Date.now();
      const targetPath = `audio/prayer/${user.id}/${kstDate}/prayer_${timestamp}.webm`;

      let publicUrl: string;

      // 1단계: 파일 이동 (20%)
      setSavingProgress(10);

      if (tempAudioUrl) {
        // R2 내부에서 이동 (빠름)
        const moveResponse = await fetch('/api/audio/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceUrl: tempAudioUrl, targetPath })
        });

        if (!moveResponse.ok) throw new Error('파일 이동 실패');

        const moveData = await moveResponse.json();
        publicUrl = moveData.publicUrl;
      } else {
        // Fallback: 직접 업로드
        const reader = new FileReader();
        const uploadPromise = new Promise<string>((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64 = (reader.result as string).split(',')[1];
              const response = await fetch('/api/audio/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: targetPath, audioBase64: base64 })
              });

              if (!response.ok) throw new Error('업로드 실패');

              const { publicUrl: url } = await response.json();
              resolve(url);
            } catch (error) {
              reject(error);
            }
          };
          reader.readAsDataURL(audioBlob);
        });

        publicUrl = await uploadPromise;
      }

      setSavingProgress(30);


      setSavingProgress(70);

      // 3단계: DB 저장 (70% → 90%)
      const hashtags = saveHashtags.trim()
        ? saveHashtags.split('#').filter(tag => tag.trim()).map(tag => tag.trim())
        : [];

      const { data: insertedRecord, error } = await supabase
        .from('prayer_records')
        .insert({
          user_id: user.id,
          audio_url: publicUrl,
          audio_duration: recordingTime,
          date: kstDate,
          title: saveTitle.trim() || '음성 기도',
          hashtags
        })
        .select('id, title, audio_url, audio_duration, created_at')
        .single();

      if (error) throw error;

      setSavingProgress(90);

      // 4단계: 완료 (90% → 100%)
      resetPrayerState();
      await loadPrayerRecords();

      setSavingProgress(100);

      setTimeout(() => {
        setIsSaving(false);
        setSavingProgress(0);
      }, 500);

      // 기록 완료 후 모임 연결 모달 띄우기 (150ms 딜레이)
      setTimeout(() => setShowGroupLinkModal(true), 150);

      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('기도 저장 실패:', error);
      setIsSaving(false);
      setSavingProgress(0);
      alert('기도 저장 중 오류가 발생했습니다.');
    }
  };

  // 기도 전달하기 (공유)
  const handleSharePrayer = async () => {
    if (!audioBlob) return;

    try {
      const file = new File([audioBlob], 'prayer.webm', { type: 'audio/webm' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: '기도 녹음',
          text: '나의 기도를 공유합니다',
          files: [file]
        });
      } else {
        alert('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
      }
    } catch (error) {
      console.error('공유 실패:', error);
    }
  };

  const handleShareRecordAudio = async (record: any) => {
    if (!record?.audio_url || record.audio_url === "amen") return;

    const title = record.title || "음성 기도";
    const shareText = "기도 음성을 공유합니다.";

    try {
      if (navigator.share) {
        try {
          const response = await fetch(record.audio_url);
          if (response.ok) {
            const blob = await response.blob();
            const extension = blob.type.includes("mpeg")
              ? "mp3"
              : blob.type.includes("ogg")
                ? "ogg"
                : "webm";
            const file = new File([blob], `${title}.${extension}`, { type: blob.type || "audio/webm" });

            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
              await navigator.share({
                title,
                text: shareText,
                files: [file],
              });
              return;
            }
          }
        } catch (error) {
          console.error("audio file share fallback:", error);
        }

        await navigator.share({
          title,
          text: shareText,
          url: record.audio_url,
        });
        return;
      }

      await navigator.clipboard.writeText(record.audio_url);
      alert("공유 링크를 복사했습니다.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("record share failed:", error);
      alert("공유에 실패했습니다.");
    }
  };

  const handleOpenGroupLinkModal = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setShowGroupLinkModal(true);
  };

  // 닫기
  const handleClosePrayer = () => {
    // temp 파일 삭제 (저장 안 한 경우)
    if (tempAudioUrl) {
      fetch('/api/audio/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: tempAudioUrl })
      }).catch(err => console.error('Temp 삭제 실패:', err));
    }
    resetPrayerState();
  };

  // 상태 초기화
  const resetPrayerState = () => {
    setIsPrayingMode(false);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setTempAudioUrl(null);
    setShowPlayback(false);
    setShowSaveModal(false);
    setSaveTitle("");
    setSaveHashtags("");
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause();
      recordedAudioRef.current = null;
    }
  };

  // 기도 기록 재생
  const playRecording = (audioUrl: string, recordId: number) => {
    if (playingRecordId === recordId && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingRecordId(recordId);

    audio.addEventListener('loadedmetadata', () => {
      setRecordDuration(prev => ({ ...prev, [recordId]: audio.duration }));
    });

    audio.addEventListener('timeupdate', () => {
      setRecordCurrentTime(prev => ({ ...prev, [recordId]: audio.currentTime }));
    });

    audio.addEventListener('ended', () => {
      setPlayingRecordId(null);
      setRecordCurrentTime(prev => ({ ...prev, [recordId]: 0 }));
    });

    audio.play();
  };

  // 기도 기록 삭제 (모달 열기)
  const handleDeleteRecord = (id: number, url: string) => {
    setDeleteRecordId(id);
    setDeleteRecordUrl(url);
  };

  // Amen 버튼 클릭 → prayer_records에 저장 (audio_url='amen' 마커)
  const handleAmenClick = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    try {
      const kstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { error } = await supabase.from('prayer_records').insert({
        user_id: user.id,
        audio_url: 'amen',   // Amen 레코드 마커
        audio_duration: 0,
        date: kstDate,
        title: 'Amen',
        hashtags: [],
      });
      if (!error) {
        await loadPrayerRecords();
        setPrayerSubTab('archive');
        if (window.navigator?.vibrate) window.navigator.vibrate([20, 40, 20]);
        // 기록 완료 후 모임 연결 모달 띄우기
        setTimeout(() => setShowGroupLinkModal(true), 250);
      }
    } catch (err) {
      console.error('Amen 저장 실패:', err);
    }
  };

  // 기도 기록 삭제 실행
  const confirmDeleteRecord = async () => {
    if (!deleteRecordId || !deleteRecordUrl) return;

    try {
      // DB에서 삭제
      const { error } = await supabase
        .from('prayer_records')
        .delete()
        .eq('id', deleteRecordId);

      if (error) throw error;

      // R2에서 파일 삭제 (실제 URL일 때만)
      if (deleteRecordUrl.startsWith('http')) {
        await fetch('/api/audio/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: deleteRecordUrl })
        });
      }

      await loadPrayerRecords();
      setDeleteRecordId(null);
      setDeleteRecordUrl(null);
      if (window.navigator?.vibrate) window.navigator.vibrate(20);
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('기도 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  // 재생바 시크
  const handleRecordSeek = (recordId: number, value: number) => {
    if (audioRef.current && playingRecordId === recordId) {
      audioRef.current.currentTime = value;
      setRecordCurrentTime(prev => ({ ...prev, [recordId]: value }));
    }
  };

  // 텍스트 복사
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
  };

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 모임 연결 관련 함수 제거

  // 총 카운트 가져오기 (비로그인 사용자도 볼 수 있게)
  const getPrayerCount = (topic: any) => {
    return topic.prayer_count || 0;
  };

  const selectedDateKey = formatLocalDate(currentDate);
  const todayDateKey = formatLocalDate(todayRef.current);

  const handleDateChange = (selected: Date) => {
    if (Number.isNaN(selected.getTime())) return;
    if (formatLocalDate(selected) > todayDateKey) {
      alert('오늘 이후의 기록은 볼 수 없습니다.');
      return;
    }
    setCurrentDate(selected);
  };

  const moveDate = (offset: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + offset);
    if (formatLocalDate(nextDate) > todayDateKey) return;
    setCurrentDate(nextDate);
  };

  const getRecordDateKey = (record: any) => {
    if (record.date) return record.date;
    return toLocalDateKey(record.created_at) || "";
  };

  const activityDateKeys = new Set(
    prayerRecords
      .map((record) => getRecordDateKey(record))
      .filter((dateKey): dateKey is string => Boolean(dateKey))
  );

  const selectedDateRecords = prayerRecords.filter((record) => getRecordDateKey(record) === selectedDateKey);

  const isToday = selectedDateKey === todayDateKey;

  const visibleMyTopics = myTopics.filter((topic) => {
    const createdDateKey = toLocalDateKey(topic.created_at) || selectedDateKey;
    const deletedDateKey = topic.is_public === null ? toLocalDateKey(topic.updated_at) : null;
    return createdDateKey <= selectedDateKey && (!deletedDateKey || selectedDateKey < deletedDateKey);
  });

  return (
    <div className="relative w-full min-h-screen bg-[#F8F8F8] overflow-hidden px-2 pt-24 pb-4">
      <header className="relative mb-3 flex w-full flex-col items-center px-4 text-center">
  {/* 1. 연도 표시 (중앙 기준점) */}
  <p className="mb-1 font-bold tracking-[0.2em] text-gray-400" style={{ fontSize: `${fontSize * 0.8}px` }}>
    {currentDate.getFullYear()}
  </p>

  <div className="relative flex w-full items-center justify-center">
    {/* 2. 왼쪽 이전 버튼 (절대 위치로 왼쪽 끝 고정) */}
    <div className="absolute left-0">
      <button
        onClick={() => moveDate(-1)}
        className="rounded-full p-2 hover:bg-zinc-200 rounded-full transition-colors"
        title="이전 날짜"
      >
        <ChevronLeft size={24} strokeWidth={1.8} />
      </button>
    </div>

    {/* 중앙 영역: 날짜 텍스트를 기준으로 정렬 */}
<div className="relative flex items-center justify-center">
  
  {/* 1. 달력 버튼 컨테이너 (날짜 왼쪽으로 밀어내기) */}
  <div className="absolute right-full pr-3"> {/* <- 여기서 pr-3이 간격을 결정합니다! */}
    <button
      onClick={() => setShowCalendarModal(true)}
      className="rounded-full border border-zinc-100 bg-white p-1.5 text-[#4A6741] shadow-sm transition-transform active:scale-95"
    >
      <CalendarIcon size={16} strokeWidth={1.5} />
    </button>
  </div>
  
  {/* 2. 날짜 텍스트 (연도와 수직 정렬되는 주인공) */}
  <h2 
    className="font-black tracking-tighter text-zinc-900 whitespace-nowrap" 
    style={{ fontSize: `${fontSize * 1.25}px` }}
  >
    {currentDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
  </h2>

</div>

    {/* 4. 오른쪽 다음 버튼 (절대 위치로 오른쪽 끝 고정) */}
    <div className="absolute right-0">
      <button
        onClick={() => moveDate(1)}
        disabled={selectedDateKey >= todayDateKey}
        className={`rounded-full p-2 hover:bg-zinc-200 rounded-full transition-colors ${
          selectedDateKey >= todayDateKey ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        title="다음 날짜"
      >
        <ChevronRight size={24} strokeWidth={1.8} />
      </button>
    </div>

  </div>
</header>
      {/* 중앙: Amen + 기도하기 버튼 */}
      <div className="flex items-center justify-center gap-10 py-16 mt-1 mb-2">
        <motion.button
          onClick={handleAmenClick}
          whileTap={{ scale: 0.95 }}
          className="w-28 h-28 rounded-full bg-white text-[#4A6741] border border-[#4A6741]/70 shadow-2xl flex flex-col items-center justify-center gap-2"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        >
          <Heart size={32} strokeWidth={1.0} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 1.0}px` }}>
            마음기도
          </span>
        </motion.button>
        <motion.button
          onClick={handleStartPrayerMode}
          whileTap={{ scale: 0.95 }}
          className="w-28 h-28 rounded-full bg-[#4A6741]/90 text-white border border-[#4A6741]/90 shadow-2xl flex flex-col items-center justify-center gap-2"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        >
          <HandHeart size={32} strokeWidth={1.0} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 1.0}px` }}>
            음성기도
          </span>
        </motion.button>
      </div>

      {/* 하단: 서브탭(기도 제목/기도 보관함) + 함께 기도해요 */}
      <div className="px-2">
        <div className="mb-4 bg-white shadow-sm rounded-2xl border border-zinc-100 p-1.5 flex">
          <button
            onClick={() => setPrayerSubTab('topics')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center gap-1.5 ${prayerSubTab === 'topics' ? 'bg-[#4A6741]/90 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <ClipboardPen size={15} />
            기도 제목
          </button>
          <button
            onClick={() => setPrayerSubTab('archive')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center gap-1.5 ${prayerSubTab === 'archive' ? 'bg-[#4A6741]/90 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <Download size={15} />
            기도 보관함
          </button>
        </div>

        {prayerSubTab === 'topics' && (
          <div className="mb-10">
            {isToday && (
              <div className="flex items-center justify-end mb-3">
                <button
                  onClick={() => {
                    if (!user) {
                      setShowLoginModal(true);
                      return;
                    }
                    setShowAddInput(true);
                  }}
                  className="px-3 py-1.5 bg-[#4A6741]/10 text-[#4A6741] text-xs font-bold rounded-full hover:bg-[#4A6741]/20 transition-colors flex items-center gap-1.5 shrink-0"
                  title="기도제목 추가"
                >
                  <ClipboardPen size={12} />
                  <span>기도제목 추가</span>
                </button>
              </div>
            )}

            <div className="space-y-1 max-w-md bg-white rounded-2xl p-2 shadow-sm border border-zinc-100">
              {visibleMyTopics.length === 0 && !showAddInput && (
                <div className="px-3 py-6 text-center text-sm text-zinc-400">
                  등록된 기도 제목이 없습니다.
                  <br />
                  기도 제목을 등록해 주세요.
                </div>
              )}

              {visibleMyTopics.map((topic) => (
                <div key={topic.id} className="flex flex-row items-start gap-2 px-3 py-2">
                  <div className="flex-shrink-0 flex items-center h-6">
                    <Check size={16} className="text-[#4A6741]" />
                  </div>
                  <p
                    className="text-zinc-600 font-bold flex-1 break-words whitespace-normal py-0.5"
                    style={{ fontSize: `${fontSize * 0.90}px`, lineHeight: '1.5', wordBreak: 'break-word' }}
                  >
                    {topic.topic_text}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0 h-6 mt-[2px]">
                    {topic.is_public && (
                      <span className="text-xs text-[#4A6741] font-bold bg-[#4A6741]/10 px-1.5 py-1 rounded leading-none">
                        공개
                      </span>
                    )}
                    <button
                      onClick={() => setDeleteTopicId(topic.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-red-300 hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              <AnimatePresence>
                {showAddInput ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-white rounded-2xl p-4 space-y-2"
                  >
                    <textarea
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      placeholder="기도제목을 입력해주세요"
                      className="w-full h-15 bg-zinc-50 rounded-xl p-3 border-none focus:outline-none focus:ring-1 focus:ring-[#4A6741]/20 resize-none"
                      style={{ fontSize: `${fontSize * 0.85}px` }}
                      autoFocus
                    />
                    <div className="flex items-center justify-end pt-2 gap-2">
                      <button
                        onClick={() => {
                          setShowAddInput(false);
                          setNewTopic("");
                        }}
                        className="px-4 py-1 rounded-full text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddTopic}
                        className="px-4 py-1 rounded-full text-sm bg-[#4A6741] text-white font-medium"
                      >
                        추가
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}

        {prayerSubTab === 'archive' && (
          <div className="mb-10">
            {isToday && (
              <div className="flex items-center justify-end mb-3">
                <button
                  onClick={handleOpenGroupLinkModal}
                  className="px-3 py-1.5 bg-[#4A6741]/10 text-[#4A6741] text-xs font-bold rounded-full hover:bg-[#4A6741]/20 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Share2 size={12} /> 모임에 연결
                </button>
              </div>
            )}

            {selectedDateRecords.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6 text-center text-sm text-zinc-400">저장된 기도 기록이 없습니다.</div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                  {selectedDateRecords.map((record, index) => {
                      const isAmen = !record.audio_url || record.audio_url === 'amen';
                      const formattedDate = new Date(record.created_at).toLocaleString('ko-KR', {
                        month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true,
                      }).replace(/\s오전\s0(\d):/, ' 오전 $1:').replace(/\s오후\s0(\d):/, ' 오후 $1:');

                      return (
                        <React.Fragment key={record.id}>
                          {isAmen ? (
                            <div className="bg-white p-4 flex items-center gap-3">
                              <Heart size={22} className="text-[#4A6741]/90 shrink-0" strokeWidth={1.5} />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#4A6741]/90" style={{ fontSize: `${fontSize * 0.90}px` }}>마음으로 기도합니다. 아멘</p>
                                <p className="text-xs text-zinc-400 mt-0.5">{formattedDate}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteRecord(record.id, record.audio_url || 'amen')}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-red-300 hover:bg-red-50 transition-colors shrink-0"
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="bg-white p-4">
                              <div className="flex items-start gap-3">
                                <Headphones size={22} className="text-[#4A6741]/90 shrink-0 mt-3" strokeWidth={1.5} />
                                <div className="flex-1 min-w-0 flex flex-col">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-bold text-[#4A6741]/90 break-words" style={{ fontSize: `${fontSize * 0.90}px` }}>
                                      {record.title || '음성 기도'}
                                    </h4>
                                    {record.hashtags && record.hashtags.length > 0 && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {record.hashtags.map((tag: string, idx: number) => (
                                          <span key={idx} className="text-xs text-[#4A6741] bg-[#4A6741]/15 px-2 py-0.5 rounded-full">
                                            #{tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-zinc-400 -mt-0.5">
                                    <span>{formattedDate}</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleShareRecordAudio(record)}
                                        className="h-7 px-2 flex items-center justify-center gap-1 text-[#4A6741] text-xs font-bold"
                                        title="공유"
                                      >
                                        <Share2 size={12} />
                                        공유
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRecord(record.id, record.audio_url)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full text-red-300 hover:bg-red-50 transition-colors"
                                        title="삭제"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 mt-2">
                                    <button
                                      onClick={() => playRecording(record.audio_url, record.id)}
                                      className="w-8 h-8 flex-shrink-0 rounded-full bg-[#4A6741] text-white flex items-center justify-center"
                                    >
                                      {playingRecordId === record.id && audioRef.current && !audioRef.current.paused ? (
                                        <Pause size={16} fill="white" />
                                      ) : (
                                        <Play size={16} fill="white" />
                                      )}
                                    </button>
                                    <div className="flex-1 flex flex-col gap-1.5">
                                      <input
                                        type="range"
                                        min="0"
                                        max={recordDuration[record.id] || 0}
                                        value={recordCurrentTime[record.id] || 0}
                                        onChange={(e) => handleRecordSeek(record.id, Number(e.target.value))}
                                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                        style={{
                                          background: recordDuration[record.id] > 0
                                            ? `linear-gradient(to right, #4A6741 0%, #4A6741 ${((recordCurrentTime[record.id] || 0) / recordDuration[record.id]) * 100}%, #c8dfc4 ${((recordCurrentTime[record.id] || 0) / recordDuration[record.id]) * 100}%, #c8dfc4 100%)`
                                            : '#c8dfc4',
                                        }}
                                      />
                                      <div className="flex justify-between text-xs text-[#4A6741]/70">
                                        <span>{Math.floor((recordCurrentTime[record.id] || 0) / 60)}:{String(Math.floor((recordCurrentTime[record.id] || 0) % 60)).padStart(2, '0')}</span>
                                        <span>{Math.floor((recordDuration[record.id] || record.audio_duration) / 60)}:{String(Math.floor((recordDuration[record.id] || record.audio_duration) % 60)).padStart(2, '0')}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {index !== selectedDateRecords.length - 1 && <div className="h-px bg-zinc-100 mx-4" />}
                        </React.Fragment>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 
        <div className="mb-2">
          <div className="flex items-center px-1 gap-2 mb-3">
            <HandHeart size={16} className="text-[#4A6741]/90" />
            <h3 className="font-black text-[#4A6741]/90" style={{ fontSize: `${fontSize * 1.1}px` }}>
              함께 기도해요
            </h3>
          </div>

          {publicTopics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 text-center text-sm text-zinc-400">공개 기도제목이 없습니다.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              {publicTopics.map((topic, index) => (
                <React.Fragment key={topic.id}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-700 font-bold whitespace-pre-wrap break-words" style={{ fontSize: `${fontSize * 0.9}px` }}>
                        {topic.topic_text}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">{publicTopicAuthors[topic.user_id] || '모임원'}</p>
                    </div>
                    <button
                      onClick={() => handlePrayForTopic(topic.id)}
                      className="flex items-center gap-1 text-[#4A6741] shrink-0 self-center"
                      title="함께 기도하기"
                    >
                      <HandHeart size={18} strokeWidth={1.0} />
                      <span className="text-sm font-bold opacity-70">{getPrayerCount(topic)}</span>
                    </button>
                  </div>
                  {index !== publicTopics.length - 1 && <div className="h-px bg-zinc-100 mx-4" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        */}
      </div>

      {/* 전체 화면 기도 모드 */}
      <AnimatePresence>
        {isPrayingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center"
          >
            {!isRecording && !showPlayback && !showSaveModal && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center px-6 flex flex-col items-center"
              >
                <h2 className="text-gray-100 opacity-50 font-bold mb-24" style={{ fontSize: `${fontSize * 1.3}px` }}>
                  주여, 내 기도를 들으소서
                </h2>

                <motion.button
                  onClick={handleStartRecording}
                  whileTap={{ scale: 0.95 }}
                  className="w-28 h-28 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center opacity-70 justify-center mb-24"
                  animate={{
                    scale: [0.9, 1.05, 0.9],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut"
                  }}
                >
                  <Mic size={32} />
                </motion.button>

                <p className="text-gray-100 opacity-50 max-w-md text-center leading-relaxed" style={{ fontSize: `${fontSize * 1.0}px` }}>
                  소리내어 울부짖지 않아도, 속삭이는 기도에도,<br />
                  마음속 외침에도 모두 듣고 계십니다
                </p>

                <button
                  onClick={handleClosePrayer}
                  className="mt-24 text-gray-100 opacity-50 underline w-full max-w-md flex items- justify-end gap-3" style={{ fontSize: `${fontSize * 0.95}px` }}
                >
                  닫기
                </button>
              </motion.div>
            )}

            {isRecording && !showPlayback && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center flex flex-col items-center"
              >
                {/* 녹음 아이콘 */}
                <motion.div
                  animate={{
                    scale: isPaused ? 1 : [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 20,
                    repeat: isPaused ? 0 : Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-28 h-28 rounded-full bg-red-500/20 flex items-center justify-center mb-8"
                >
                  <Mic size={32} className="text-red-500" />
                </motion.div>

                {/* 녹음 시간 */}
                <p className="text-3xl font-bold text-white opacity-50 mb-12">
                  {formatTime(recordingTime)}
                </p>

                {/* 버튼들 */}
                <div className="flex gap-3">
                  {!isPaused ? (
                    <button
                      onClick={handlePauseRecording}
                      className="px-6 py-3 rounded-full bg-black text-white opacity-50 font-bold flex items-center gap-2"
                    >
                      <Pause size={16} />
                      일시정지
                    </button>
                  ) : (
                    <button
                      onClick={handleResumeRecording}
                      className="px-6 py-3 rounded-full bg-black text-white opacity-50 font-bold flex items-center gap-2"
                    >
                      <Play size={16} />
                      이어서 기도하기
                    </button>
                  )}

                  <button
                    onClick={handleStopRecording}
                    className="px-6 py-3 rounded-full bg-black text-white opacity-50 font-bold flex items-center gap-2"
                  >
                    <Square size={16} />
                    기도 종료
                  </button>
                </div>
              </motion.div>
            )}

            {showPlayback && !showSaveModal && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center px-6 w-full max-w-md flex flex-col items-center"
              >
                <h3 className="text-white opacity-50 text-lg font-bold mb-4">다시 듣기</h3>

                {/* 재생 버튼 */}
                <button
                  onClick={playRecordedAudio}
                  className="w-16 h-16 rounded-full bg-[#4A6741] opacity-50 text-white flex items-center justify-center mb-10"
                >
                  {recordedAudioRef.current && !recordedAudioRef.current.paused ? (
                    <Pause size={24} />
                  ) : (
                    <Play size={24} />
                  )}
                </button>

                {/* 재생바 */}
                <input
                  ref={audioProgressRef}
                  type="range"
                  min="0"
                  max={recordingTime}
                  step="0.1"
                  defaultValue="0"
                  onChange={handleSeek}
                  className="w-full mb-8"
                />

                {/* 버튼들 */}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleOpenSaveModal}
                    className="flex-1 py-3 rounded-full bg-black text-white opacity-50 font-medium flex items-center justify-center gap-1"
                  >
                    <Download size={16} />
                    저장
                  </button>

                  <button
                    onClick={handleSharePrayer}
                    className="flex-1 py-3 rounded-full bg-black text-white opacity-50 font-medium flex items-center justify-center gap-1"
                  >
                    <Share2 size={16} />
                    전달
                  </button>

                  <button
                    onClick={handleClosePrayer}
                    className="flex-1 py-3 rounded-full bg-black text-white opacity-50 font-medium flex items-center justify-center gap-1"
                  >
                    <X size={16} />
                    닫기
                  </button>
                </div>
              </motion.div>
            )}

            {showSaveModal && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md mx-6"
              >
                {!isSaving ? (
                  <>
                    <h3 className="text-xl font-bold text-zinc-800 mb-4">기도 저장</h3>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm text-zinc-600 mb-1">제목 (선택)</label>
                        <input
                          type="text"
                          value={saveTitle}
                          onChange={(e) => setSaveTitle(e.target.value)}
                          placeholder="제목을 입력하세요"
                          className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-600 mb-1">해그태그 (선택)</label>
                        <input
                          type="text"
                          value={saveHashtags}
                          onChange={(e) => setSaveHashtags(e.target.value)}
                          placeholder="#감사 #회개"
                          className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6741]/20"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowSaveModal(false)}
                        className="flex-1 py-3 rounded-lg bg-zinc-200 text-zinc-700 font-medium"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSavePrayer}
                        className="flex-1 py-3 rounded-lg bg-[#4A6741] text-white font-medium"
                      >
                        저장
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <h3 className="text-xl font-bold text-zinc-800 mb-6">음성 기도 파일을 저장하는 중...</h3>
                    {/* 네모박스 에너지바 */}
                    <div className="flex justify-center gap-1 mb-4">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded-none border border-zinc-300 ${savingProgress >= ((i + 1) * 5) ? 'bg-[#4A6741]' : 'bg-white'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-zinc-700">{savingProgress}%</span>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 기도제목 삭제 확인 모달 (TopBar 로그아웃 스타일) */}
      <AnimatePresence>
        {deleteTopicId !== null && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTopicId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[280px] rounded-[28px] bg-white p-8 text-center shadow-2xl"
            >
              <h4 className="mb-2 font-bold text-zinc-900" style={{ fontSize: `${fontSize}px` }}>
                기도제목을 삭제하시겠습니까?
              </h4>
              <p className="mb-6 text-zinc-500" style={{ fontSize: `${fontSize * 0.85}px` }}>
                이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTopicId(null)}
                  className="flex-1 rounded-xl bg-zinc-100 py-3 font-bold text-zinc-600 transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteTopic}
                  className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white shadow-lg shadow-red-200 transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 기도 기록 삭제 확인 모달 */}
      <AnimatePresence>
        {deleteRecordId !== null && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            {/* 배경 흐리게 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setDeleteRecordId(null); setDeleteRecordUrl(null); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />

            {/* 모달 본체 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-8 w-full max-w-[280px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize}px` }}>
                기도 기록을 삭제하시겠습니까?
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                이 작업은 되돌릴 수 없습니다.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteRecordId(null); setDeleteRecordUrl(null); }}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소
                </button>
                <button
                  onClick={confirmDeleteRecord}
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

      {/* 모임 연결 관련 모달 제거 */}

      {/* 모임 연결 관련 모달 제거 */}

      {/* 복사 완료 토스트 */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ opacity: 0, x: "-50%", y: 20 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium text-center whitespace-nowrap"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            복사되었습니다
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />
      <ActivityCalendarModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        selectedDate={currentDate}
        onSelectDate={handleDateChange}
        highlightedDateKeys={activityDateKeys}
        maxDate={todayRef.current}
        title="기도 날짜 선택"
      />
      {/* 모임에 기록 연결 모달 */}
      <ActivityGroupLinkModal
        open={showGroupLinkModal}
        onOpenChange={setShowGroupLinkModal}
        user={user ? { id: user.id } : null}
        activityType="prayer"
        activityDate={currentDate}
      />

    </div>
  );
}
