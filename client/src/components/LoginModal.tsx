import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "../lib/supabase";
import { useDisplaySettings } from "./DisplaySettingsProvider";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string;
}

export function LoginModal({ open, onOpenChange, returnTo }: LoginModalProps) {
  const { fontSize = 16 } = useDisplaySettings();
  const [, setLocation] = useLocation();

  const handleKakaoLogin = () => {
    const targetReturnTo = returnTo || window.location.href;
    try {
      localStorage.setItem("qt_return", targetReturnTo);
      if (targetReturnTo.includes("autoOpenWrite=true")) {
        localStorage.setItem("qt_autoOpenWrite", "1");
      }
    } catch {
      // ignore storage errors
    }

    const encodedReturnTo = encodeURIComponent(targetReturnTo);
    const redirectTo = `${window.location.origin}/?returnTo=${encodedReturnTo}`;

    supabase.auth
      .signInWithOAuth({
        provider: "kakao",
        options: { redirectTo },
      })
      .catch((error) => {
        console.error("LoginModal kakao start error", error);
        setLocation(`/auth?returnTo=${encodeURIComponent(targetReturnTo)}`);
      });
  };

  const handleEmailLogin = () => {
    const targetReturnTo = returnTo || window.location.href;
    try {
      localStorage.setItem("qt_return", targetReturnTo);
      if (targetReturnTo.includes("autoOpenWrite=true")) {
        localStorage.setItem("qt_autoOpenWrite", "1");
      }
    } catch {
      // ignore storage errors
    }
    setLocation(`/auth?loginModal=true&returnTo=${encodeURIComponent(targetReturnTo)}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[401] max-h-[90vh] overflow-y-auto rounded-t-[40px] bg-white px-6 pb-12 pt-8 shadow-2xl"
          >
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-200" />

            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-6 top-6 text-zinc-400 transition-colors hover:text-zinc-600"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <h2
                  className="leading-[1.3] tracking-tighter text-zinc-900 font-black"
                  style={{ fontSize: `${fontSize * 1.5}px` }}
                >
                  로그인이 필요합니다
                </h2>
              </div>

              <button
                onClick={handleKakaoLogin}
                className="flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] bg-[#FEE500] font-bold text-[#3C1E1E] shadow-sm transition-all active:scale-95"
              >
                <img src="/kakao-login.png" className="h-6 w-6" alt="카카오" />
                카카오로 로그인하기
              </button>

              <div className="flex w-full items-center justify-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-sm font-medium text-zinc-400">또는</span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              <button
                onClick={handleEmailLogin}
                className="h-[64px] w-full rounded-[22px] border-2 border-zinc-300 bg-white font-bold text-zinc-700 transition-all hover:bg-zinc-50 active:scale-95"
              >
                아이디로 로그인
              </button>

              <button
                onClick={() => {
                  onOpenChange(false);
                  setLocation("/register");
                }}
                className="w-full py-3 text-sm font-medium text-zinc-500 hover:text-zinc-700"
              >
                회원가입
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
