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
    const syncSession = async () => {
      // 1. 현재 주소창의 해시값에서 토큰이 있는지 확인
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        // 2. Supabase에게 이 토큰을 사용해 세션을 수동으로 설정하라고 명령
        const query = new URLSearchParams(hash.replace("#", "?"));
        const accessToken = query.get("access_token");
        const refreshToken = query.get("refresh_token");

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    };
    syncSession();
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
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;

      setStatus({ type: "success", msg: "변경 완료! 로그인 페이지로 이동합니다." });
      setTimeout(() => setLocation("/auth"), 2000);
    } catch (e: any) {
      setStatus({ type: "error", msg: "인증 세션이 만료되었습니다. 다시 '비밀번호 찾기' 메일을 보내주세요." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col items-center px-8 pt-24 relative">
      <div className="w-full max-w-sm text-center mb-12">
        <h2 className="font-black text-zinc-900 mb-4" style={{ fontSize: `${fontSize * 1.6}px` }}>새 비밀번호 설정</h2>
        <p className="text-zinc-400 font-medium" style={{ fontSize: `${fontSize * 0.9}px` }}>로그인 시 사용할 새로운 비밀번호를 입력해 주세요.</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* 새 비밀번호 입력 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative flex flex-col">
          <label className="text-[#4A6741] font-bold text-[11px] block mb-2">새 비밀번호</label>
          <div className="flex items-center relative">
            <Lock size={18} className="text-zinc-300 mr-3 shrink-0" />
            <input 
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900 pr-10 w-full"
              placeholder="6자리 이상 입력"
            />
            {/* 눈 아이콘 버튼: 절대 좌표로 위치 고정 */}
            <button 
              type="button" 
              onClick={() => setShowPw(!showPw)} 
              className="absolute right-0 text-zinc-300 hover:text-[#4A6741] transition-colors p-1 z-10"
            >
              {showPw ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>

        {/* 비밀번호 확인 입력 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative flex flex-col">
          <label className="text-[#4A6741] font-bold text-[11px] block mb-2">비밀번호 확인</label>
          <div className="flex items-center relative">
            <Lock size={18} className="text-zinc-300 mr-3 shrink-0" />
            <input 
              type={showPwConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900 pr-10 w-full"
              placeholder="한번 더 입력"
            />
            <button 
              type="button" 
              onClick={() => setShowPwConfirm(!showPwConfirm)} 
              className="absolute right-0 text-zinc-300 hover:text-[#4A6741] transition-colors p-1 z-10"
            >
              {showPwConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
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
