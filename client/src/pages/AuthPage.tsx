import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { supabase } from "../lib/supabase";
import { resolveOAuthReturnTo, startOAuthSignIn } from "../lib/oauth";
import { isEmbeddedInAppBrowser, openUrlInExternalBrowser } from "../lib/appUrl";
import { useHashLocation } from "wouter/use-hash-location";
import { FcGoogle } from "react-icons/fc";
import {
  buildInviteLandingUrl,
  joinInviteGroupAndRedirect,
  readInviteGroupId,
} from "../lib/groupInvite";

const EXTERNAL_OAUTH_QUERY_KEY = "external_oauth";

function AuthPage() {
  const [, setLocation] = useHashLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const [termsAgreed, setTermsAgreed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get(EXTERNAL_OAUTH_QUERY_KEY);
    if (!provider || isEmbeddedInAppBrowser()) return;
    if (provider !== "google" && provider !== "kakao") return;

    params.delete(EXTERNAL_OAUTH_QUERY_KEY);
    const nextSearch = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash || ""}`,
    );

    // 이미 로그인된 상태면 OAuth 재시작하지 않고 홈으로 (세션 덮어쓰기 방지)
    const handleExternalOAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        window.location.replace(`${window.location.origin}/#/`);
        return;
      }
      // 미로그인 상태: 카카오 인앱브라우저에서 이미 동의하고 넘어온 것이므로 바로 OAuth 시작
      void startOAuthSignIn(provider as "kakao" | "google", getTargetReturnTo());
    };
    void handleExternalOAuth();
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

  const handleSocialLogin = async (provider: "kakao" | "google" | "apple") => {
    if (!termsAgreed) {
      alert("이용약관 및 개인정보처리방침에 동의해 주세요.");
      return;
    }
    if (provider === "google" && isEmbeddedInAppBrowser()) {
      alert("카카오톡 같은 앱 내 브라우저에서는 구글 로그인이 차단될 수 있어요. 외부 브라우저에서 이어서 열어드릴게요.");
      const externalUrl = new URL(window.location.href);
      externalUrl.searchParams.set(EXTERNAL_OAUTH_QUERY_KEY, provider);
      openUrlInExternalBrowser(externalUrl.toString());
      return;
    }
    try {
      await startOAuthSignIn(provider, getTargetReturnTo());
    } catch (error) {
      console.error(`${provider} OAuth start error:`, error);
      alert(`${provider === "kakao" ? "카카오" : provider === "google" ? "구글" : "애플"} 시작에 실패했습니다.`);
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

      {/* 약관 동의 */}
      <div className="mb-6 mt-16 flex w-full max-w-sm items-start gap-3">
        <button
          type="button"
          onClick={() => setTermsAgreed(!termsAgreed)}
          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
            termsAgreed ? "border-[#4A6741] bg-[#4A6741]" : "border-zinc-300 bg-white"
          }`}
        >
          {termsAgreed && (
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
              <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <p className="text-sm leading-relaxed text-zinc-500" style={{ fontSize: `${fontSize * 0.85}px` }}>
          <span
            className="cursor-pointer font-semibold text-zinc-700 underline underline-offset-2"
            onClick={() => setLocation("/terms/service")}
          >
            이용약관
          </span>
          {" "}및{" "}
          <span
            className="cursor-pointer font-semibold text-zinc-700 underline underline-offset-2"
            onClick={() => setLocation("/terms/privacy")}
          >
            개인정보처리방침
          </span>
          에 동의합니다. (필수)
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <button
          onClick={() => void handleSocialLogin("kakao")}
          className={`flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] bg-[#FEE500] font-bold text-[#3C1E1E] shadow-sm transition-all active:scale-95 ${!termsAgreed ? "opacity-50" : ""}`}
        >
          <img src="/kakao-login.png" className="h-6 w-6" alt="카카오" />
          카카오로 시작하기
        </button>

        <button
          onClick={() => void handleSocialLogin("google")}
          className={`flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] border-2 border-zinc-200 bg-white font-bold text-zinc-900 shadow-sm transition-all active:scale-95 ${!termsAgreed ? "opacity-50" : ""}`}
        >
          <FcGoogle size={24} />
          구글로 시작하기
        </button>

        <button
          onClick={() => void handleSocialLogin("apple")}
          className={`flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] bg-black font-bold text-white shadow-sm transition-all active:scale-95 ${!termsAgreed ? "opacity-50" : ""}`}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.769 11.348c-.026-2.666 2.18-3.958 2.279-4.02-1.243-1.817-3.177-2.065-3.862-2.088-1.638-.167-3.21.974-4.041.974-.846 0-2.135-.952-3.516-.925-1.8.027-3.468 1.053-4.393 2.663-1.882 3.257-.481 8.075 1.349 10.716.898 1.293 1.963 2.742 3.363 2.69 1.357-.054 1.868-.869 3.508-.869 1.641 0 2.11.869 3.534.84 1.458-.024 2.38-1.315 3.267-2.614.753-1.08 1.323-2.161 1.611-3.178-3.553-1.35-3.098-5.189-3.099-5.19zM13.108 3.614C13.845 2.72 14.35 1.488 14.21.23c-1.083.048-2.44.724-3.21 1.617-.713.8-1.335 2.081-1.168 3.295 1.199.094 2.428-.612 3.276-1.528z"/>
          </svg>
          애플로 시작하기
        </button>
      </div>
    </div>
  );
}

export default AuthPage;
