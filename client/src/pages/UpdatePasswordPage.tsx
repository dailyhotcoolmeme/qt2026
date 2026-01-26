import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function UpdatePasswordPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const recoverSession = async () => {
      // 1. 현재 URL 전체에서 토큰 파라미터를 추출합니다.
      const fullUrl = window.location.href;
      const urlParams = new URLSearchParams(fullUrl.split('#')[1] || fullUrl.split('?')[1]);
      
      const accessToken = urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");

      if (accessToken && refreshToken) {
        // 2. 추출한 토큰으로 Supabase 세션을 강제로 수립합니다.
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) console.log("인증 세션 수동 복구 완료");
      }
    };
    recoverSession();
  }, []);

  const handleUpdate = async () => {
    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "비밀번호가 일치하지 않습니다." });
      return;
    }
    if (password.length < 6) {
      setStatus({ type: "error", msg: "비밀번호는 6자리 이상이어야 합니다." });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      // 3. 업데이트 시점에 다시 한 번 세션을 체크합니다.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("auth_missing");

      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;

      setStatus({ type: "success", msg: "비밀번호가 성공적으로 변경되었습니다! 곧 로그인 페이지로 이동합니다." });
      setTimeout(() => setLocation("/auth"), 2500);
    } catch (e: any) {
      const errorMsg = (e.message === "auth_missing" || e.message.includes("session"))
        ? "인증 정보가 유효하지 않습니다. 메일의 링크를 다시 클릭하거나 새로 신청해 주세요."
        : e.message || "오류가 발생했습니다.";
      setStatus({ type: "error", msg: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col items-center px-8 pt-24">
      <div className="w-full max-w-sm text-center mb-12">
        <h2 className="font-black text-zinc-900 mb-4" style={{ fontSize: `${fontSize * 1.6}px` }}>새 비밀번호 설정</h2>
        <p className="text-zinc-400 font-medium" style={{ fontSize: `${fontSize * 0.9}px` }}>로그인 시 사용할 새로운 비밀번호를 입력해 주세요.</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* 새 비밀번호 입력 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[#4A6741] font-bold text-[11px] block mb-2">새 비밀번호</label>
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-zinc-300 shrink-0" />
              <input 
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-zinc-900"
                placeholder="6자리 이상 입력"
              />
            </div>
          </div>
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 p-2 hover:text-zinc-500">
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* 비밀번호 확인 입력 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[#4A6741] font-bold text-[11px] block mb-2">비밀번호 확인</label>
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-zinc-300 shrink-0" />
              <input 
                type={showPwConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-zinc-900"
                placeholder="한번 더 입력"
              />
            </div>
          </div>
          <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)} className="text-zinc-300 p-2 hover:text-zinc-500">
            {showPwConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button 
          onClick={handleUpdate}
          disabled={isLoading || !password || !confirmPassword}
          className="w-full h-[64px] bg-[#4A6741] disabled:bg-zinc-200 text-white rounded-[22px] font-black shadow-lg flex items-center justify-center mt-4 transition-all active:scale-95"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : "비밀번호 변경하기"}
        </button>

        {status && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 p-5 rounded-[22px] flex items-start gap-3 ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {status.type === "success" ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
            <p className="font-bold text-sm leading-relaxed">{status.msg}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
