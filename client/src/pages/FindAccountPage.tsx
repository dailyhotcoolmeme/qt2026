import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { findIdByEmail } from "../lib/auth-client";

export default function FindAccountPage() {
  const [location, setLocation] = useLocation();
  const settings = useDisplaySettings();
  const fontSize = settings?.fontSize || 16;

  const [activeTab, setActiveTab] = useState<"id" | "pw">("id");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const handleUrlChange = () => {
      const currentUrl = window.location.href;
      setActiveTab(currentUrl.includes("tab=pw") ? "pw" : "id");
    };

    handleUrlChange();
    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("popstate", handleUrlChange);

    return () => {
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [location]);

  const handleFindId = async () => {
    if (!email.trim()) return;

    setIsLoading(true);
    setResult(null);
    try {
      const username = await findIdByEmail(email.trim());
      if (username) {
        setResult({ success: true, message: `가입된 아이디는 [${username}] 입니다.` });
      } else {
        setResult({ success: false, message: "해당 이메일로 가입된 계정을 찾지 못했습니다." });
      }
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "아이디 찾기에 실패했습니다." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    if (!email.trim()) return;
    setLocation(`/update-password?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div className="relative z-50 flex min-h-screen w-full flex-col bg-[#F8F8F8] text-left">
      <div className="flex items-center gap-4 px-6 pb-6 pt-12">
        <button onClick={() => setLocation("/")} className="-ml-2 p-2 text-zinc-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.2}px` }}>
          계정 정보 찾기
        </h2>
      </div>

      <div className="flex-1 px-8 pt-4">
        <div className="mb-10 flex rounded-[20px] bg-zinc-100 p-1.5">
          <button
            onClick={() => {
              setActiveTab("id");
              setResult(null);
            }}
            className={`flex-1 rounded-[16px] py-3 font-bold transition-all ${activeTab === "id" ? "bg-white text-[#4A6741] shadow-sm" : "text-zinc-400"}`}
          >
            아이디 찾기
          </button>
          <button
            onClick={() => {
              setActiveTab("pw");
              setResult(null);
            }}
            className={`flex-1 rounded-[16px] py-3 font-bold transition-all ${activeTab === "pw" ? "bg-white text-[#4A6741] shadow-sm" : "text-zinc-400"}`}
          >
            비밀번호 재설정
          </button>
        </div>

        <div className="mb-8 px-1">
          <h3 className="mb-2 font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.4}px` }}>
            {activeTab === "id" ? "아이디를 찾고 싶나요?" : "비밀번호를 다시 설정할까요?"}
          </h3>
          <p className="font-medium leading-relaxed text-zinc-400" style={{ fontSize: `${fontSize * 0.9}px` }}>
            가입할 때 사용한 이메일 주소를 입력해 주세요.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-[24px] border-2 border-transparent bg-white p-5 shadow-sm focus-within:border-[#4A6741]">
            <Mail className="text-zinc-300" size={20} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="이메일 주소 입력"
              className="flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none"
            />
          </div>

          <button
            onClick={activeTab === "id" ? handleFindId : handleResetPassword}
            disabled={isLoading || !email.trim()}
            className={`flex h-[64px] w-full items-center justify-center gap-2 rounded-[22px] font-black text-white shadow-lg transition-all ${activeTab === "pw" ? "bg-[#4A6741]" : "bg-zinc-900"}`}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : activeTab === "id" ? "확인하기" : "다음으로"}
          </button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-8 flex items-start gap-3 rounded-[24px] p-6 ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
            >
              {result.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="font-bold leading-relaxed">{result.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
