import React from "react";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider"; // 1. 설정 훅 추가

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings(); // 2. 설정된 폰트 크기 가져오기

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert(error.message);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#F8F8F8] px-8 py-20">
      
      {/* 상단: 환영 메시지 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full text-center mt-12"
      >
        <span 
          className="text-[#4A6741] font-bold tracking-[0.2em] mb-4 block"
          style={{ fontSize: `${fontSize * 0.75}px` }} // 비율에 맞춘 크기 조절
        >
          QuietTime DIARY
        </span>
        <h1 
          className="font-black text-zinc-900 leading-[1.3] tracking-tighter"
          style={{ fontSize: `${fontSize * 1.8}px` }} // 제목은 기본보다 크게
        >
          우리의 기도가<br />
          <span className="text-[#4A6741]">기록되는 공간</span>
        </h1>
        <p 
          className="text-zinc-400 mt-6 font-medium leading-relaxed break-keep"
          style={{ fontSize: `${fontSize}px` }} // 본문 크기 기준
        >
          매일의 묵상(QT)과 중보를<br />
          음성으로 편하게 남겨보세요.
        </p>
      </motion.div>

      {/* 중단: 메인 로그인 버튼 영역 */}
      <div className="w-full max-w-sm space-y-6">
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={handleKakaoLogin}
          className="w-full h-[64px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[20px] shadow-[0_4px_12px_rgba(254,229,0,0.2)] flex items-center justify-center gap-3 transition-all"
          style={{ fontSize: `${fontSize * 1.05}px` }} // 버튼 텍스트 살짝 강조
        >
          <img 
            src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" 
            className="w-5 h-5" 
            alt="kakao" 
          />
          카카오로 3초만에 시작하기
        </motion.button>
        
        <p 
          className="text-center text-zinc-400 leading-relaxed px-4 opacity-70"
          style={{ fontSize: `${fontSize * 0.7}px` }} // 약관 등은 작게
        >
          로그인 시 서비스 이용약관 및<br />
          개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>

      {/* 하단: 보조 버튼 (이메일 로그인/회원가입) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-5 py-6">
          <Link href="/login-email">
            <a 
              className="text-zinc-500 font-semibold hover:text-[#4A6741] transition-colors"
              style={{ fontSize: `${fontSize * 0.9}px` }}
            >
              아이디 로그인
            </a>
          </Link>
          <span className="w-[1px] h-3 bg-zinc-300"></span>
          <Link href="/register">
            <a 
              className="text-zinc-500 font-semibold hover:text-[#4A6741] transition-colors"
              style={{ fontSize: `${fontSize * 0.9}px` }}
            >
              회원가입
            </a>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
