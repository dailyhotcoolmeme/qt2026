import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { useHashLocation } from "wouter/use-hash-location";
import { Link } from "wouter";
import { Eye, EyeOff, X, Check, Loader2 } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { getCurrentUser, login, startKakaoLogin, subscribeAuthChange } from "../lib/auth-client";

type LoginForm = {
  username: string;
  password: string;
};

function AuthPage() {
  const [, setLocation] = useHashLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [autoLogin, setAutoLogin] = useState(true);

  const { register, getValues } = useForm<LoginForm>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("loginModal") === "true") {
      setIsLoginOpen(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const user = await getCurrentUser().catch(() => null);
      if (!active || !user) return;
      window.location.replace(window.location.origin + "/#/");
    };

    void sync();
    const unsubscribe = subscribeAuthChange(() => {
      void sync();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleKakaoLogin = () => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo") || `${window.location.origin}/#/`;
    startKakaoLogin(returnTo);
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
      await login({
        identifier: values.username.trim(),
        password: values.password,
      });

      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      if (returnTo) {
        window.location.href = returnTo;
      } else {
        setLocation("/");
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-[#F8F8F8] px-8 pb-12 pt-24 text-left">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            input:-webkit-autofill {
              -webkit-box-shadow: 0 0 0 1000px #F9FAFB inset !important;
              -webkit-text-fill-color: #18181b !important;
            }
          `,
        }}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-16 w-full text-center">
        <h1 className="leading-[1.3] tracking-tighter text-zinc-900 font-black" style={{ fontSize: `${fontSize * 1.8}px` }}>
          말씀 묵상과 기도 기록을
          <br />
          <span className="text-[#4A6741]">함께 남기는 공간</span>
        </h1>
        <p className="mt-6 break-keep font-medium leading-relaxed text-zinc-400" style={{ fontSize: `${fontSize}px` }}>
          매일의 QT와 기도를 기록하고,
          <br />
          서로의 마음을 나누세요.
        </p>
      </motion.div>

      <div className="mb-auto mt-20 flex w-full max-w-sm flex-col items-center gap-6">
        <button
          onClick={handleKakaoLogin}
          className="flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] bg-[#FEE500] font-bold text-[#3C1E1E] shadow-sm transition-all active:scale-95"
        >
          <img src="/kakao-login.png" className="h-6 w-6" alt="카카오" />
          카카오로 로그인하기
        </button>

        <div className="flex items-center justify-center gap-5">
          <button onClick={() => setIsLoginOpen(true)} className="font-semibold text-zinc-500" style={{ fontSize: `${fontSize * 0.9}px` }}>
            아이디로 로그인
          </button>
          <span className="h-3 w-[1px] bg-zinc-300" />
          <Link href="/register" className="font-semibold text-zinc-500" style={{ fontSize: `${fontSize * 0.9}px` }}>
            회원가입
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {isLoginOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginOpen(false)}
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              drag="y"
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 240 }}
              dragElastic={{ top: 0, bottom: 0.2 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 700) {
                  setIsLoginOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[100] rounded-t-[40px] bg-white px-8 pb-28 pt-10 shadow-2xl"
            >
              <div className="mx-auto -mt-4 mb-6 h-1.5 w-12 rounded-full bg-zinc-200" />
              <div className="mb-8 flex items-center justify-between px-2">
                <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.3}px` }}>
                  아이디 로그인
                </h3>
                <button onClick={() => setIsLoginOpen(false)} className="p-2 text-zinc-400">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 px-2">
                <div className="rounded-[22px] border-2 border-transparent bg-zinc-50 p-5 focus-within:border-[#4A6741]">
                  <label className="mb-2 block text-[11px] font-bold text-[#4A6741]">아이디</label>
                  <input
                    {...register("username")}
                    className="w-full bg-transparent font-bold text-zinc-900 outline-none"
                    placeholder="아이디 입력"
                  />
                </div>

                <div className="relative flex flex-col rounded-[22px] border-2 border-transparent bg-zinc-50 p-5 focus-within:border-[#4A6741]">
                  <label className="mb-2 block text-[11px] font-bold text-[#4A6741]">비밀번호</label>
                  <div className="flex items-center">
                    <input
                      {...register("password")}
                      type={showPw ? "text" : "password"}
                      className="w-full bg-transparent pr-10 font-bold text-zinc-900 outline-none"
                      placeholder="비밀번호 입력"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-6 text-zinc-300">
                      {showPw ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2 pt-1">
                  <button type="button" onClick={() => setAutoLogin(!autoLogin)} className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md transition-all ${autoLogin ? "bg-[#4A6741]" : "border-2 border-zinc-200"}`}>
                      {autoLogin && <Check size={14} className="text-white" />}
                    </div>
                    <span className={`text-[13px] font-bold ${autoLogin ? "text-[#4A6741]" : "text-zinc-400"}`}>로그인 유지</span>
                  </button>

                  <div className="flex gap-3 text-[13px] font-bold text-zinc-400">
                    <Link href="/find-account?tab=id">아이디 찾기</Link>
                    <span className="text-zinc-200">|</span>
                    <Link href="/find-account?tab=pw">비밀번호 재설정</Link>
                  </div>
                </div>

                {errorMsg && <p className="px-2 text-[12px] font-bold text-red-500">{errorMsg}</p>}

                <button
                  disabled={isLoading}
                  onClick={handleManualLogin}
                  className="mt-6 flex h-[64px] w-full items-center justify-center rounded-[20px] bg-[#4A6741] font-black text-white shadow-lg transition-all active:scale-95"
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

export default AuthPage;
