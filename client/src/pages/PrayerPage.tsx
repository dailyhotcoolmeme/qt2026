import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, Square, Play, Pause, X,
  Calendar as CalendarIcon, Headphones, Share2, Bookmark, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function KneesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // 기도 관련 상태
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { fontSize = 16 } = useDisplaySettings();
  
  // 저장된 기도 목록
  interface SavedPrayer {
    id: string;
    audioURL: string;
    transcript: string;
    timestamp: Date;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
  }
  const [savedPrayers, setSavedPrayers] = useState<SavedPrayer[]>([]);
  const [playingPrayerId, setPlayingPrayerId] = useState<string | null>(null);
  
  // 오디오 및 음성인식 참조
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousAudioBlobsRef = useRef<Blob[]>([]); // 이전 녹음 저장

  useEffect(() => {
    // Web Speech API 초기화
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ko-KR';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // 오디오 재생 시간 업데이트
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioURL]);

  // 날짜 변경 핸들러 (DailyWordPage와 동일)
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      if (selectedDate > today) {
        alert("미래의 날짜에 기도를 미리 기록할 수 없습니다.");
        return;
      }
      setCurrentDate(selectedDate);
    }
  };

  // 스와이프 로직 (DailyWordPage와 동일)
  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) { // 이전 날짜로
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (info.offset.x < -100) { // 다음 날짜로
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) setCurrentDate(d);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      // 녹음 시작
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // MediaRecorder 시작
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const newAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // 이전 녹음이 있으면 합치기
          let finalBlob: Blob;
          if (previousAudioBlobsRef.current.length > 0) {
            // 모든 Blob을 합침
            const allBlobs = [...previousAudioBlobsRef.current, newAudioBlob];
            finalBlob = new Blob(allBlobs, { type: 'audio/webm' });
          } else {
            finalBlob = newAudioBlob;
          }
          
          const url = URL.createObjectURL(finalBlob);
          setAudioURL(url);
          
          // 오디오 엘리먼트 생성
          audioRef.current = new Audio(url);
          
          // 현재 녹음을 이전 녹음 목록에 저장
          previousAudioBlobsRef.current.push(newAudioBlob);
          
          stream.getTracks().forEach(track => track.stop());
        };

        /*mediaRecorder.start();*/
        
        // STT 시작
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
        
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('마이크 접근 권한이 필요합니다.');
      }
    } else {
      // 녹음 중지
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleReset = () => {
    setAudioURL(null);
    setTranscript("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    previousAudioBlobsRef.current = []; // 이전 녹음 초기화
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handleContinueRecording = async () => {
    // 이어서 녹음 - 기존 녹음과 텍스트는 유지
    setAudioURL(null); // 재생 UI 숨기고 다시 녹음 시작
    setIsPlaying(false);
    await toggleRecording();
  };

  const handleSavePrayer = () => {
    if (!audioURL || !transcript.trim()) {
      alert('녹음 또는 텍스트가 없습니다.');
      return;
    }

    const newPrayer: SavedPrayer = {
      id: Date.now().toString(),
      audioURL: audioURL,
      transcript: transcript,
      timestamp: new Date(),
      isPlaying: false,
      currentTime: 0,
      duration: duration,
    };

    setSavedPrayers((prev) => [newPrayer, ...prev]);
    
    // 초기화
    handleReset();
  };

  const toggleSavedPrayerPlayback = (prayerId: string) => {
    const prayer = savedPrayers.find(p => p.id === prayerId);
    if (!prayer) return;

    // 다른 기도 재생 중이면 멈춤
    if (playingPrayerId && playingPrayerId !== prayerId) {
      const prevAudio = document.getElementById(`audio-${playingPrayerId}`) as HTMLAudioElement;
      if (prevAudio) {
        prevAudio.pause();
      }
    }

    const audio = document.getElementById(`audio-${prayerId}`) as HTMLAudioElement;
    if (!audio) return;

    if (playingPrayerId === prayerId) {
      audio.pause();
      setPlayingPrayerId(null);
    } else {
      audio.play();
      setPlayingPrayerId(prayerId);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <input 
            type="date"
            ref={dateInputRef}
            onChange={handleDateChange}
            max={new Date().toISOString().split("T")[0]} 
            className="absolute opacity-0 pointer-events-none"
          />
        </div>
      </header>

      {/* [대원칙] 2. 메인 카드 영역 (동일 사이즈 + 스와이프 적용) */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
        {/* 왼쪽 힌트 카드 */}
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
            className="w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center p-8 text-center z-10 touch-none"
          >
            {/* 기도 입력 컨텐츠 */}
            <div className="w-full h-full flex flex-col gap-4">
              <h3 className="font-bold text-[#4A6741] text-sm tracking-wide">오늘의 기도</h3>

              {/* 음성 녹음/재생 UI */}
              {!audioURL ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <div className="relative">
                    <AnimatePresence>
                      {isRecording && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.4, opacity: 0.15 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute inset-0 bg-red-500 rounded-full"
                        />
                      )}
                    </AnimatePresence>
                    <button
                      onClick={toggleRecording}
                      className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                        isRecording ? 'bg-red-500 text-white' : 'bg-[#4A6741] text-white'
                      }`}
                    >
                      {isRecording ? <Square className="w-7 h-7 fill-current" /> : <Mic className="w-8 h-8" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    {isRecording ? '기도 중...' : '마이크를 눌러 기도를 시작하세요'}
                  </p>
                  
                  {/* 녹음 중 실시간 텍스트 표시 */}
                  {isRecording && transcript && (
                    <div className="w-full flex-1 bg-gray-50 rounded-2xl p-3 overflow-y-auto mt-2">
                      <p className="text-sm text-gray-600 leading-relaxed text-left whitespace-pre-wrap">
                        {transcript}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 flex-1">
                  {/* 재생 컨트롤 - 깔끔한 디자인 */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={togglePlayback}
                      className="w-12 h-12 rounded-full bg-[#4A6741] text-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                    <button
                      onClick={handleContinueRecording}
                      className="px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-medium shadow-sm active:scale-95 transition-all"
                    >
                      이어서 녹음
                    </button>
                    <button
                      onClick={handleSavePrayer}
                      className="px-3 py-2 rounded-full bg-[#4A6741] text-white text-xs font-medium shadow-sm active:scale-95 transition-all"
                    >
                      기도 저장
                    </button>
                  </div>

                  {/* 재생 바 */}
                  <div className="w-full space-y-1.5 px-2">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#4A6741]"
                      style={{
                        background: `linear-gradient(to right, #4A6741 0%, #4A6741 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* 텍스트 미리보기 */}
                  <div className="flex-1 bg-gray-50 rounded-2xl p-3 overflow-y-auto">
                    <p className="text-xs text-gray-600 leading-relaxed text-left whitespace-pre-wrap">
                      {transcript || '텍스트가 없습니다.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 오른쪽 힌트 카드 */}
        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      {/* 저장된 기도 목록 */}
      {savedPrayers.length > 0 && (
        <div className="w-full max-w-sm mt-6 space-y-3 px-4 pb-8">
          <h3 className="text-xs font-semibold text-gray-400 tracking-wide">저장된 기도</h3>
          {savedPrayers.map((prayer) => (
            <motion.div
              key={prayer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3"
            >
              {/* 오디오 엘리먼트 (숨김) */}
              <audio
                id={`audio-${prayer.id}`}
                src={prayer.audioURL}
                onEnded={() => setPlayingPrayerId(null)}
              />

              {/* 재생 컨트롤 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSavedPrayerPlayback(prayer.id)}
                  className="w-9 h-9 rounded-full bg-[#4A6741] text-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
                >
                  {playingPrayerId === prayer.id ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400">
                    {prayer.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* 텍스트 */}
              <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {prayer.transcript}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
