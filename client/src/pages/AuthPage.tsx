import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, X, AlertCircle, Loader2, Check } from "lucide-react";
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

  const { register, getValues } = useForm();

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin }
    });
    if (error) alert(error.message);
  };

  const handleManualLogin = async () => {
    const values = getValues();
    if (!values.username || !values.password) {
      setErrorMsg("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const { data: profile } = await supabase.from("profiles").select("email").eq("username", values.username).maybeSingle();
      if (!profile) throw new Error("아이디를 확인해 주세요.");
      const { error: lErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: values.password });
      if (lErr) throw new Error("비밀번호가 일치하지 않습니다.");
      setLocation("/");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#F8F8F8] px-8 pt-24 pb-32 overflow-hidden relative">
      
      {/* 상단 메시지 (천장에 붙지 않도록 pt-24 및 mt-4 부여) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full text-center"
      >
        <span className="text-[#4A6741] font-bold tracking-[0.2em] mb-4 block" style={{ fontSize: `${fontSize * 0.70}px` }}>
          QuietTime Diary
        </span>
        <h1 className="font-black text-zinc-900 leading-[1.3] tracking-tighter" style={{ fontSize: `${fontSize * 1.8}px` }}>
          우리의 기도가<br />
          <span className="text-[#4A6741]">기억되는 공간</span>
        </h1>
        <p className="text-zinc-400 mt-6 font-medium leading-relaxed" style={{ fontSize: `${fontSize * 0.95}px` }}>
          매일의 묵상(QT)과 중보를<br />
          음성으로 기록하고 보관하세요.
        </p>
      </motion.div>

      {/* 중단: 카카오 버튼 (간격 확보) */}
      <div className="w-full max-w-sm mb-4">
        <button onClick={handleKakaoLogin} className="w-full h-[64px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-lg flex items-center justify-center gap-3">
          <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
          카카오로 시작하기
        </button>
      </div>

      {/* 하단 보조 버튼 */}
      <div className="w-full max-w-sm flex items-center justify-center gap-5 pb-12">
        <button onClick={() => setIsLoginOpen(true)} className="text-zinc-500 font-bold" style={{ fontSize: `${fontSize * 0.9}px` }}>아이디 로그인</button>
        <span className="w-[1px] h-3 bg-zinc-300"></span>
        <Link href="/register"><a className="text-zinc-500 font-bold" style={{ fontSize: `${fontSize * 0.9}px` }}>회원가입</a></Link>
      </div>

      {/* 로그인 팝업 */}
      <AnimatePresence>
        {isLoginOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLoginOpen(false)} className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[100] px-6 pt-10 pb-28 shadow-2xl" // pb-28로 버튼 잘림 방지
            >
              <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>아이디 로그인</h3>
                <button onClick={() => setIsLoginOpen(false)} className="text-zinc-300 p-2"><X size={24}/></button>
              </div>

              <div className="space-y-4 px-2">
                {/* 아이디 박스 - 배경색 통일 */}
                <div className="bg-[#F8F8F8] rounded-[20px] p-5 border-2 border-transparent focus-within:border-[#4A6741]">
                  <label className="text-[#4A6741] font-bold text-[10px] block mb-1">아이디</label>
                  <input {...register("username")} className="bg-transparent outline-none font-bold w-full text-zinc-900 text-sm" placeholder="아이디 입력" />
                </div>

                {/* 비밀번호 박스 - 눈 아이콘 내부 정렬 */}
                <div className="bg-[#F8F8F8] rounded-[20px] p-5 border-2 border-transparent focus-within:border-[#4A6741] relative">
                  <div className="flex flex-col">
                    <label className="text-[#4A6741] font-bold text-[10px] block mb-1">비밀번호</label>
                    <input {...register("password")} type={showPw ? "text" : "password"} className="bg-transparent outline-none font-bold w-full text-zinc-900 text-sm pr-10" placeholder="비밀번호 입력" />
                  </div>
                  <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 absolute right-6 bottom-6 outline-none">
                    {showPw ? <EyeOff size={22}/> : <Eye size={22}/>}
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <button type="button" onClick={() => setAutoLogin(!autoLogin)} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${autoLogin ? 'bg-[#4A6741]' : 'border-2 border-zinc-200'}`}>
                      {autoLogin && <Check size={14} className="text-white" />}
                    </div>
                    <span className={`text-[12px] font-bold ${autoLogin ? 'text-[#4A6741]' : 'text-zinc-400'}`}>로그인 유지</span>
                  </button>
                  <div className="flex gap-3 text-zinc-400 font-bold text-[12px]">
                    <Link href="/find-id"><a>아이디 찾기</a></Link>
                    <span className="text-zinc-200 font-light text-[10px]">|</span>
                    <Link href="/find-pw"><a>비밀번호 찾기</a></Link>
                  </div>
                </div>

                {errorMsg && <div className="text-red-500 font-bold text-[11px] px-2 flex items-center gap-1"><AlertCircle size={14}/> {errorMsg}</div>}

                {/* 로그인 버튼 - 탭 바 위로 충분히 올라오도록 간격 조정 */}
                <button 
                  disabled={isLoading} onClick={handleManualLogin}
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
