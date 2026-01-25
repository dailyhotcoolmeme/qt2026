import React, { useState } from "react";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  
  // 1. 개별 약관 동의 상태로 수정 (이용약관, 개인정보)
  const [agreements, setAgreements] = useState({
    service: false,
    privacy: false
  });

  // 두 항목 모두 동의했는지 확인
  const isAllAgreed = agreements.service && agreements.privacy;

  const handleKakaoLogin = async () => {
    if (!isAllAgreed) {
      alert("이용약관 및 개인정보 처리방침에 모두 동의해 주세요.");
      return;
    }

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
      
      {/* 상단: 환영 메시지 (유지) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full text-center mt-12"
      >
        <span 
          className="text-[#4A6741] font-bold tracking-[0.2em] mb-4 block uppercase"
          style={{ fontSize: `${fontSize * 0.70}px` }}
        >
          QuietTime Diary
        </span>
        <h1 
          className="font-black text-zinc-900 leading-[1.3] tracking-tighter"
          style={{ fontSize: `${fontSize * 1.8}px` }}
        >
          우리의 기도가<br />
          <span className="text-[#4A6741]">기억되는 공간</span>
        </h1>
        <p 
          className="text-zinc-400 mt-6 font-medium leading-relaxed break-keep"
          style={{ fontSize: `${fontSize}px` }}
        >
          매일의 묵상(QT)과 중보를<br />
          음성으로 기록하고 보관하세요.
        </p>
      </motion.div>

      {/* 중단: 로그인 및 약관 영역 */}
      <div className="w-full max-w-sm space-y-5">
        
        {/* 2. 세분화된 약관 동의 체크박스 */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="service-agree" 
              checked={agreements.service}
              onChange={(e) => setAgreements(prev => ({ ...prev, service: e.target.checked }))}
              className="w-4 h-4 accent-[#4A6741] cursor-pointer"
            />
            <label htmlFor="service-agree" className="text-zinc-600 font-medium cursor-pointer" style={{ fontSize: `${fontSize * 0.85}px` }}>
              (필수) <Link href="/terms/service"><a className="underline underline-offset-4 decoration-zinc-300">이용약관</a></Link>에 동의합니다
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="privacy-agree" 
              checked={agreements.privacy}
              onChange={(e) => setAgreements(prev => ({ ...prev, privacy: e.target.checked }))}
              className="w-4 h-4 accent-[#4A6741] cursor-pointer"
            />
            <label htmlFor="privacy-agree" className="text-zinc-600 font-medium cursor-pointer" style={{ fontSize: `${fontSize * 0.85}px` }}>
              (필수) <Link href="/terms/privacy"><a className="underline underline-offset-4 decoration-zinc-300">개인정보 처리방침</a></Link>에 동의합니다
            </label>
          </div>
        </div>

        <motion.button 
          whileTap={isAllAgreed ? { scale: 0.96 } : {}}
          onClick={handleKakaoLogin}
          className={`w-full h-[64px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[20px] shadow-[0_4px_12px_rgba(254,229,0,0.2)] flex items-center justify-center gap-3 transition-all ${!isAllAgreed ? 'opacity-60 cursor-not-allowed text-zinc-500' : 'opacity-100'}`}
          style={{ fontSize: `${fontSize * 1.05}px` }}
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
          style={{ fontSize: `${fontSize * 0.7}px` }}
        >
          본 서비스는 사용자의 소중한 기록을<br />
          안전하게 관리하고 보호합니다.
        </p>
      </div>

      {/* 하단: 보조 버튼 (유지) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-5 py-6">
          <Link href="/login-email">
            <a className="text-zinc-500 font-semibold hover:text-[#4A6741] transition-colors" style={{ fontSize: `${fontSize * 0.9}px` }}>이메일 로그인</a>
          </Link>
          <span className="w-[1px] h-3 bg-zinc-300"></span>
          <Link href="/register">
            <a className="text-zinc-500 font-semibold hover:text-[#4A6741] transition-colors" style={{ fontSize: `${fontSize * 0.9}px` }}>회원가입</a>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}