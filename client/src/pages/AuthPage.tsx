import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { supabase } from "../lib/supabase";
import { resolveOAuthReturnTo, startOAuthSignIn } from "../lib/oauth";
import { isEmbeddedInAppBrowser, openUrlInExternalBrowser } from "../lib/appUrl";
import { useHashLocation } from "wouter/use-hash-location";
import { Link } from "wouter";
import { Eye, EyeOff, X, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import {
  buildInviteLandingUrl,
  GROUP_INVITE_QUERY_KEY,
  joinInviteGroupAndRedirect,
  readInviteGroupId,
} from "../lib/groupInvite";

type LoginFormValues = {
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
  const inviteGroupId = readInviteGroupId();
  const registerHref = inviteGroupId ? `/register?${GROUP_INVITE_QUERY_KEY}=${encodeURIComponent(inviteGroupId)}` : "/register";

  const { register, getValues } = useForm<LoginFormValues>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("loginModal") === "true") {
      setIsLoginOpen(true);
    }
  }, []);

  useEffect(() => {
    const navigateHomeIfSignedIn = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return;
      if (data.session?.user) {
        const currentInviteGroupId = readInviteGroupId();
        if (currentInviteGroupId) {
          await joinInviteGroupAndRedirect(currentInviteGroupId);
          return;
        }
        window.location.replace(`${window.location.origin}/#/`);
      }
    };

    void navigateHomeIfSignedIn();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const currentInviteGroupId = readInviteGroupId();
        if (currentInviteGroupId) {
          void joinInviteGroupAndRedirect(currentInviteGroupId);
          return;
        }
        window.location.replace(`${window.location.origin}/#/`);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const getTargetReturnTo = () => {
    const params = new URLSearchParams(window.location.search);
    const explicitReturnTo = params.get("returnTo");
    if (explicitReturnTo) {
      return resolveOAuthReturnTo(explicitReturnTo);
    }

    const currentInviteGroupId = readInviteGroupId();
    if (currentInviteGroupId) {
      return buildInviteLandingUrl(currentInviteGroupId);
    }

    return resolveOAuthReturnTo(null);
  };

  const handleSocialLogin = async (provider: "kakao" | "google") => {
    if (provider === "google" && isEmbeddedInAppBrowser()) {
      alert("카카오톡 같은 앱 내 브라우저에서는 구글 로그인이 차단될 수 있어요. 외부 브라우저에서 이어서 열어드릴게요.");
      openUrlInExternalBrowser(window.location.href);
      return;
    }
    try {
      await startOAuthSignIn(provider, getTargetReturnTo());
    } catch (error) {
      console.error(`${provider} OAuth start error:`, error);
      alert(`${provider === "kakao" ? "카카오" : "구글"} 로그인 시작에 실패했습니다.`);
    }
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", values.username)
        .maybeSingle();

      if (!profile?.email) {
        throw new Error("아이디를 확인해 주세요.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: values.password,
      });

      if (error) {
        throw new Error("비밀번호가 올바르지 않습니다.");
      }

      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      if (returnTo) {
        window.location.href = resolveOAuthReturnTo(returnTo);
      } else if (readInviteGroupId()) {
        await joinInviteGroupAndRedirect(readInviteGroupId());
        return;
      } else {
        setLocation("/");
      }
    } catch (error: any) {
      setErrorMsg(error?.message || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F8F8F8] px-8 pb-12 pt-24 text-left">
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
        <h1 className="font-black leading-[1.3] tracking-tighter text-zinc-900" style={{ fontSize: `${fontSize * 1.8}px` }}>
          나의 신앙 기록을
          <br />
          <span className="text-[#4A6741]">기억하고 나누고 공감</span>
        </h1>
        <p className="mt-6 break-keep font-medium leading-relaxed text-zinc-400" style={{ fontSize: `${fontSize}px` }}>
          매일의 말씀과 묵상(QT),
          <br />
          그리고 기도를 기록하고 보관해 보세요.
        </p>
      </motion.div>

      <div className="mb-auto mt-20 flex w-full max-w-sm flex-col items-center gap-6">
        <button
          onClick={() => void handleSocialLogin("kakao")}
          className="flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] bg-[#FEE500] font-bold text-[#3C1E1E] shadow-sm transition-all active:scale-95"
        >
          <img src="/kakao-login.png" className="h-6 w-6" alt="카카오" />
          카카오로 로그인하기
        </button>

        <button
          onClick={() => void handleSocialLogin("google")}
          className="flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] border-2 border-zinc-200 bg-white font-bold text-zinc-900 shadow-sm transition-all active:scale-95"
        >
          <FcGoogle size={24} />
          구글로 로그인하기
        </button>

        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => setIsLoginOpen(true)}
            className="font-semibold text-zinc-500"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            아이디로 로그인
          </button>
          <span className="h-3 w-[1px] bg-zinc-300" />
          <Link href={registerHref} className="font-semibold text-zinc-500" style={{ fontSize: `${fontSize * 0.9}px` }}>
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
                  <input
                    {...register("password")}
                    type={showPw ? "text" : "password"}
                    className="w-full bg-transparent pr-12 font-bold text-zinc-900 outline-none"
                    placeholder="비밀번호 입력"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void handleManualLogin();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((prev) => !prev)}
                    className="absolute right-5 top-[42px] text-zinc-400"
                  >
                    {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {errorMsg ? <p className="px-1 text-sm font-medium text-red-500">{errorMsg}</p> : null}

                <button
                  onClick={() => void handleManualLogin()}
                  disabled={isLoading}
                  className="mt-4 flex h-[60px] w-full items-center justify-center rounded-[22px] bg-[#4A6741] font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : "로그인"}
                </button>

                <div className="flex items-center justify-between px-2 pt-2 text-sm text-zinc-500">
                  <Link href="/find-account">계정 찾기</Link>
                  <Link href={registerHref}>회원가입</Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AuthPage;
