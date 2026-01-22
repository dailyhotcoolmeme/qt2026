import React from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();

  // 사용자님이 말씀하신 '내기록함' 경로로 이동
  // 만약 내기록함 주소가 /record가 아니라면 해당 주소로 바꿔주세요.
  const goToRecord = () => {
    setLocation("/record"); 
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-6 overflow-hidden">
      <div className="w-full max-w-[400px] space-y-12 text-center">
        
        {/* 상단: 지저분한 여백이나 버튼 없이 깔끔하게 텍스트만 배치 */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">로그인이 필요합니다</h1>
          <p className="text-gray-400 font-bold leading-relaxed">
            기도와 묵상 기록을 보관하려면<br />
            내기록함에서 로그인을 진행해주세요.
          </p>
        </div>

        {/* 버튼 영역: 복잡한 폼 없이 이동 버튼만 배치 */}
        <div className="space-y-4">
          <button 
            onClick={goToRecord}
            className="w-full h-16 bg-[#7180B9] text-white text-xl font-black rounded-sm shadow-md active:scale-95 transition-transform"
          >
            로그인하러 가기
          </button>

          <button 
            onClick={() => setLocation("/")}
            className="w-full h-16 bg-white border border-gray-200 text-gray-400 text-xl font-bold rounded-sm active:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
}
