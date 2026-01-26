import React, { useState } from "react"; // useState 추가
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const [agreed, setAgreed] = useState(false);

  const handleKakaoLogin = async () => {
    if (!agreed) {
      alert("이용약관 및 개인정보 처리방침에 동의해 주세요.");
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
      
      {/* 상단: 환영 메시지 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full text-center mt-12"
      >
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
          매일 묵상과 중보를<br />
          기록하고 보관하세요.
        </p>
      </motion.div>

      {/* 중단: 메인 로그인 버튼 영역 */}
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <input 
            type="checkbox" 
            id="agree-check" 
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 accent-[#4A6741] cursor-pointer"
          />
          <label htmlFor="agree-check" className="text-zinc-600 font-medium cursor-pointer" style={{ fontSize: `${fontSize * 0.85}px` }}>
            {/* Link 내부의 a 태그 구조를 더 안정적으로 변경 */}
            <Link href="/terms/service">
              <span className="underline underline-offset-4 decoration-zinc-300 hover:text-[#4A6741]">이용약관</span>
            </Link> 
            {" 및 "}
            <Link href="/terms/privacy">
              <span className="underline underline-offset-4 decoration-zinc-300 hover:text-[#4A6741]">개인정보 지침</span>
            </Link>
            에 동의합니다
          </label>
        </div>

        <motion.button 
          whileTap={agreed ? { scale: 0.96 } : {}}
          onClick={handleKakaoLogin}
          className={`w-full h-[64px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[20px] shadow-[0_4px_12px_rgba(254,229,0,0.2)] flex items-center justify-center gap-3 transition-all ${!agreed ? 'opacity-60 cursor-not-allowed' : 'opacity-100'}`}
          style={{ fontSize: `${fontSize * 1.05}px` }}
        >
          <img 
            src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" 
            className="w-5 h-5" 
            alt="kakao" 
          />
          카카오로 3초만에 시작하기
        </motion.button>
        
        
      </div>

      {/* 하단: 보조 버튼 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-5 py-6">
          <Link href="/login">
            <span className="text-zinc-500 font-semibold hover:text-[#4A6741] transition-colors cursor-pointer" style={{ fontSize: `${fontSize * 0.9}px` }}>아이디 로그인</span>
          </Link>
          <span className="w-[1px] h-3 bg-zinc-300"></span>
          <Link href="/register">
            <span className="text-zinc-500 font-semibold hover:text-[#4A6741] transition-colors cursor-pointer" style={{ fontSize: `${fontSize * 0.9}px` }}>회원가입</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
