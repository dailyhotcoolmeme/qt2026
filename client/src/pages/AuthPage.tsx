// AuthPage.tsx (로직 통합 버전)
import React from "react";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        // 카카오로부터 닉네임, 이메일, 프로필 사진 권한을 요청
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: window.location.origin
      }
    });
    if (error) alert("로그인 에러: " + error.message);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#F8F8F8] px-8 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center mt-12"
      >
        <span className="text-[#4A6741] font-bold tracking-[0.2em] mb-4 block" style={{ fontSize: `${fontSize * 0.75}px` }}>
          PRAYER RECORD
        </span>
        <h1 className="font-black text-zinc-900 leading-[1.3] tracking-tighter" style={{ fontSize: `${fontSize * 1.8}px` }}>
          당신의 기도가<br />
          <span className="text-[#4A6741]">기록되는 공간</span>
        </h1>
        <p className="text-zinc-400 mt-6 font-medium leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
          매일의 묵상과 중보를<br />
          음성으로 편하게 남겨보세요.
        </p>
      </motion.div>

      <div className="w-full max-w-sm space-y-6">
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={handleKakaoLogin}
          className="w-full h-[64px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[20px] shadow-[0_4px_12px_rgba(254,229,0,0.1)] flex items-center justify-center gap-3"
          style={{ fontSize: `${fontSize * 1.05}px` }}
        >
          <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-5 h-5" alt="kakao" />
          카카오로 3초만에 시작하기
        </motion.button>
        
        <p className="text-center text-zinc-400 opacity-70" style={{ fontSize: `${fontSize * 0.7}px` }}>
          로그인 시 서비스 이용약관 및<br />개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-5 py-6">
          {/* 아이디 로그인 페이지로 연결 */}
          <Link href="/login-id">
            <a className="text-zinc-500 font-semibold" style={{ fontSize: `${fontSize * 0.9}px` }}>아이디 로그인</a>
          </Link>
          <span className="w-[1px] h-3 bg-zinc-300"></span>
          <Link href="/register-id">
            <a className="text-zinc-500 font-semibold" style={{ fontSize: `${fontSize * 0.9}px` }}>회원가입</a>
          </Link>
        </div>
      </div>
    </div>
  );
}
