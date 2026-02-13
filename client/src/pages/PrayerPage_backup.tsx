import React, { useState, useEffect, useRef } from "react";
import { HandHeart, Plus, X, Mic, Square, Play, Pause, Check, Download, Share2, Copy, Trash2, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

// 타이핑 효과 컴포넌트
const TypingText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let currentText = "";
    setDisplayedText("");
    const characters = text.split("");
    let i = 0;

    const interval = setInterval(() => {
      if (i < characters.length) {
        currentText += characters[i];
        setDisplayedText(currentText);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [text]);

  return <>{displayedText}</>;
};

export default function PrayerPage() {
  const { user } = useAuth();
  const { fontSize = 16 } = useDisplaySettings();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 기도제목 관련 상태
  const [myTopics, setMyTopics] = useState<any[]>([]);
  const [publicTopics, setPublicTopics] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);

  // 기도 녹음 관련 상태
  const [isPrayingMode, setIsPrayingMode] = useState(false); // 전체 화면 모드
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showPlayback, setShowPlayback] = useState(false); // 재생 화면
  const [showSaveModal, setShowSaveModal] = useState(false); // 저장 모달
  
  // 저장 모달 입력
  const [saveTitle, setSaveTitle] = useState("");
  const [saveHashtags, setSaveHashtags] = useState("");
  
  // 기도 기록
  const [prayerRecords, setPrayerRecords] = useState<any[]>([]);
  const [playingRecordId, setPlayingRecordId] = useState<number | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);
  const [showKeywords, setShowKeywords] = useState<number | null>(null);

  // 스크롤 애니메이션 관련 상태 (한 줄씩 위로)
  const [visibleTopics, setVisibleTopics] = useState<any[]>([]);
  const [topicOffset, setTopicOffset] = useState(0);

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

  // 자동 스크롤 애니메이션 (한 줄씩 6초마다)
  useEffect(() => {
    if (publicTopics.length === 0) return;

    // 초기 3줄 설정
    setVisibleTopics([
      publicTopics[0],
      publicTopics[1 % publicTopics.length],
      publicTopics[2 % publicTopics.length],
    ]);

    const interval = setInterval(() => {
      setTopicOffset(prev => (prev + 1) % publicTopics.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [publicTopics]);

  // topicOffset이 변경될 때마다 visibleTopics 업데이트
  useEffect(() => {
    if (publicTopics.length === 0) return;
    
    const topics = [
      publicTopics[(topicOffset) % publicTopics.length],
      publicTopics[(topicOffset + 1) % publicTopics.length],
      publicTopics[(topicOffset + 2) % publicTopics.length],
    ];
    setVisibleTopics(topics);
  }, [topicOffset, publicTopics]);

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
  const handleDeleteTopic = async (id: number) => {
    const { error } = await supabase
      .from('prayer_topics')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadMyTopics();
      await loadPublicTopics();
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
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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
      // R2에 업로드
      const timestamp = Date.now();
      const fileName = `audio/prayer/${user.id}/${new Date().toISOString().split('T')[0]}/prayer_${timestamp}.mp3`;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            audioBase64: base64
          })
        });

        if (!response.ok) throw new Error('업로드 실패');

        const { publicUrl } = await response.json();

        // STT 처리 요청
        const sttResponse = await fetch('/api/prayer/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: publicUrl
          })
        });

        let transcription = '';
        let keywords = [];
        
        if (sttResponse.ok) {
          const sttData = await sttResponse.json();
          transcription = sttData.transcription || '';
          keywords = sttData.keywords || [];
        }

        // DB에 저장
        const hashtags = saveHashtags.trim() 
          ? saveHashtags.split('#').filter(tag => tag.trim()).map(tag => tag.trim())
          : [];

        const { error } = await supabase
          .from('prayer_records')
          .insert({
            user_id: user.id,
            audio_url: publicUrl,
            audio_duration: recordingTime,
            date: new Date().toISOString().split('T')[0],
            title: saveTitle.trim() || '제목 없는 기도',
            hashtags,
            transcription,
            keywords
          });

        if (error) throw error;

        // 상태 초기화
        resetPrayerState();
        await loadPrayerRecords();

        if (window.navigator?.vibrate) window.navigator.vibrate(30);
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('기도 저장 실패:', error);
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
    setSaveHashtags("");
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause();
      recordedAudioRef.current = null;
    }
  };

  // 기도 기록 재생
  const playRecording = (audioUrl: string, recordId: number) => {
    if (playingRecordId === recordId && audioRef.current) {
      audioRef.current.pause();
      setPlayingRecordId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingRecordId(recordId);

    audio.addEventListener('ended', () => {
      setPlayingRecordId(null);
    });

    audio.play();
  };

  // 기도 기록 삭제
  const handleDeleteRecord = async (id: number, audioUrl: string) => {
    if (!confirm('이 기도 기록을 삭제하시겠습니까?')) return;

    try {
      // DB에서 삭제
      const { error } = await supabase
        .from('prayer_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // R2에서 파일 삭제
      await fetch('/api/audio/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl })
      });

      await loadPrayerRecords();
      if (window.navigator?.vibrate) window.navigator.vibrate(20);
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('기도 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  // 텍스트 복사
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('텍스트가 복사되었습니다.');
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
    <div className="relative w-full min-h-screen bg-[#F8F8F8] overflow-hidden pb-24">
      {/* 상단: 공개된 기도제목 스크롤 영역 (한 줄씩 위로) */}
      <div className="relative h-[160px] pt-6 flex flex-col items-center justify-center px-6 overflow-hidden">
        {visibleTopics.length > 0 && (
          <div className="w-full max-w-md flex flex-col items-center gap-2">
            {visibleTopics.map((topic, index) => (
              <AnimatePresence key={`topic-${topic?.id}-${topicOffset}-${index}`} mode="wait">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: index === 1 ? 1 : 0.3,
                    scale: index === 1 ? 1 : 0.9
                  }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <p 
                    className={`text-zinc-800 text-center ${index === 1 ? 'font-bold' : 'font-normal'}`}
                    style={{ fontSize: `${fontSize * (index === 1 ? 1.0 : 0.85)}px` }}
                  >
                    {index === 1 ? <TypingText text={topic?.topic_text || ""} /> : topic?.topic_text}
                  </p>
                  {index === 1 && (
                    <button
                      onClick={() => handlePrayForTopic(topic?.id)}
                      className="flex items-center gap-1 text-[#4A6741] hover:scale-110 active:scale-95 transition-all"
                      title="함께 기도하기"
                    >
                      <HandHeart size={18} className="fill-current" />
                      <span className="text-xs font-bold opacity-70">
                        {getPrayerCount(topic)}
                      </span>
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
            ))}
          </div>
        )}
      </div>

      {/* 중앙: 기도하기 버튼 */}
      <div className="flex items-center justify-center py-8">
        <motion.button
          onClick={handleStartPrayerMode}
          whileTap={{ scale: 0.95 }}
          className="w-32 h-32 rounded-full bg-[#4A6741] text-white shadow-2xl flex flex-col items-center justify-center gap-2"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <HandHeart size={32} className="fill-current" />
          <span className="font-bold" style={{ fontSize: `${fontSize * 0.9}px` }}>
            기도하기
          </span>
        </motion.button>
      </div>

      {/* 하단: 나의 기도제목 + 녹음 기록 */}
      <div className="px-6 pb-24">
        {/* 나의 기도제목 */}
        <div className="mb-6">
          <h3 className="font-bold text-[#4A6741] mb-3" style={{ fontSize: `${fontSize * 0.95}px` }}>
            나의 기도제목
          </h3>

          <div className="space-y-2">
            {myTopics.map((topic) => (
              <div key={topic.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
                <p className="text-zinc-700 flex-1" style={{ fontSize: `${fontSize * 0.9}px` }}>
                  {topic.topic_text}
                </p>
                <div className="flex items-center gap-2">
                  {topic.is_public && (
                    <span className="text-xs text-[#4A6741] bg-[#4A6741]/10 px-2 py-1 rounded">공개</span>
                  )}
                  <button
                    onClick={() => handleDeleteTopic(topic.id)}
                    className="text-zinc-400 hover:text-red-500"
                  >
                    <X size={18} />
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
                  className="bg-white rounded-xl p-4 space-y-3"
                >
                  <textarea
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="기도제목을 입력하세요"
                    className="w-full h-20 bg-zinc-50 rounded-lg p-3 border-none focus:outline-none focus:ring-1 focus:ring-[#4A6741]/20 resize-none"
                    style={{ fontSize: `${fontSize * 0.9}px` }}
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
                        className="px-4 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddTopic}
                        className="px-4 py-2 rounded-lg bg-[#4A6741] text-white font-medium"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => {
                    if (!user) {
                      setShowLoginModal(true);
                      return;
                    }
                    setShowAddInput(true);
                  }}
                  className="w-full py-3 bg-white border border-dashed border-[#4A6741]/30 text-[#4A6741] rounded-xl font-medium hover:bg-[#4A6741]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  기도제목 추가하기
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 기도 녹음 기록 */}
        {prayerRecords.length > 0 && (
          <div>
            <h3 className="font-bold text-[#4A6741] mb-3" style={{ fontSize: `${fontSize * 0.95}px` }}>
              기도 기록
            </h3>
            <div className="space-y-3">
              {prayerRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-zinc-800 mb-1" style={{ fontSize: `${fontSize * 0.95}px` }}>
                        {record.title || '제목 없는 기도'}
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
                      <p className="text-sm text-zinc-500">
                        {new Date(record.created_at).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-zinc-400">{formatTime(record.audio_duration)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteRecord(record.id, record.audio_url)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* 재생 버튼 */}
                  <button
                    onClick={() => playRecording(record.audio_url, record.id)}
                    className="w-full py-2 rounded-lg bg-[#4A6741] text-white flex items-center justify-center gap-2 mb-2"
                  >
                    {playingRecordId === record.id ? (
                      <>
                        <Pause size={16} />
                        재생 중
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        재생
                      </>
                    )}
                  </button>

                  {/* 텍스트 보기 */}
                  {record.transcription && (
                    <div className="mt-2">
                      <button
                        onClick={() => setExpandedRecordId(expandedRecordId === record.id ? null : record.id)}
                        className="w-full text-sm text-[#4A6741] flex items-center justify-center gap-1 py-1"
                      >
                        텍스트 보기
                        {expandedRecordId === record.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      
                      <AnimatePresence>
                        {expandedRecordId === record.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 p-3 bg-zinc-50 rounded-lg text-sm text-zinc-700 overflow-hidden"
                          >
                            <p className="whitespace-pre-wrap">{record.transcription}</p>
                            <button
                              onClick={() => handleCopyText(record.transcription)}
                              className="mt-2 text-xs text-[#4A6741] flex items-center gap-1"
                            >
                              <Copy size={12} />
                              복사
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* 키워드 시각화 */}
                  {record.keywords && record.keywords.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => setShowKeywords(showKeywords === record.id ? null : record.id)}
                        className="w-full text-sm text-[#4A6741] flex items-center justify-center gap-1 py-1"
                      >
                        <BarChart3 size={16} />
                        기도 키워드
                      </button>
                      
                      <AnimatePresence>
                        {showKeywords === record.id && (
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
                                  <div className="flex-1 h-5 bg-zinc-200 rounded-full overflow-hidden">
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
                  )}
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
                className="text-center px-6"
              >
                <h2 className="text-white text-2xl font-bold mb-8">
                  주여, 내 기도를 들으소서
                </h2>
                
                <motion.button
                  onClick={handleStartRecording}
                  whileTap={{ scale: 0.95 }}
                  className="w-32 h-32 rounded-full bg-[#4A6741] text-white shadow-2xl flex items-center justify-center mb-8"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Mic size={48} />
                </motion.button>

                <p className="text-gray-500 text-sm max-w-md">
                  소리내어 울부짖지 않아도, 속삭이는 기도에도,<br />
                  마음속 외침에도 모두 듣고 계십니다
                </p>

                <button
                  onClick={handleClosePrayer}
                  className="mt-8 text-gray-600 underline"
                >
                  닫기
                </button>
              </motion.div>
            )}

            {isRecording && !showPlayback && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                {/* 녹음 아이콘 */}
                <motion.div
                  animate={{ 
                    scale: isPaused ? 1 : [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: isPaused ? 0 : Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-8"
                >
                  <Mic size={64} className="text-red-500" />
                </motion.div>

                {/* 녹음 시간 */}
                <p className="text-5xl font-bold text-white mb-12">
                  {formatTime(recordingTime)}
                </p>

                {/* 일시정지/재개 버튼 */}
                {!isPaused ? (
                  <button
                    onClick={handlePauseRecording}
                    className="mb-4 px-6 py-3 rounded-full bg-zinc-700 text-white font-medium flex items-center gap-2 mx-auto"
                  >
                    <Pause size={20} />
                    일시정지
                  </button>
                ) : (
                  <button
                    onClick={handleResumeRecording}
                    className="mb-4 px-6 py-3 rounded-full bg-[#4A6741] text-white font-medium flex items-center gap-2 mx-auto"
                  >
                    <Play size={20} />
                    이어서 기도하기
                  </button>
                )}

                {/* 종료 버튼 */}
                <button
                  onClick={handleStopRecording}
                  className="px-8 py-4 rounded-full bg-white text-black font-bold flex items-center gap-2 mx-auto"
                >
                  <Square size={20} />
                  기도 종료
                </button>
              </motion.div>
            )}

            {showPlayback && !showSaveModal && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center px-6 w-full max-w-md"
              >
                <h3 className="text-white text-xl font-bold mb-6">기도 녹음 완료</h3>

                {/* 재생 버튼 */}
                <button
                  onClick={playRecordedAudio}
                  className="w-20 h-20 rounded-full bg-[#4A6741] text-white flex items-center justify-center mx-auto mb-4"
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
                <div className="space-y-3">
                  <button
                    onClick={handleOpenSaveModal}
                    className="w-full py-3 rounded-full bg-[#4A6741] text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    기도 저장하기
                  </button>
                  
                  <button
                    onClick={handleSharePrayer}
                    className="w-full py-3 rounded-full bg-zinc-700 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Share2 size={20} />
                    기도 전달하기
                  </button>
                  
                  <button
                    onClick={handleClosePrayer}
                    className="w-full py-3 rounded-full bg-zinc-800 text-white font-medium"
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
              </motion.div>
            )}
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
