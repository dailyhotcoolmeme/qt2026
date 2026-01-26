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
  const [showPwConfirm, setShowPwConfirm] = useState(false); // 두 번째 박스용 상태 추가
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // 세션 유실 방지 로직
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // 세션이 없을 경우 1초 정도 기다렸다가 다시 확인 (Supabase 초기화 지연 대응)
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            console.warn("인증 세션을 찾을 수 없습니다. 링크를 다시 확인해주세요.");
          }
        }, 1000);
      }
    };
    checkSession();
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
      // 세션을 명시적으로 체크한 후 업데이트 실행
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("인증 세션이 만료되었습니다. 다시 '비밀번호 찾기' 메일을 보내주세요.");
      }

      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;

      setStatus({ type: "success", msg: "비밀번호가 성공적으로 변경되었습니다! 곧 로그인 페이지로 이동합니다." });
      
      setTimeout(() => {
        setLocation("/auth");
      }, 2500);
    } catch (e: any) {
      // 세션 관련 에러인 경우 더 친절하게 안내
      const errorMsg = e.message.includes("session") 
        ? "인증 시간이 초과되었습니다. 메일을 다시 보내주세요." 
        : e.message || "비밀번호 변경에 실패했습니다.";
      setStatus({ type: "error", msg: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col items-center px-8 pt-24">
      <div className="w-full max-w-sm text-center mb-12">
        <h2 className="font-black text-zinc-900 mb-4" style={{ fontSize: `${fontSize * 1.6}px` }}>
          새 비밀번호 설정
        </h2>
        <p className="text-zinc-400 font-medium" style={{ fontSize: `${fontSize * 0.9}px` }}>
          로그인 시 사용할 새로운 비밀번호를<br />입력해 주세요.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* 새 비밀번호 입력 */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative">
          <label className="text-[#4A6741] font-bold text-[11px] block mb-2">새 비밀번호</label>
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-zinc-300" />
            <input 
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900"
              placeholder="6자리 이상 입력"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 p-1">
              {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* 비밀번호 확인 입력 (눈 표시 추가) */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative">
          <label className="text-[#4A6741] font-bold text-[11px] block mb-2">비밀번호 확인</label>
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-zinc-300" />
            <input 
              type={showPwConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900"
              placeholder="한번 더 입력"
            />
            <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)} className="text-zinc-300 p-1">
              {showPwConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
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

        {/* 상태 메시지 */}
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-6 p-5 rounded-[22px] flex items-start gap-3 ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {status.type === "success" ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
            <p className="font-bold text-sm leading-relaxed">{status.msg}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
