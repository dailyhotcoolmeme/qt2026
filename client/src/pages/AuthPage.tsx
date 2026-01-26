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
  const [isLoginOpen, setIsLoginOpen] = useState(false); // 로그인 박스 열림 상태
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { register, handleSubmit } = useForm();

  // 카카오 로그인 (약관 동의 없이 즉시 실행)
  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin }
    });
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

      if (pErr || !profile) throw new Error("아이디를 다시 확인해 주세요.");

      const { error: lErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: values.password
      });

      if (lErr) throw new Error("비밀번호가 맞지 않습니다.");
      
      setLocation("/");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#FCFDFB] flex flex-col items-center justify-center px-6 overflow-hidden">
      
      {/* 상단: 스르륵 올라오는 감성 문구 (복구 완료) */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="font-bold text-[#4A6741] mb-2" style={{ fontSize: `${fontSize * 1.2}px` }}>
            오늘도 주님 안에서
          </h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          <h1 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 2}px` }}>
            함께 걷는 여정
          </h1>
        </motion.div>
      </div>

      {/* 중앙: 메인 버튼 섹션 */}
      <div className="w-full max-w-sm space-y-4">
        {/* 카카오 로그인 버튼 */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          onClick={handleKakaoLogin}
          className="w-full h-16 bg-[#FEE500] rounded-[24px] flex items-center justify-center gap-3 font-bold text-zinc-900 shadow-lg active:scale-95 transition-all"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg" className="w-6" alt="카카오" />
          카카오로 시작하기
        </motion.button>

        {/* 보조 버튼들 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-6 pt-4"
        >
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="text-zinc-400 font-bold hover:text-[#4A6741] transition-colors"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            아이디 로그인
          </button>
          <span className="w-[1px] h-3 bg-zinc-200"></span>
          <Link href="/register">
            <a className="text-zinc-400 font-bold hover:text-[#4A6741] transition-colors" style={{ fontSize: `${fontSize * 0.9}px` }}>
              회원가입
            </a>
          </Link>
        </motion.div>
      </div>

      {/* 하단 슬라이드 방식의 로그인 입력창 (추가됨) */}
      <AnimatePresence>
        {isLoginOpen && (
          <>
            {/* 배경 어둡게 */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginOpen(false)}
              className="fixed inset-0 bg-black/40 z-[90] backdrop-blur-sm"
            />
            {/* 로그인 박스 */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[100] px-8 pt-10 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.4}px` }}>아이디 로그인</h3>
                <button onClick={() => setIsLoginOpen(false)} className="text-zinc-300"><X size={24}/></button>
              </div>

              <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
                <div className="bg-zinc-50 rounded-3xl p-5 border-2 border-transparent focus-within:border-[#4A6741] transition-all">
                  <label className="text-[#4A6741] font-bold text-[11px] block mb-2">아이디</label>
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-zinc-300"/>
                    <input {...register("username")} className="bg-transparent outline-none font-bold w-full" placeholder="아이디를 입력해 주세요" />
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-3xl p-5 border-2 border-transparent focus-within:border-[#4A6741] transition-all">
                  <label className="text-[#4A6741] font-bold text-[11px] block mb-2">비밀번호</label>
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-zinc-300"/>
                    <input {...register("password")} type={showPw ? "text" : "password"} className="bg-transparent outline-none font-bold flex-1" placeholder="비밀번호를 입력해 주세요" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">
                      {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 px-2 text-red-500 font-bold text-xs">
                    <AlertCircle size={14}/> {errorMsg}
                  </div>
                )}

                <button 
                  disabled={isLoading}
                  type="submit" 
                  className="w-full h-16 bg-[#4A6741] text-white rounded-[24px] font-black shadow-xl mt-4 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "로그인하기"}
                </button>
                
                <div className="text-center pt-4">
                  <Link href="/find-pw">
                    <a className="text-zinc-400 font-bold text-sm border-b border-zinc-200">비밀번호를 잊으셨나요?</a>
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
