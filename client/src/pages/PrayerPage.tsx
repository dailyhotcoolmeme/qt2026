import React, { useState } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PrayerPage - myAmen 메인 페이지
 * 
 * 디자인 의도:
 * - 앱이 아닌 '기도 공간'처럼 느껴지도록
 * - 단 하나의 행동: "기도 녹음"
 * - 미니멀하고 명상적인 분위기
 */
export default function PrayerPage() {
  // 기도 준비 상태 (버튼 클릭 시)
  const [isPreparing, setIsPreparing] = useState(false);

  // 중앙 버튼 클릭 핸들러
  const handlePrayerStart = () => {
    setIsPreparing(true);
    // TODO: 기도 녹음 화면으로 이동하는 로직 추가
  };

  return (
    <div 
      className={`relative w-full min-h-screen flex flex-col transition-all duration-700 ${
        isPreparing ? 'bg-black' : 'bg-[#0a0a0a]'
      }`}
    >
      {/* 
        상단 영역 (20%)
        - 중앙 정렬 텍스트만
        - opacity 낮게
      */}
      <AnimatePresence>
        {!isPreparing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="h-[20vh] flex items-center justify-center px-8"
          >
            <p className="text-gray-400 text-center text-base tracking-wide opacity-50">
              주여, 나를 살피소서.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        중앙 영역 (60%)
        - 원형 버튼 하나만
        - breathing 애니메이션 (4-5초, scale 1 → 1.05)
      */}
      <div className="h-[60vh] flex items-center justify-center">
        <motion.button
          onClick={handlePrayerStart}
          className="relative w-48 h-48 rounded-full bg-[#1a1a1a] border border-gray-800 flex flex-col items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 4.5,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        >
          {/* 아이콘 */}
          <Heart className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
          
          {/* 텍스트 */}
          <span className="text-gray-300 text-base font-medium tracking-wide">
            지금 기도하기
          </span>
        </motion.button>
      </div>

      {/* 
        하단 영역 (20%)
        - BottomNav는 Layout에서 렌더링되므로 여기서는 공간만 확보
        - opacity는 BottomNav 컴포넌트에서 직접 제어하거나 CSS로 처리
      */}
      <div className="h-[20vh]" />

      {/* 
        기도 준비 상태 오버레이
        - 배경이 더 어두워짐
        - 추후 녹음 화면으로 전환 예정
      */}
      <AnimatePresence>
        {isPreparing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          >
            <p className="text-gray-500 text-sm tracking-wider">
              준비 중...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
