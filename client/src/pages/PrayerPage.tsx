import React, { useState, useEffect, useRef } from "react";
import { HandHeart, Plus, X, Mic, Square, Play, Pause, Check, Download, Share2, Copy, Trash2, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export default function PrayerPage() {
  const { user } = useAuth();
  const { fontSize = 16 } = useDisplaySettings();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 기도제목 관련 상태
  const [myTopics, setMyTopics] = useState<any[]>([]);
  const [publicTopics, setPublicTopics] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);

  // 기도 녹음 관련 상태
  const [isPrayingMode, setIsPrayingMode] = useState(false); // 전체 화면 모드
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [tempAudioUrl, setTempAudioUrl] = useState<string | null>(null); // temp 폴더 URL
  const [showPlayback, setShowPlayback] = useState(false); // 재생 화면
  const [showSaveModal, setShowSaveModal] = useState(false); // 저장 모달
  
  // 저장 모달 입력
  const [saveTitle, setSaveTitle] = useState("");
  const [saveHashtags, setSaveHashtags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  
  // 기도 기록
  const [prayerRecords, setPrayerRecords] = useState<any[]>([]);
  const [playingRecordId, setPlayingRecordId] = useState<number | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);
  const [showKeywords, setShowKeywords] = useState<number | null>(null);
  const [recordCurrentTime, setRecordCurrentTime] = useState<{[key: number]: number}>({});
  const [recordDuration, setRecordDuration] = useState<{[key: number]: number}>({});
  const [showCopyToast, setShowCopyToast] = useState(false);
  
  // 삭제 모달
  const [deleteTopicId, setDeleteTopicId] = useState<number | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<number | null>(null);
  const [deleteRecordUrl, setDeleteRecordUrl] = useState<string | null>(null);

  // 스크롤 애니메이션 관련 상태 (fade in/out)
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [topicOpacity, setTopicOpacity] = useState(1);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioProgressRef = useRef<HTMLInputElement>(null);

  // 데이터 로드
  useEffect(() => {
    if (user) {
      loadMyTopics();
      loadPrayerRecords();
    }
    loadPublicTopics();
  }, [user]);

  // 자동 fade 애니메이션 (6초마다)
  useEffect(() => {
    if (publicTopics.length === 0) return;

    const interval = setInterval(() => {
      // 1. Fade out (2초)
      setTopicOpacity(0);
      
      // 2. 2초 후 다음 주제로 변경
      setTimeout(() => {
        setCurrentTopicIndex(prev => (prev + 1) % publicTopics.length);
        
        // 3. Fade in (2초)
        setTimeout(() => {
          setTopicOpacity(1);
        }, 100);
      }, 2000);
    }, 6000);

    return () => clearInterval(interval);
  }, [publicTopics]);

  // 나의 기도제목 로드
  const loadMyTopics = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('prayer_topics')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setMyTopics(data);
  };

  // 공개된 기도제목 로드
  const loadPublicTopics = async () => {
    const { data, error } = await supabase
      .from('prayer_topics')
      .select('*, prayer_interactions(count)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // 랜덤 섞기
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setPublicTopics(shuffled);
    }
  };

  // 기도 녹음 기록 로드
  const loadPrayerRecords = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('prayer_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setPrayerRecords(data);
  };

  // 기도제목 추가
  const handleAddTopic = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!newTopic.trim()) return;

    const { error } = await supabase
      .from('prayer_topics')
      .insert({
        user_id: user.id,
        topic_text: newTopic.trim(),
        is_public: isPublic,
        prayer_count: 0
      });

    if (!error) {
      setNewTopic("");
      setIsPublic(false);
      setShowAddInput(false);
      await loadMyTopics();
      if (isPublic) await loadPublicTopics();
      if (window.navigator?.vibrate) window.navigator.vibrate(20);
    }
  };

  // 기도제목 삭제
  const handleDeleteTopic = async () => {
    if (!deleteTopicId) return;
    
    const { error } = await supabase
      .from('prayer_topics')
      .delete()
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

    if (!interactionError && !updateError) {
      await loadPublicTopics();
      if (window.navigator?.vibrate) window.navigator.vibrate([20, 50, 20]);
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

      // 2단계: STT 처리 (30% → 70%)
      const sttResponse = await fetch('/api/prayer/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: publicUrl })
      });

      let transcription = null;
      let keywords = null;
      
      if (sttResponse.ok) {
        const sttData = await sttResponse.json();
        transcription = sttData.transcription || null;
        keywords = sttData.keywords || null;
      }

      setSavingProgress(70);

      // 3단계: DB 저장 (70% → 90%)
      const hashtags = saveHashtags.trim() 
        ? saveHashtags.split('#').filter(tag => tag.trim()).map(tag => tag.trim())
        : [];

      const { error } = await supabase
        .from('prayer_records')
        .insert({
          user_id: user.id,
          audio_url: publicUrl,
          audio_duration: recordingTime,
          date: kstDate,
          title: saveTitle.trim() || '제목 없는 기도',
          hashtags,
          transcription,
          keywords
        });

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

      // R2에서 파일 삭제
      await fetch('/api/audio/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: deleteRecordUrl })
      });

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

  // 총 카운트 가져오기 (비로그인 사용자도 볼 수 있게)
  const getPrayerCount = (topic: any) => {
    return topic.prayer_count || 0;
  };

  return (
    <div className="relative w-full min-h-screen bg-[#F8F8F8] overflow-hidden pt-12 pb-6">
      {/* 상단: 공개된 기도제목 fade in/out */}
      <div className="relative h-[100px] pt-12 flex flex-col items-center justify-center px-6">
        {publicTopics.length > 0 && (
          <motion.div 
            className="w-full max-w-md flex items-center justify-center gap-2"
            animate={{ opacity: topicOpacity }}
            transition={{ duration: 5, delay: 2, ease: "easeInOut" }}
          >
            <p 
              className="text-zinc-500 text-left font-semibold flex-1 opacity-50"
              style={{ fontSize: `${fontSize * 0.85}px` }}
            >
              {publicTopics[currentTopicIndex]?.topic_text || ""}
            </p>
            <button
              onClick={() => handlePrayForTopic(publicTopics[currentTopicIndex]?.id)}
              className="flex items-center gap-1 text-[#4A6741] hover:scale-110 active:scale-95 transition-all"
              title="함께 기도하기"
            >
              <HandHeart size={18} strokeWidth={0.5} />
              <span className="text-xs font-medium opacity-50">
                {getPrayerCount(publicTopics[currentTopicIndex])}
              </span>
            </button>
          </motion.div>
        )}
      </div>

      {/* 중앙: 기도하기 버튼 */}
      <div className="flex items-center justify-center py-36">
        <motion.button
          onClick={handleStartPrayerMode}
          whileTap={{ scale: 0.95 }}
          className="w-32 h-32 rounded-full bg-[#4A6741] text-white shadow-2xl flex flex-col items-center justify-center gap-2"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        >
          <HandHeart size={32} strokeWidth={1.0} />
          <span className="font-medium" style={{ fontSize: `${fontSize * 0.9}px` }}>
            기도하기
          </span>
        </motion.button>
      </div>

      {/* 하단: 나의 기도제목 + 녹음 기록 */}
      <div className="px-6 pb-6">
        {/* 나의 기도제목 */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-[#4A6741]" style={{ fontSize: `${fontSize * 0.95}px` }}>
              기도 제목
            </h3>
            <button
              onClick={() => {
                if (!user) {
                  setShowLoginModal(true);
                  return;
                }
                setShowAddInput(true);
              }}
              className="text-[#4A6741] hover:text-[#3a5331] transition-colors"
              title="기도제목 추가"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-1">
            {myTopics.map((topic) => (
              <div key={topic.id} className="flex items-start gap-2 py-1.5">
                <span className="text-[#4A6741] mt-1.5" style={{ fontSize: '4px' }}>●</span>
                <p className="text-zinc-600 flex-1" style={{ fontSize: `${fontSize * 0.85}px` }}>
                  {topic.topic_text}
                </p>
                <div className="flex items-center gap-2">
                  {topic.is_public && (
                    <span className="text-xs text-[#4A6741] bg-[#4A6741]/10 px-2 py-0.5 rounded">공개</span>
                  )}
                  <button
                    onClick={() => setDeleteTopicId(topic.id)}
                    className="text-zinc-300 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* 추가 입력 폼 */}
            <AnimatePresence>
              {showAddInput ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white rounded-lg p-4 space-y-1"
                >
                  <textarea
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="기도제목을 입력하세요"
                    className="w-full h-15 bg-zinc-50 rounded-lg p-3 border-none focus:outline-none focus:ring-1 focus:ring-[#4A6741]/20 resize-none"
                    style={{ fontSize: `${fontSize * 0.85}px` }}
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-zinc-600">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="rounded"
                      />
                      공개하기
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowAddInput(false);
                          setNewTopic("");
                          setIsPublic(false);
                        }}
                        className="px-4 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddTopic}
                        className="px-4 py-2 rounded-full text-sm bg-[#4A6741] text-white font-medium"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* 기도 녹음 기록 */}
        {prayerRecords.length > 0 && (
          <div>
            <h3 className="font-medium text-[#4A6741] mb-3" style={{ fontSize: `${fontSize * 0.95}px` }}>
              기도 기록
            </h3>
            <div className="space-y-3">
              {prayerRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-normal text-[#4A6741] text-zinc-800 mb-1" style={{ fontSize: `${fontSize * 0.90}px` }}>
                        {record.title || '제목없음'}
                      </h4>
                      {record.hashtags && record.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {record.hashtags.map((tag: string, idx: number) => (
                            <span key={idx} className="text-xs text-[#4A6741] bg-[#4A6741]/10 px-2 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-zinc-500">
                        {new Date(record.created_at).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteRecord(record.id, record.audio_url)}
                      className="text-zinc-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* 재생 버튼 및 재생바 */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => playRecording(record.audio_url, record.id)}
                      className="w-10 h-10 flex-shrink-0 rounded-full bg-[#4A6741] text-white flex items-center justify-center"
                    >
                      {playingRecordId === record.id && audioRef.current && !audioRef.current.paused ? (
                        <Pause size={16} fill="white" />
                      ) : (
                        <Play size={16} fill="white" />
                      )}
                    </button>
                    <div className="flex-1 flex flex-col justify-center pt-0.5 gap-1.5 h-15">
                      <input
                        type="range"
                        min="0"
                        max={recordDuration[record.id] || 0}
                        value={recordCurrentTime[record.id] || 0}
                        onChange={(e) => handleRecordSeek(record.id, Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: recordDuration[record.id] > 0 
                            ? `linear-gradient(to right, #4A6741 0%, #4A6741 ${((recordCurrentTime[record.id] || 0) / recordDuration[record.id]) * 100}%, #e4e4e7 ${((recordCurrentTime[record.id] || 0) / recordDuration[record.id]) * 100}%, #e4e4e7 100%)`
                            : '#e4e4e7'
                        }}
                      />
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{Math.floor((recordCurrentTime[record.id] || 0) / 60)}:{String(Math.floor((recordCurrentTime[record.id] || 0) % 60)).padStart(2, '0')}</span>
                        <span>{Math.floor((recordDuration[record.id] || record.audio_duration) / 60)}:{String(Math.floor((recordDuration[record.id] || record.audio_duration) % 60)).padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>

                  {/* 텍스트 보기 */}
                  <div className="mt-2">
                    <button
                      onClick={() => record.transcription && setExpandedRecordId(expandedRecordId === record.id ? null : record.id)}
                      disabled={!record.transcription}
                      className={`w-full text-sm flex items-center justify-center gap-1 py-1 ${
                        record.transcription 
                          ? 'text-[#4A6741] cursor-pointer' 
                          : 'text-zinc-400 cursor-not-allowed'
                      }`}
                    >
                      {record.transcription ? '텍스트 보기' : '텍스트 분석 중...'}
                      {record.transcription && (expandedRecordId === record.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </button>
                    
                    <AnimatePresence>
                      {expandedRecordId === record.id && record.transcription && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-2 p-3 bg-zinc-50 rounded-lg text-sm text-zinc-700 overflow-hidden"
                        >
                          <p className="whitespace-pre-wrap">{record.transcription}</p>
                          <button
                            onClick={() => handleCopyText(record.transcription)}
                            className="mt-4 text-xs text-[#4A6741] text-zinc-400 text-sm flex items-center gap-1"
                          >
                            <Copy size={12} />
                            복사
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 키워드 시각화 */}
                  <div className="mt-2">
                    <button
                      onClick={() => (record.keywords && record.keywords.length > 0) && setShowKeywords(showKeywords === record.id ? null : record.id)}
                      disabled={!(record.keywords && record.keywords.length > 0)}
                      className={`w-full text-sm flex items-center justify-center gap-1 py-1 ${
                        (record.keywords && record.keywords.length > 0)
                          ? 'text-[#4A6741] cursor-pointer' 
                          : 'text-zinc-400 cursor-not-allowed'
                      }`}
                    >
                      <BarChart3 size={16} />
                      {(record.keywords && record.keywords.length > 0) ? '기도 키워드' : '키워드 분석 중...'}
                    </button>
                    
                    <AnimatePresence>
                      {showKeywords === record.id && record.keywords && record.keywords.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-2 p-3 bg-zinc-50 rounded-lg overflow-hidden"
                        >
                          <div className="space-y-2">
                            {record.keywords.slice(0, 10).map((kw: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-sm text-zinc-700 w-20">{kw.word}</span>
                                <div className="flex-1 h-4 bg-zinc-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#4A6741]"
                                    style={{ width: `${(kw.count / record.keywords[0].count) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-zinc-500">{kw.count}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
                <h2 className="text-gray-100 opacity-50 font-semibold mb-24" style={{ fontSize: `${fontSize * 1.2}px` }}>
                  주여, 내 기도를 들으소서
                </h2>
                
                <motion.button
                  onClick={handleStartRecording}
                  whileTap={{ scale: 0.95 }}
                  className="w-32 h-32 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center opacity-70 justify-center mb-6"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut"
                  }}
                >
                  <Mic size={48} />
                </motion.button>

                <p className="text-gray-100 opacity-50 text-xs max-w-md text-center leading-relaxed mb-18">
                  소리내어 울부짖지 않아도, 속삭이는 기도에도,<br />
                  마음속 외침에도 모두 듣고 계십니다
                </p>

                <button
                  onClick={handleClosePrayer}
                  className="mt-24 text-gray-100 opacity-50 text-xs underline"
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
                  className="w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center mb-8"
                >
                  <Mic size={64} className="text-red-500" />
                </motion.div>

                {/* 녹음 시간 */}
                <p className="text-5xl font-bold text-white mb-12">
                  {formatTime(recordingTime)}
                </p>

                {/* 버튼들 */}
                <div className="flex gap-3">
                  {!isPaused ? (
                    <button
                      onClick={handlePauseRecording}
                      className="px-6 py-3 rounded-full bg-white text-zinc-800 font-medium flex items-center gap-2"
                    >
                      <Pause size={20} />
                      일시정지
                    </button>
                  ) : (
                    <button
                      onClick={handleResumeRecording}
                      className="px-6 py-3 rounded-full bg-[#4A6741] text-white font-medium flex items-center gap-2"
                    >
                      <Play size={20} />
                      이어서 기도하기
                    </button>
                  )}

                  <button
                    onClick={handleStopRecording}
                    className="px-6 py-3 rounded-full bg-white text-zinc-800 font-bold flex items-center gap-2"
                  >
                    <Square size={20} />
                    종료
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
                <h3 className="text-white text-xl font-bold mb-6">기도 녹음 완료</h3>

                {/* 재생 버튼 */}
                <button
                  onClick={playRecordedAudio}
                  className="w-20 h-20 rounded-full bg-[#4A6741] text-white flex items-center justify-center mb-4"
                >
                  {recordedAudioRef.current && !recordedAudioRef.current.paused ? (
                    <Pause size={32} />
                  ) : (
                    <Play size={32} />
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
                    className="flex-1 py-3 rounded-full bg-[#4A6741] text-white font-medium flex items-center justify-center gap-1"
                  >
                    <Download size={18} />
                    저장
                  </button>
                  
                  <button
                    onClick={handleSharePrayer}
                    className="flex-1 py-3 rounded-full bg-white text-zinc-800 font-medium flex items-center justify-center gap-1"
                  >
                    <Share2 size={18} />
                    전달
                  </button>
                  
                  <button
                    onClick={handleClosePrayer}
                    className="flex-1 py-3 rounded-full bg-zinc-700 text-white font-medium"
                  >
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
                    <h3 className="text-xl font-bold text-zinc-800 mb-6">기도를 저장하는 중...</h3>
                    
                    {/* 에너지바 */}
                    <div className="relative w-full h-8 bg-zinc-200 rounded-full overflow-hidden mb-4">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#4A6741] to-[#6B9A5E] rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${savingProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-zinc-700">{savingProgress}%</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-zinc-500">
                      {savingProgress < 30 ? '파일을 이동하는 중...' : 
                       savingProgress < 70 ? '텍스트를 분석하는 중...' :
                       savingProgress < 90 ? '기도를 저장하는 중...' : '완료!'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 기도제목 삭제 확인 모달 */}
      <AlertDialog open={deleteTopicId !== null} onOpenChange={(open) => !open && setDeleteTopicId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기도제목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 기도제목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTopicId(null)}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTopic} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}
