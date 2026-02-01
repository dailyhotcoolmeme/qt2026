import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { LogIn, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDisplaySettings } from "./DisplaySettingsProvider";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string; // Optional explicit page to return to after login
}

export function LoginModal({ open, onOpenChange, returnTo }: LoginModalProps) {
  const { fontSize = 16 } = useDisplaySettings();
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { register, getValues } = useForm();

  const handleKakaoLogin = () => {
    // Use provided returnTo or fall back to current location
    const targetReturnTo = returnTo || window.location.href;
    // Persist desired return target as a fallback for post-OAuth navigation
    try {
      localStorage.setItem('qt_return', targetReturnTo);
      if (targetReturnTo.includes('autoOpenWrite=true')) {
        localStorage.setItem('qt_autoOpenWrite', '1');
      }
    } catch (e) {
      // ignore storage errors
    }
    const encodedReturnTo = encodeURIComponent(targetReturnTo);
    const redirectTo = `${window.location.origin}/?returnTo=${encodedReturnTo}`;
    supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo },
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.error("LoginModal kakao start error", e);
      window.location.href = `/auth?returnTo=${encodedReturnTo}`;
    });
  };

  const handleManualLogin = async () => {
    const values = getValues();
    if (!values.email || !values.password) {
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      // 로그인 성공 - use localStorage return fallback or navigate directly
      const targetReturnTo = returnTo || window.location.href;
      try {
        localStorage.setItem('qt_return', targetReturnTo);
        if (targetReturnTo.includes('autoOpenWrite=true')) {
          localStorage.setItem('qt_autoOpenWrite', '1');
        }
      } catch (e) {}
      window.location.href = targetReturnTo;
    } catch (e: any) {
      setErrorMsg(e.message || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 흐리게 */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]"
          />
          
          {/* 모달 본체 - AuthPage 스타일 */}
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[401] px-6 pt-8 pb-12 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* 상단 핸들 바 */}
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6" />
            
            {/* 닫기 버튼 */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={24} />
            </button>

            {!showManualLogin ? (
              // 로그인 방법 선택 화면
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <h2 
                    className="font-black text-zinc-900 leading-[1.3] tracking-tighter"
                    style={{ fontSize: `${fontSize * 1.5}px` }}
                  >
                    로그인이 필요합니다
                  </h2>
                  <p 
                    className="text-zinc-500 mt-2 font-medium"
                    style={{ fontSize: `${fontSize * 0.9}px` }}
                  >
                    묵상을 기록하고 나누려면<br />
                    먼저 로그인해 주세요.
                  </p>
                </div>

                <button 
                  onClick={handleKakaoLogin}
                  className="w-full h-[64px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
                  카카오로 시작하기
                </button>

                <div className="flex items-center justify-center gap-3 w-full">
                  <div className="flex-1 h-px bg-zinc-200" />
                  <span className="text-zinc-400 text-sm font-medium">또는</span>
                  <div className="flex-1 h-px bg-zinc-200" />
                </div>

                <button 
                  onClick={() => { setShowManualLogin(true); setErrorMsg(""); }}
                  className="w-full h-[64px] bg-white border-2 border-zinc-300 text-zinc-700 font-bold rounded-[22px] hover:bg-zinc-50 active:scale-95 transition-all"
                >
                  이메일로 로그인
                </button>

                <button 
                  onClick={() => onOpenChange(false)}
                  className="w-full text-sm text-zinc-500 font-medium py-3 hover:text-zinc-700"
                >
                  나중에 하기
                </button>
              </div>
            ) : (
              // 이메일 로그인 화면
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => { setShowManualLogin(false); setErrorMsg(""); }}
                    className="text-zinc-500 hover:text-zinc-700 transition-colors p-1"
                  >
                    ←
                  </button>
                  <h3 
                    className="font-bold text-zinc-900"
                    style={{ fontSize: `${fontSize * 1.1}px` }}
                  >
                    이메일 로그인
                  </h3>
                </div>

                {/* 이메일 입력 */}
                <div className="bg-zinc-50 rounded-[22px] p-5 border-2 border-transparent focus-within:border-[#4A6741]">
                  <label className="text-[#4A6741] font-bold text-[11px] block mb-2">이메일</label>
                  <input 
                    {...register("email")}
                    type="email"
                    placeholder="이메일 입력"
                    className="bg-transparent outline-none font-bold w-full text-zinc-900"
                  />
                </div>

                {/* 비밀번호 입력 */}
                <div className="bg-zinc-50 rounded-[22px] p-5 border-2 border-transparent focus-within:border-[#4A6741] relative flex flex-col">
                  <label className="text-[#4A6741] font-bold text-[11px] block mb-2">비밀번호</label>
                  <div className="flex items-center">
                    <input 
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder="비밀번호 입력"
                      className="bg-transparent outline-none font-bold w-full text-zinc-900 pr-10"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="text-zinc-300 absolute right-6 hover:text-zinc-500"
                    >
                      {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </div>

                {/* 에러 메시지 */}
                {errorMsg && (
                  <p className="text-red-500 text-sm font-bold px-1">{errorMsg}</p>
                )}

                {/* 로그인 버튼 */}
                <button 
                  disabled={isLoading}
                  onClick={handleManualLogin}
                  className="w-full h-[64px] bg-[#4A6741] text-white rounded-[20px] font-black shadow-lg flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : "로그인하기"}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
