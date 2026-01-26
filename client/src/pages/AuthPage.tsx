import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, Eye, EyeOff, X, AlertCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  
  // 상태 관리
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { register, handleSubmit } = useForm();

  // 카카오 로그인
  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin }
    });
    if (error) alert(error.message);
  };

  // 아이디 로그인 처리
  const onLogin = async (values: any) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", values.username)
        .maybeSingle();

      if (pErr || !profile) throw new Error("아이디를 확인해 주세요.");

      const { error: lErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: values.password
      });

      if (lErr) throw new Error("비밀번호가 일치하지 않습니다.");
      setLocation("/");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#F8F8F8] px-8 py-20 overflow-hidden relative">
      
      {/* [상단] 원래 코드 디자인 복구 (스르륵 글자) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full text-center mt-12"
      >
        <span 
          className="text-[#4A6741] font-bold tracking-[0.2em] mb-4 block"
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

      {/* [중단] 메인 버튼 영역 (카카오 로그인) */}
      <div className="w-full max-w-sm space-y-6">
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={handleKakaoLogin}
          className="w-full h-[64px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[20px] shadow-[0_4px_12px_rgba(254,229,0,0.15)] flex items-center justify-center gap-3 active:scale-95 transition-all"
          style={{ fontSize: `${fontSize * 1.05}px` }}
        >
          <img 
            src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" 
            className="w-6 h-6" 
            alt="카카오" 
          />
          카카오로 시작하기
        </motion.button>
        
        <p 
          className="text-center text-zinc-400 leading-relaxed px-4 opacity-70"
          style={{ fontSize: `${fontSize * 0.7}px` }}
        >
          본 서비스는 사용자의 기록을<br />
          안전하게 관리하고 보호합니다.
        </p>
      </div>

      {/* [하단] 보조 버튼 (아이디 로그인 클릭 시 슬라이드 오픈) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-5 py-6">
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="text-zinc-500 font-semibold hover:text-[#4A6741] transition-colors"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            아이디 로그인
          </button>
          <span className="w-[1px] h-3 bg-zinc-300"></span>
          <Link href="/register">
            <a className="text-zinc-500 font-semibold hover:text-[#4A6741] transition-colors" style={{ fontSize: `${fontSize * 0.9}px` }}>
              회원가입
            </a>
          </Link>
        </div>
      </motion.div>

      {/* [슬라이드] 아이디 로그인 입력창 */}
      <AnimatePresence>
        {isLoginOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginOpen(false)}
              className="fixed inset-0 bg-black/40 z-[90] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[100] px-8 pt-10 pb-12"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>아이디 로그인</h3>
                <button onClick={() => setIsLoginOpen(false)} className="text-zinc-300 p-2"><X size={24}/></button>
              </div>

              <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
                <div className="bg-zinc-50 rounded-[22px] p-5 border-2 border-transparent focus-within:border-[#4A6741] transition-all">
                  <label className="text-[#4A6741] font-bold text-[11px] block mb-2">아이디</label>
                  <input {...register("username")} className="bg-transparent outline-none font-bold w-full text-zinc-900" placeholder="아이디 입력" />
                </div>

                <div className="bg-zinc-50 rounded-[22px] p-5 border-2 border-transparent focus-within:border-[#4A6741] transition-all">
                  <label className="text-[#4A6741] font-bold text-[11px] block mb-2">비밀번호</label>
                  <div className="flex items-center gap-3">
                    <input {...register("password")} type={showPw ? "text" : "password"} className="bg-transparent outline-none font-bold flex-1 text-zinc-900" placeholder="비밀번호 입력" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">
                      {showPw ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 px-2 text-red-500 font-bold text-[11px]">
                    <AlertCircle size={14}/> {errorMsg}
                  </div>
                )}

                <button 
                  disabled={isLoading}
                  type="submit" 
                  className="w-full h-[64px] bg-[#4A6741] text-white rounded-[20px] font-black shadow-xl mt-4 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "로그인하기"}
                </button>
                
                <div className="text-center pt-6">
                  <Link href="/find-pw">
                    <a className="text-zinc-400 font-bold text-[13px] border-b border-zinc-100 pb-0.5">비밀번호를 찾으시나요?</a>
                  </Link>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
