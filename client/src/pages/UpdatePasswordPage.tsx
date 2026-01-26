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

  // [중요] 페이지 로드 시 해시에 있는 토큰을 수동으로 세션에 주입
  useEffect(() => {
    const handleInitialSession = async () => {
      // 1. 현재 주소창의 전체 URL에서 토큰을 찾습니다.
      const fullUrl = window.location.href;
      
      // Supabase 이메일 링크는 보통 #access_token=... 형태로 옵니다.
      if (fullUrl.includes("access_token")) {
        // 해시(#) 뒤의 내용을 쿼리 파라미터처럼 분석합니다.
        const hashContent = window.location.hash.split('#').pop() || "";
        const urlParams = new URLSearchParams(hashContent.includes("?") ? hashContent.split("?")[1] : hashContent);
        
        const accessToken = urlParams.get("access_token");
        const refreshToken = urlParams.get("refresh_token");

        if (accessToken && refreshToken) {
          // 2. Supabase 세션을 강제로 설정합니다.
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!error) console.log("인증 세션 수동 복구 성공");
        }
      }
    };
    handleInitialSession();
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
      // 세션을 한 번 더 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("session_missing");

      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;

      setStatus({ type: "success", msg: "비밀번호 변경 완료! 잠시 후 로그인 페이지로 이동합니다." });
      setTimeout(() => setLocation("/auth"), 2500);
    } catch (e: any) {
      // 세션이 없거나 오류가 난 경우
      const msg = (e.message === "session_missing" || e.message.includes("session"))
        ? "인증 세션이 만료되었습니다. 다시 '비밀번호 찾기' 메일을 보내주세요."
        : e.message || "비밀번호 변경에 실패했습니다.";
      setStatus({ type: "error", msg });
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
        {/* 새 비밀번호 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative flex items-center gap-3">
          <div className="flex-1 flex flex-col">
            <label className="text-[#4A6741] font-bold text-[11px] mb-2">새 비밀번호</label>
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
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 p-2 hover:text-[#4A6741] transition-colors">
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* 비밀번호 확인 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative flex items-center gap-3">
          <div className="flex-1 flex flex-col">
            <label className="text-[#4A6741] font-bold text-[11px] mb-2">비밀번호 확인</label>
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
          <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)} className="text-zinc-300 p-2 hover:text-[#4A6741] transition-colors">
            {showPwConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button 
          onClick={handleUpdate}
          disabled={isLoading || !password || !confirmPassword}
          className="w-full h-[64px] bg-[#4A6741] disabled:bg-zinc-200 text-white rounded-[22px] font-black shadow-lg flex items-center justify-center mt-4 active:scale-95 transition-all"
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
