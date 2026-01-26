import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const handleSession = async () => {
      // 1. URL에서 직접 access_token 추출 (가장 확실한 방법)
      const fullUrl = window.location.href;
      const hashParams = new URLSearchParams(fullUrl.split('#')[1] || fullUrl.split('?')[1]);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        // 2. 토큰이 발견되면 즉시 세션 수동 수립
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) console.log("인증 세션 수동 수립 성공");
      }
    };
    handleSession();
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
      // 3. 비밀번호 업데이트 시도
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;

      setStatus({ type: "success", msg: "비밀번호가 변경되었습니다! 로그인 페이지로 이동합니다." });
      setTimeout(() => setLocation("/auth"), 2000);
    } catch (e: any) {
      setStatus({ type: "error", msg: "인증 세션이 유효하지 않습니다. 메일을 다시 보내주세요." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col items-center px-8 pt-24">
      <div className="w-full max-w-sm text-center mb-12">
        <h2 className="font-black text-zinc-900 mb-4 text-2xl">새 비밀번호 설정</h2>
        <p className="text-zinc-400 font-medium">로그인 시 사용할 새로운 비밀번호를 입력해 주세요.</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* 새 비밀번호 입력창 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative flex items-center">
          <div className="flex-1">
            <label className="text-[#4A6741] font-bold text-[11px] block mb-2">새 비밀번호</label>
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-zinc-300 shrink-0" />
              <input 
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-zinc-900 pr-10"
                placeholder="6자리 이상 입력"
              />
            </div>
          </div>
          {/* 눈 아이콘 버튼 */}
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-6 text-zinc-300 p-1">
            {showPw ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>

        {/* 비밀번호 확인 입력창 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative flex items-center">
          <div className="flex-1">
            <label className="text-[#4A6741] font-bold text-[11px] block mb-2">비밀번호 확인</label>
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-zinc-300 shrink-0" />
              <input 
                type={showPwConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-zinc-900 pr-10"
                placeholder="한번 더 입력"
              />
            </div>
          </div>
          <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)} className="absolute right-6 text-zinc-300 p-1">
            {showPwConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
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
