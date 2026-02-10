import React, { useState, useEffect, useRef } from "react";
import { Heart, Plus, X, Mic, Square, Play, Pause, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

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
  const [isPraying, setIsPraying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [prayerRecords, setPrayerRecords] = useState<any[]>([]);
  const [playingRecordId, setPlayingRecordId] = useState<number | null>(null);
  
  // 스크롤 애니메이션 관련 상태
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [scrollDirection, setScrollDirection] = useState(1);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 데이터 로드
  useEffect(() => {
    if (user) {
      loadMyTopics();
      loadPrayerRecords();
    }
    loadPublicTopics();
  }, [user]);

  // 자동 스크롤 애니메이션
  useEffect(() => {
    if (publicTopics.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentTopicIndex(prev => {
        const next = (prev + scrollDirection + publicTopics.length) % publicTopics.length;
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [publicTopics, scrollDirection]);

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

  // 기도 시작
  const handleStartPrayer = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setIsPraying(true);
    startRecording();
  };

  // 녹음 시작
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

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 권한이 필요합니다.');
      setIsPraying(false);
    }
  };

  // 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 기도 완료 (녹음 저장)
  const handleCompletePrayer = async () => {
    if (!audioBlob) return;

    try {
      // R2에 업로드
      const timestamp = Date.now();
      const fileName = `audio/prayer/${user!.id}/${new Date().toISOString().split('T')[0]}/prayer_${timestamp}.mp3`;
      
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

        // DB에 저장
        const { error } = await supabase
          .from('prayer_records')
          .insert({
            user_id: user!.id,
            audio_url: publicUrl,
            audio_duration: recordingTime,
            date: new Date().toISOString().split('T')[0]
          });

        if (error) throw error;

        // 상태 초기화
        setIsPraying(false);
        setAudioBlob(null);
        setRecordingTime(0);
        await loadPrayerRecords();
        
        if (window.navigator?.vibrate) window.navigator.vibrate(30);
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('기도 저장 실패:', error);
      alert('기도 저장 중 오류가 발생했습니다.');
    }
  };

  // 기도 취소
  const handleCancelPrayer = () => {
    if (isRecording) {
      stopRecording();
    }
    setIsPraying(false);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // 녹음 재생
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

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full min-h-screen bg-[#F8F8F8] overflow-hidden pb-24">
      {/* 상단: 공개된 기도제목 스크롤 영역 */}
      <div className="relative h-[35vh] flex items-center justify-center px-6 overflow-hidden pt-24">
        <AnimatePresence mode="wait">
          {publicTopics.length > 0 && (
            <motion.div
              key={currentTopicIndex}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              {/* 이전 기도제목 (연하게) */}
              <div className="text-center mb-4 opacity-30">
                <p className="text-sm text-zinc-500">
                  {publicTopics[(currentTopicIndex - 1 + publicTopics.length) % publicTopics.length]?.topic_text}
                </p>
              </div>

              {/* 현재 기도제목 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <p className="text-zinc-800 text-center leading-relaxed mb-4" style={{ fontSize: `${fontSize}px` }}>
                  {publicTopics[currentTopicIndex]?.topic_text}
                </p>
                <button
                  onClick={() => handlePrayForTopic(publicTopics[currentTopicIndex]?.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A6741]/5 rounded-xl text-[#4A6741] font-medium hover:bg-[#4A6741]/10 transition-colors"
                >
                  <Heart size={18} className="fill-current" />
                  <span>함께 기도하기</span>
                  <span className="text-sm opacity-60">
                    ({publicTopics[currentTopicIndex]?.prayer_interactions?.[0]?.count || 0})
                  </span>
                </button>
              </div>

              {/* 다음 기도제목 (연하게) */}
              <div className="text-center mt-4 opacity-30">
                <p className="text-sm text-zinc-500">
                  {publicTopics[(currentTopicIndex + 1) % publicTopics.length]?.topic_text}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 중앙: 기도하기 버튼 */}
      <div className="flex items-center justify-center py-8">
        <motion.button
          onClick={handleStartPrayer}
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
          <Heart size={32} className="fill-current" />
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
            <div className="space-y-2">
              {prayerRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => playRecording(record.audio_url, record.id)}
                        className="w-10 h-10 rounded-full bg-[#4A6741] text-white flex items-center justify-center"
                      >
                        {playingRecordId === record.id ? (
                          <Pause size={16} fill="white" />
                        ) : (
                          <Play size={16} fill="white" />
                        )}
                      </button>
                      <div>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 기도 녹음 오버레이 */}
      <AnimatePresence>
        {isPraying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center"
            >
              {/* 녹음 아이콘 */}
              <motion.div
                animate={{ scale: isRecording ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 1, repeat: isRecording ? Infinity : 0 }}
                className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-8"
              >
                <Mic size={48} className="text-red-500" />
              </motion.div>

              {/* 녹음 시간 */}
              <p className="text-4xl font-bold text-white mb-8">
                {formatTime(recordingTime)}
              </p>

              <p className="text-gray-400 mb-12">기도하는 중...</p>

              {/* 버튼들 */}
              <div className="flex gap-4">
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="px-8 py-4 rounded-full bg-white text-black font-bold flex items-center gap-2"
                  >
                    <Square size={20} />
                    녹음 중지
                  </button>
                ) : audioBlob ? (
                  <>
                    <button
                      onClick={handleCancelPrayer}
                      className="px-8 py-4 rounded-full bg-zinc-700 text-white font-bold"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCompletePrayer}
                      className="px-8 py-4 rounded-full bg-[#4A6741] text-white font-bold flex items-center gap-2"
                    >
                      <Check size={20} />
                      기도 완료
                    </button>
                  </>
                ) : null}
              </div>
            </motion.div>
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
