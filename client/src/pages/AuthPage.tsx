import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, Eye, EyeOff, X, AlertCircle, Loader2, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [autoLogin, setAutoLogin] = useState(true);

  const { register, getValues } = useForm(); // handleSubmit 대신 getValues 사용

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin }
    });
    if (error) alert(error.message);
  };

  // 자동 실행 방지를 위해 수동 함수로 변경
  const handleManualLogin = async () => {
    const values = getValues();
    if (!values.username || !values.password) {
      setErrorMsg("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }

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
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#F8F8F8] px-8 pt-12 pb-32 overflow-hidden relative">
      
      {/* 상단 메시지 (위치 상향 조정) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full text-center mt-2">
        <span className="text-[#4A6741] font-bold tracking-[0.2em] mb-3 block" style={{ fontSize: `${fontSize * 0.70}px` }}>
          QuietTime Diary
        </span>
        <h1 className="font-black text-zinc-900 leading-[1.3] tracking-tighter" style={{ fontSize: `${fontSize * 1.8}px` }}>
          우리의 기도가<br />
          <span className="text-[#4A6741]">기억되는 공간</span>
        </h1>
        <p className="text-zinc-400 mt-5 font-medium leading-relaxed break-keep" style={{ fontSize: `${fontSize * 0.95}px` }}>
          매일의 묵상(QT)과 중보를<br />
          음성으로 기록하고 보관하세요.
        </p>
      </motion.div>

      {/* 중단: 카카오 버튼 */}
      <div className="w-full max-w-sm mb-6">
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={handleKakaoLogin}
          className="w-full h-[64px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-[0_4px_12px_rgba(254,229,0,0.15)] flex items-center justify-center gap-3 active:scale-95 transition-all mb-4"
          style={{ fontSize: `${fontSize * 1.05}px` }}
        >
          <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
          카카오로 시작하기
        </motion.button>
        <p className="text-center text-zinc-400 leading-relaxed px-4 opacity-70" style={{ fontSize: `${fontSize * 0.7}px` }}>
          본 서비스는 사용자의 기록을<br />
          안전하게 관리하고 보호합니다.
        </p>
      </div>

      {/* 하단 보조 버튼 */}
      <div className="w-full max-w-sm flex items-center justify-center gap-5 pb-10">
        <button onClick={() => setIsLoginOpen(true)} className="text-zinc-500 font-bold hover:text-[#4A6741] transition-colors" style={{ fontSize: `${fontSize * 0.9}px` }}>
          아이디 로그인
        </button>
        <span className="w-[1px] h-3 bg-zinc-300"></span>
        <Link href="/register">
          <a className="text-zinc-500 font-bold hover:text-[#4A6741] transition-colors" style={{ fontSize: `${fontSize * 0.9}px` }}>회원가입</a>
        </Link>
      </div>

      {/* 로그인 팝업 */}
      <AnimatePresence>
        {isLoginOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLoginOpen(false)} className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[100] px-6 pt-10 pb-40 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>아이디 로그인</h3>
                <button onClick={() => setIsLoginOpen(false)} className="text-zinc-400 p-2"><X size={24}/></button>
              </div>

              {/* 자동 실행 방지를 위해 form 대신 div 사용 */}
              <div className="space-y-3 px-2">
                <div className="bg-zinc-50 rounded-[20px] p-4 border-2 border-transparent focus-within:border-[#4A6741] transition-all">
                  <label className="text-[#4A6741] font-bold text-[10px] block mb-1">아이디</label>
                  <input {...register("username")} className="bg-transparent outline-none font-bold w-full text-zinc-900 text-sm" placeholder="아이디 입력" autoFocus />
                </div>

                <div className="bg-zinc-50 rounded-[20px] p-4 border-2 border-transparent focus-within:border-[#4A6741] transition-all">
                  <label className="text-[#4A6741] font-bold text-[10px] block mb-1">비밀번호</label>
                  <div className="flex items-center gap-3 relative">
                    <input {...register("password")} type={showPw ? "text" : "password"} className="bg-transparent outline-none font-bold flex-1 text-zinc-900 text-sm pr-10" placeholder="비밀번호 입력" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 absolute right-0">
                      {showPw ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <button type="button" onClick={() => setAutoLogin(!autoLogin)} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${autoLogin ? 'bg-[#4A6741]' : 'border-2 border-zinc-200'}`}>
                      {autoLogin && <Check size={14} className="text-white" />}
                    </div>
                    <span className={`text-[12px] font-bold ${autoLogin ? 'text-[#4A6741]' : 'text-zinc-400'}`}>로그인 유지</span>
                  </button>
                  
                  <div className="flex gap-3">
                    <Link href="/find-id"><a className="text-zinc-400 font-bold text-[12px]">아이디 찾기</a></Link>
                    <span className="text-zinc-200 text-[10px] mt-0.5">|</span>
                    <Link href="/find-pw"><a className="text-zinc-400 font-bold text-[12px]">비밀번호 찾기</a></Link>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 text-red-500 font-bold text-[11px] pb-2">
                    <AlertCircle size={14}/> {errorMsg}
                  </div>
                )}

                <button 
                  disabled={isLoading} 
                  onClick={handleManualLogin}
                  className="w-full h-[64px] bg-[#4A6741] text-white rounded-[22px] font-black shadow-lg flex items-center justify-center active:scale-95 transition-all mt-4"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "로그인하기"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
