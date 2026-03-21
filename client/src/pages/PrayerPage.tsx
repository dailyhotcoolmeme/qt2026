import React, { useEffect, useMemo, useRef, useState } from "react";
import { LoginModal } from "../components/LoginModal";
import { motion, AnimatePresence } from "framer-motion";
import { HandHeart, Plus, CirclePlus, X, Mic, Heart, Square, Play, Pause, Check, ClipboardPen, Download, Share2, Copy, Trash2, BarChart3, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { ActivityGroupLinkModal } from "../components/ActivityGroupLinkModal";
import { ActivityCalendarModal } from "../components/ActivityCalendarModal";
import { AudioRecordPlayer } from "../components/AudioRecordPlayer";
import { shareContent } from "../lib/nativeShare";
import { isNativeApp, resolveApiUrl } from "../lib/appUrl";
import { shareBlobFile } from "../lib/nativeFileShare";

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
  const [showPlayback, setShowPlayback] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [prayerRecords, setPrayerRecords] = useState<any[]>([]);
  const [deleteRecordId, setDeleteRecordId] = useState<number | null>(null);
  const [deleteRecordUrl, setDeleteRecordUrl] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showAmenToast, setShowAmenToast] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGroupLinkModal, setShowGroupLinkModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [prayerSubTab, setPrayerSubTab] = useState<"topics" | "archive">("topics");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTopicGroupLinkModal, setShowTopicGroupLinkModal] = useState(false);
  const [topicGroupOptions, setTopicGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [selectedTopicGroupIds, setSelectedTopicGroupIds] = useState<string[]>([]);
  const [loadingTopicGroups, setLoadingTopicGroups] = useState(false);
  const [linkingTopics, setLinkingTopics] = useState(false);

  // ref
  const todayRef = useRef(new Date());
  const audioChunksRef = useRef<any[]>([]);
  const mediaRecorderRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);
  // 모임 연결 관련 useEffect 제거

  // 상태 변수 선언 바로 아래에 함수 선언
  const loadMyTopics = async () => {
    if (!user) return;
    const { data } = await supabase.from('prayer_topics').select('*').eq('user_id', user.id);
    setMyTopics([...(data || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
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

  const shouldAutoOpenPrayerGroupLinkModal = async (dateKey: string) => {
    if (!user?.id) return false;
    const { count, error } = await supabase
      .from('prayer_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('date', dateKey);

    if (error) {
      console.error('기도 첫 완료 확인 실패:', error);
      return false;
    }

    return (count || 0) === 0;
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
      const shouldOpenGroupLinkModal = await shouldAutoOpenPrayerGroupLinkModal(kstDate);
      const timestamp = Date.now();
      const targetPath = `audio/prayer/${user.id}/${kstDate}/prayer_${timestamp}.webm`;

      let publicUrl: string;

      // 1단계: 업로드 (20%)
      setSavingProgress(10);

      const reader = new FileReader();
      const uploadPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const response = await fetch(resolveApiUrl('/api/audio/upload'), {
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

      setSavingProgress(30);


      setSavingProgress(70);

      // 3단계: DB 저장 (70% → 90%)
      const { data: insertedRecord, error } = await supabase
        .from('prayer_records')
        .insert({
          user_id: user.id,
          audio_url: publicUrl,
          audio_duration: recordingTime,
          date: kstDate,
          title: saveTitle.trim() || '음성 기도',
          hashtags: []
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

      if (shouldOpenGroupLinkModal) {
        setTimeout(() => setShowGroupLinkModal(true), 150);
      }

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
      if (isNativeApp()) {
        await shareBlobFile(audioBlob, "prayer.webm", "기도 녹음", "나의 기도를 공유합니다");
        return;
      }


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

  const handleOpenGroupLinkModal = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setShowGroupLinkModal(true);
  };

  const handleOpenTopicGroupLinkModal = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setShowTopicGroupLinkModal(true);
  };

  useEffect(() => {
    const loadTopicGroupOptions = async () => {
      if (!user || !showTopicGroupLinkModal) return;
      setLoadingTopicGroups(true);
      const { data } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, menu_settings)")
        .eq("user_id", user.id);

      const seen = new Set<string>();
      const nextGroups: { id: string; name: string }[] = [];
      (data || []).forEach((row: any) => {
        const group = row.groups;
        if (!group || seen.has(group.id)) return;
        if (group.menu_settings && group.menu_settings.prayer === false) return;
        seen.add(group.id);
        nextGroups.push({ id: group.id, name: group.name });
      });

      setTopicGroupOptions(nextGroups);
      setSelectedTopicIds([]);
      setSelectedTopicGroupIds([]);
      setLoadingTopicGroups(false);
    };

    if (showTopicGroupLinkModal) {
      loadTopicGroupOptions();
    }
  }, [showTopicGroupLinkModal, user]);

  const handleLinkTopicsToGroups = async () => {
    if (!user) return;
    if (selectedTopicIds.length === 0 || selectedTopicGroupIds.length === 0) return;
    setLinkingTopics(true);

    try {
      const topicsToLink = visibleMyTopics.filter((topic) => selectedTopicIds.includes(topic.id));
      for (const groupId of selectedTopicGroupIds) {
        for (const topic of topicsToLink) {
          const content = String(topic.topic_text || "").trim();
          if (!content) continue;
          const { error } = await supabase.from("group_prayer_topics").insert({
            group_id: groupId,
            author_id: user.id,
            content,
            is_active: true,
          });
          if (error) {
            if (error.code === "42P01") {
              alert("기도제목 기능을 사용하려면 최신 DB 마이그레이션 적용이 필요합니다.");
              setLinkingTopics(false);
              return;
            }
          }
        }
      }

      alert("선택한 기도제목을 모임에 추가했습니다.");
      setShowTopicGroupLinkModal(false);
    } catch (error) {
      console.error("기도제목 모임 연결 실패:", error);
      alert("모임 연결에 실패했습니다.");
    } finally {
      setLinkingTopics(false);
    }
  };

  // 닫기
  const handleClosePrayer = () => {
    resetPrayerState();
  };

  // 상태 초기화
  const resetPrayerState = () => {
    setIsPrayingMode(false);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setShowPlayback(false);
    setShowSaveModal(false);
    setSaveTitle("");
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
      const shouldOpenGroupLinkModal = await shouldAutoOpenPrayerGroupLinkModal(kstDate);
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
        if (window.navigator?.vibrate) window.navigator.vibrate([20, 40, 20]);
        setShowAmenToast(true);
        setTimeout(() => {
          setShowAmenToast(false);
          setPrayerSubTab('archive');
          if (shouldOpenGroupLinkModal) {
            setTimeout(() => setShowGroupLinkModal(true), 250);
          }
        }, 1800);
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
        await fetch(resolveApiUrl('/api/audio/delete'), {
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

  const onCardDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) {
      moveDate(-1);
      return;
    }

    if (info.offset.x < -100 && selectedDateKey < todayDateKey) {
      moveDate(1);
    }
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

  const voicePrayerCount = selectedDateRecords.filter((record: any) => record?.audio_url && record.audio_url !== "amen").length;
  const heartPrayerCount = selectedDateRecords.filter((record: any) => !record?.audio_url || record.audio_url === "amen").length;

  const isVoicePrayerCompleted = voicePrayerCount > 0;
  const isHeartPrayerCompleted = heartPrayerCount > 0;

  const handleVoicePrayerClick = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!isToday) return;
    handleStartPrayerMode();
  };

  const handleHeartPrayerClick = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!isToday) return;
    void handleAmenClick();
  };

  const visibleMyTopics = myTopics.filter((topic) => {
    const createdDateKey = toLocalDateKey(topic.created_at) || selectedDateKey;
    const deletedDateKey = topic.is_public === null ? toLocalDateKey(topic.updated_at) : null;
    return createdDateKey <= selectedDateKey && (!deletedDateKey || selectedDateKey < deletedDateKey);
  });

  return (
    <div className="relative w-full min-h-screen bg-[#F8F8F8] overflow-x-hidden overflow-y-auto px-4 pt-[var(--app-page-top)] pb-4">
      <header className="relative mb-3 flex w-full flex-col items-center px-4 text-center">
        <p className="mb-1 font-bold tracking-[0.2em] text-gray-400" style={{ fontSize: `${fontSize * 0.8}px` }}>
          {currentDate.getFullYear()}
        </p>
        <div className="flex w-full items-center justify-center">
          <div className="flex flex-1 justify-end pr-3">
            <button
              onClick={() => setShowCalendarModal(true)}
              className="rounded-full border border-zinc-100 bg-white p-1.5 text-[#4A6741] shadow-sm transition-transform active:scale-95"
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
            </button>
          </div>

          <h2 className="shrink-0 font-black tracking-tighter text-zinc-900" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
          </h2>

          <div className="flex flex-1 justify-start pl-3">
            <div className="h-[28px] w-[28px]" aria-hidden="true" />
          </div>
        </div>
      </header>

      <div className="relative mb-12 flex w-full items-center justify-center overflow-visible py-4">
        <div className="absolute left-[-75%] z-0 w-[82%] max-w-sm h-[450px] scale-90 rounded-[32px] bg-white blur-[0.5px]" />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDate.toISOString()}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onCardDragEnd}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative z-10 flex w-[82%] max-w-sm h-[450px] touch-none cursor-grab flex-col overflow-hidden rounded-[32px] border border-white bg-white px-8 py-5 text-center shadow-[0_15px_45px_rgba(0,0,0,0.06)] active:cursor-grabbing"
          >
            <div className="flex h-full w-full flex-1 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <p className="font-black tracking-tight text-zinc-900" style={{ fontSize: `${fontSize * 1.1}px` }}>
                    음성기도
                  </p>
                  <p
                    className="mt-1 font-semibold text-zinc-400"
                    style={{ fontSize: `${Math.max(11, fontSize * 0.78)}px` }}
                  >
                    나의 음성기도를 보관하고 공유할 수 있습니다.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <AnimatePresence>
                      {isVoicePrayerCompleted && (
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

                    <motion.button
                      onClick={handleVoicePrayerClick}
                      whileTap={{ scale: 0.9 }}
                      disabled={!isToday}
                      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 relative z-10
                        ${isVoicePrayerCompleted
                          ? 'bg-[#4A6741] text-white border-none'
                          : 'bg-white text-gray-400 border border-green-50'
                        }
                        ${!isToday
                          ? 'cursor-not-allowed opacity-60'
                          : ''
                        }`}
                    >
                      <Mic className={`w-5 h-5 mb-1 ${isVoicePrayerCompleted ? 'animate-bounce' : ''}`} strokeWidth={2} />
                      <span className="font-bold" style={{ fontSize: `${fontSize * 0.85}px` }}>
                        {isVoicePrayerCompleted ? "기도완료" : "기도하기"}
                      </span>
                      {isVoicePrayerCompleted && (
                        <span className="font-bold opacity-70" style={{ fontSize: `${fontSize * 0.85}px` }}>
                          {voicePrayerCount.toLocaleString()}
                        </span>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="my-3 h-px w-1/2 mx-auto bg-zinc-200" />

              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <p className="font-black tracking-tight text-zinc-900" style={{ fontSize: `${fontSize * 1.1}px` }}>
                    마음기도
                  </p>
                  <p
                    className="mt-1 font-semibold text-zinc-400"
                    style={{ fontSize: `${Math.max(11, fontSize * 0.78)}px` }}
                  >
                    매일 마음 속 기도를 모아 기록을 남깁니다.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <AnimatePresence>
                      {isHeartPrayerCompleted && (
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

                    <motion.button
                      onClick={handleHeartPrayerClick}
                      whileTap={{ scale: 0.9 }}
                      disabled={!isToday}
                      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 relative z-10
                        ${isHeartPrayerCompleted
                          ? 'bg-[#4A6741] text-white border-none'
                          : 'bg-white text-gray-400 border border-green-50'
                        }
                        ${!isToday
                          ? 'cursor-not-allowed opacity-60'
                          : ''
                        }`}
                    >
                      <Heart
                        className={`w-5 h-5 mb-1 ${isHeartPrayerCompleted ? 'fill-white animate-bounce' : ''}`}
                        strokeWidth={isHeartPrayerCompleted ? 0 : 2}
                      />
                      <span className="font-bold" style={{ fontSize: `${fontSize * 0.85}px` }}>
                        {isHeartPrayerCompleted ? "기도완료" : "기도하기"}
                      </span>
                      {isHeartPrayerCompleted && (
                        <span className="font-bold opacity-70" style={{ fontSize: `${fontSize * 0.85}px` }}>
                          {heartPrayerCount.toLocaleString()}
                        </span>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute right-[-75%] z-0 w-[82%] max-w-sm h-[450px] scale-90 rounded-[32px] bg-white blur-[0.5px]" />
      </div>

      {/* 하단: 서브탭(기도 제목/기도 보관함) + 함께 기도해요 */}
      <div className="mx-auto mt-4 w-full max-w-sm px-0">
        <div className="mb-4 bg-white shadow-sm rounded-2xl border border-zinc-100 p-1.5 flex">
          <button
            onClick={() => setPrayerSubTab('topics')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center gap-1.5 ${
              prayerSubTab === 'topics' ? 'bg-zinc-200 text-zinc-800 shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <ClipboardPen size={15} />
            기도 제목
          </button>
          <button
            onClick={() => setPrayerSubTab('archive')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center gap-1.5 ${
              prayerSubTab === 'archive' ? 'bg-zinc-200 text-zinc-800 shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <Download size={15} />
            기도 보관함
          </button>
        </div>

        {prayerSubTab === 'topics' && (
          <div className="mb-10">
            {isToday && (
              <div className="flex items-center justify-end gap-2 mb-3">
                <button
                  onClick={handleOpenTopicGroupLinkModal}
                  className="px-3 py-1.5 bg-[#4A6741]/10 text-[#4A6741] text-xs font-bold rounded-full hover:bg-[#4A6741]/20 transition-colors flex items-center gap-1.5 shrink-0"
                  title="모임에 연결"
                >
                  <Share2 size={12} />
                  <span>모임에 연결</span>
                </button>
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

            <div className="w-full space-y-1 bg-white rounded-2xl p-2 shadow-sm border border-zinc-100">
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
                    className="text-zinc-600 font-bold flex-1 break-words whitespace-pre-wrap py-0.5"
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
                            <div className="bg-white p-4 flex items-center gap-3">
                              <Mic size={22} className="text-[#4A6741]/90 shrink-0" strokeWidth={1.5} />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#4A6741]/90" style={{ fontSize: `${fontSize * 0.90}px` }}>
                                  {record.title || '음성 기도'}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">{formattedDate}</p>
                                <AudioRecordPlayer
                                  variant="controlsOnly"
                                  src={record.audio_url}
                                  title={record.title || "음성 기도"}
                                  downloadName={`${record.title || 'prayer-record'}.webm`}
                                  className="mt-2"
                                />
                              </div>
                              <button
                                onClick={() => handleDeleteRecord(record.id, record.audio_url)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-red-300 hover:bg-red-50 transition-colors shrink-0"
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
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
                <AudioRecordPlayer
                  blob={audioBlob}
                  title="음성 기도 미리듣기"
                  downloadName="prayer-preview.webm"
                  className="w-full bg-white/95 border-white/20 shadow-xl"
                />

                {/* 버튼들 */}
                <div className="mt-6 flex gap-2 w-full">
                  <button
                    onClick={handleOpenSaveModal}
                    className="flex-1 py-3 rounded-full bg-black text-white opacity-50 font-medium flex items-center justify-center gap-1"
                  >
                    <Check size={16} />
                    저장
                  </button>

                  <button
                    onClick={handleSharePrayer}
                    className="flex-1 py-3 rounded-full bg-black text-white opacity-50 font-medium flex items-center justify-center gap-1"
                  >
                    <Share2 size={16} />
                    공유
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

      {/* 마음기도 완료 토스트 */}
      <AnimatePresence>
        {showAmenToast && (
          <motion.div
            initial={{ opacity: 0, x: "-50%", y: 20 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold text-center whitespace-nowrap"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            아멘! 기도했습니다 🙏
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* 기도제목 모임 연결 모달 */}
      <AnimatePresence>
        {showTopicGroupLinkModal && (
          <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTopicGroupLinkModal(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">모임에 연결</h3>
                <button
                  onClick={() => setShowTopicGroupLinkModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              </div>

              {loadingTopicGroups ? (
                <div className="py-10 text-center text-zinc-400 text-sm font-bold">불러오는 중...</div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-500 mb-2">현재 기도제목</h4>
                    {visibleMyTopics.length === 0 ? (
                      <div className="bg-zinc-50 rounded-2xl p-4 text-center text-zinc-400 text-sm font-bold">
                        등록된 기도제목이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1 pb-1">
                        {visibleMyTopics.map((topic) => {
                          const isSelected = selectedTopicIds.includes(topic.id);
                          return (
                            <button
                              key={topic.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedTopicIds((prev) => prev.filter((id) => id !== topic.id));
                                } else {
                                  setSelectedTopicIds((prev) => [...prev, topic.id]);
                                }
                              }}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? "border-[#4A6741] bg-[#4A6741]/5" : "border-zinc-100 hover:border-zinc-200 bg-white"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className={`text-sm font-bold break-words whitespace-pre-wrap ${isSelected ? "text-[#4A6741]" : "text-zinc-700"}`}>
                                  {topic.topic_text}
                                </span>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 mt-0.5 ${isSelected ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-transparent"
                                  }`}>
                                  <Check size={14} strokeWidth={4} />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-zinc-500 mb-2">연결할 모임 선택</h4>
                    {topicGroupOptions.length === 0 ? (
                      <div className="bg-zinc-50 rounded-2xl p-4 text-center text-zinc-400 text-sm font-bold">
                        연결 가능한 모임이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[24vh] overflow-y-auto pr-1 pb-1">
                        {topicGroupOptions.map((group) => {
                          const isSelected = selectedTopicGroupIds.includes(group.id);
                          return (
                            <button
                              key={group.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedTopicGroupIds((prev) => prev.filter((id) => id !== group.id));
                                } else {
                                  setSelectedTopicGroupIds((prev) => [...prev, group.id]);
                                }
                              }}
                              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? "border-[#4A6741] bg-[#4A6741]/5" : "border-zinc-100 hover:border-zinc-200 bg-white"
                                }`}
                            >
                              <span className={`font-bold ${isSelected ? "text-[#4A6741]" : "text-zinc-700"}`}>
                                {group.name}
                              </span>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? "bg-[#4A6741] text-white" : "bg-zinc-100 text-transparent"
                                }`}>
                                <Check size={14} strokeWidth={4} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLinkTopicsToGroups}
                    disabled={linkingTopics || selectedTopicIds.length === 0 || selectedTopicGroupIds.length === 0}
                    className="w-full h-14 bg-[#4A6741] text-white rounded-2xl text-base font-black shadow-lg shadow-green-900/10 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    {linkingTopics ? "연결 중..." : "선택한 기도제목을 모임에 추가"}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
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
