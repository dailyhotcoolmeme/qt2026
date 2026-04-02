import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useLocation } from "wouter";
import { startOAuthSignIn } from "../lib/oauth";
import { isEmbeddedInAppBrowser, isNativeApp, openUrlInExternalBrowser } from "../lib/appUrl";
import { useAuth } from "../hooks/use-auth";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { buildInviteLandingUrl, GROUP_INVITE_QUERY_KEY, readInviteGroupId } from "../lib/groupInvite";
import { supabase } from "../lib/supabase";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string;
}

const EXTERNAL_OAUTH_QUERY_KEY = "external_oauth";

export function LoginModal({ open, onOpenChange, returnTo }: LoginModalProps) {
  const { fontSize = 16 } = useDisplaySettings();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // 프로필 fetch 완료 전에도 SIGNED_IN 이벤트로 즉시 닫기
  useEffect(() => {
    if (!open) return;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") onOpenChange(false);
    });
    return () => listener.subscription.unsubscribe();
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    onOpenChange(false);
  }, [open, isAuthenticated, onOpenChange]);

  const resolveTargetReturnTo = () => {
    const inviteGroupId = readInviteGroupId();
    const fallbackRaw = inviteGroupId ? buildInviteLandingUrl(inviteGroupId) : window.location.href;
    const raw = returnTo || fallbackRaw;
    if (!isNativeApp()) return raw;

    if (raw.startsWith("/#/")) return raw.slice(1);
    if (raw.startsWith("#/")) return raw;

    try {
      const parsed = new URL(raw);
      if (parsed.hash && parsed.hash.startsWith("#/")) {
        return parsed.hash;
      }
    } catch {
      // ignore parse failures and fall through to the default route
    }

    return "#/";
  };

  const handleKakaoLogin = async () => {
    const targetReturnTo = resolveTargetReturnTo();
    try {
      localStorage.setItem("qt_return", targetReturnTo);
      if (targetReturnTo.includes("autoOpenWrite=true")) {
        localStorage.setItem("qt_autoOpenWrite", "1");
      }
    } catch {
      // ignore storage errors
    }

    try {
      await startOAuthSignIn("kakao", targetReturnTo);
    } catch (error) {
      console.error("LoginModal kakao start error", error);
      setLocation(`/auth?returnTo=${encodeURIComponent(targetReturnTo)}`);
    }
  };

  const handleGoogleLogin = async () => {
    const targetReturnTo = resolveTargetReturnTo();
    if (isEmbeddedInAppBrowser()) {
      alert("카카오톡 같은 앱 내 브라우저에서는 구글 로그인이 차단될 수 있어요. 외부 브라우저에서 이어서 열어드릴게요.");
      const externalUrl = new URL(window.location.href);
      externalUrl.searchParams.set(EXTERNAL_OAUTH_QUERY_KEY, "google");
      openUrlInExternalBrowser(externalUrl.toString());
      return;
    }
    try {
      localStorage.setItem("qt_return", targetReturnTo);
      if (targetReturnTo.includes("autoOpenWrite=true")) {
        localStorage.setItem("qt_autoOpenWrite", "1");
      }
    } catch {
      // ignore storage errors
    }

    try {
      await startOAuthSignIn("google", targetReturnTo);
    } catch (error) {
      console.error("LoginModal google start error", error);
      setLocation(`/auth?returnTo=${encodeURIComponent(targetReturnTo)}`);
    }
  };

  const handleAppleLogin = async () => {
    const targetReturnTo = resolveTargetReturnTo();
    try {
      localStorage.setItem("qt_return", targetReturnTo);
      if (targetReturnTo.includes("autoOpenWrite=true")) {
        localStorage.setItem("qt_autoOpenWrite", "1");
      }
    } catch {
      // ignore storage errors
    }

    try {
      await startOAuthSignIn("apple", targetReturnTo);
    } catch (error) {
      console.error("LoginModal apple start error", error);
      setLocation(`/auth?returnTo=${encodeURIComponent(targetReturnTo)}`);
    }
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
            className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 80) {
                onOpenChange(false);
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[401] max-w-lg mx-auto max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white px-6 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-2xl"
          >
            <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-6" />

            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-6 top-6 text-zinc-400 transition-colors hover:text-zinc-600"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center gap-4">
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
                카카오로 시작하기
              </button>

              <button
                onClick={handleGoogleLogin}
                className="flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] bg-white border-2 border-zinc-200 font-bold text-zinc-900 shadow-sm transition-all active:scale-95"
              >
                <FcGoogle size={24} />
                구글로 시작하기
              </button>

              <button
                onClick={() => alert("준비중입니다.")}
                className="flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] bg-black font-bold text-white shadow-sm transition-all active:scale-95"
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.769 11.348c-.026-2.666 2.18-3.958 2.279-4.02-1.243-1.817-3.177-2.065-3.862-2.088-1.638-.167-3.21.974-4.041.974-.846 0-2.135-.952-3.516-.925-1.8.027-3.468 1.053-4.393 2.663-1.882 3.257-.481 8.075 1.349 10.716.898 1.293 1.963 2.742 3.363 2.69 1.357-.054 1.868-.869 3.508-.869 1.641 0 2.11.869 3.534.84 1.458-.024 2.38-1.315 3.267-2.614.753-1.08 1.323-2.161 1.611-3.178-3.553-1.35-3.098-5.189-3.099-5.19zM13.108 3.614C13.845 2.72 14.35 1.488 14.21.23c-1.083.048-2.44.724-3.21 1.617-.713.8-1.335 2.081-1.168 3.295 1.199.094 2.428-.612 3.276-1.528z"/>
                </svg>
                애플로 시작하기
              </button>

              <button
                onClick={() => {
                  onOpenChange(false);
                  const inviteGroupId = readInviteGroupId();
                  const inviteQuery = inviteGroupId ? `?${GROUP_INVITE_QUERY_KEY}=${encodeURIComponent(inviteGroupId)}` : "";
                  setLocation(`/register${inviteQuery}`);
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
