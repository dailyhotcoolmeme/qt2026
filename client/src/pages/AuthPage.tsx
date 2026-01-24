// AuthPage.tsx (개선 버전)
import React from "react";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion"; // 애니메이션 추가

export default function AuthPage() {
  const [, setLocation] = useLocation();

 const handleKakaoLogin = async () => {
  // 뒤에 슬래시나 해시를 붙이지 말고 도메인만 보냅니다.
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: window.location.origin // "http://localhost:5173" 만 전달됨
    }
  });
  if (error) alert(error.message);
};

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-white px-8 py-16">
      {/* 상단: 환영 메시지 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center mt-10"
      >
        <h1 className="text-3xl font-black text-gray-900 leading-tight">
          당신의 기도가<br />기록되는 공간
        </h1>
        <p className="text-gray-400 mt-4 font-medium">매일의 묵상과 중보를 음성으로 남겨보세요.</p>
      </motion.div>

      {/* 중단: 메인 로그인 버튼 (카카오) */}
      <div className="w-full space-y-4">
        <button 
          onClick={handleKakaoLogin}
          className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] text-lg font-bold rounded-[24px] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="kakao" />
          카카오로 3초만에 시작하기
        </button>
        
        <p className="text-center text-xs text-gray-300">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>

      {/* 하단: 보조 버튼 (일반 로그인) */}
      <div className="w-full space-y-4 pt-6 border-t border-gray-50">
        <div className="flex justify-center gap-6">
          <Link href="/login-email" className="text-gray-400 text-sm font-bold">이메일 로그인</Link>
          <span className="text-gray-200">|</span>
          <Link href="/register" className="text-gray-400 text-sm font-bold">회원가입</Link>
        </div>
      </div>
    </div>
  );
}