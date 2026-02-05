import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, Square, RotateCcw, Save, 
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
  const { fontSize = 16 } = useDisplaySettings();
  
  // Web Speech API 설정
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Web Speech API 지원 확인 및 초기화
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ko-KR';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript((prev) => {
          // 기존 텍스트에 최종 결과를 추가
          if (finalTranscript) {
            return prev + finalTranscript;
          }
          // 임시 결과는 표시만 (저장 안 함)
          return prev;
        });
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          console.log('음성이 감지되지 않았습니다.');
        }
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          // 자동으로 다시 시작 (continuous 모드가 중단될 경우)
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.log('Recognition already started');
          }
        }
      };
    } else {
      console.warn('Web Speech API를 지원하지 않는 브라우저입니다.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

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

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('이 브라우저는 음성인식을 지원하지 않습니다.');
      return;
    }

    if (!isRecording) {
      // 녹음 시작
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('음성인식을 시작할 수 없습니다.');
      }
    } else {
      // 녹음 중지
      try {
        recognitionRef.current.stop();
        setIsRecording(false);
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
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
            <div className="w-full h-full flex flex-col items-center justify-between gap-2">
              <div className="space-y-1">
              </div>

              {/* 음성 녹음 버튼 UI */}
              <div className="relative my-2">
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

              {/* 텍스트 입력 박스 (STT 결과) */}
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="음성을 녹음하면 이곳에 텍스트로 입력됩니다"
                className="w-full flex-1 p-4 rounded-2xl bg-zinc-50 border-none focus:ring-2 focus:ring-green-100 text-zinc-700 leading-relaxed resize-none text-[15px] placeholder:text-zinc-300"
                style={{ fontSize: `${fontSize * 0.9}px` }}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 오른쪽 힌트 카드 */}
        <div className="absolute right-[-75%] w-[82%] max-w-sm aspect-[4/5] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>
    </div>
  );
}