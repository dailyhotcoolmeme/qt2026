import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, MailOpen, KeyRound } from "lucide-react";

export default function UpdatePasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState(""); 
  const [otp, setOtp] = useState("");     
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false); 
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // 1단계: 6자리 코드로 인증 확인
  const handleVerifyOtp = async () => {
    if (!email || !otp) {
      setStatus({ type: "error", msg: "이메일과 인증번호를 모두 입력해주세요." });
      return;
    }
    setIsLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'recovery'
    });

    if (error) {
      setStatus({ type: "error", msg: "인증번호가 틀렸거나 만료되었습니다." });
    } else {
      setIsVerified(true);
      setStatus({ type: "success", msg: "인증 성공! 이제 새 비밀번호를 입력하세요." });
    }
    setIsLoading(false);
  };

  // 2단계: 비밀번호 변경
  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "비밀번호가 일치하지 않습니다." });
      return;
    }
    if (password.length < 6) {
      setStatus({ type: "error", msg: "비밀번호는 6자리 이상이어야 합니다." });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;
      setStatus({ type: "success", msg: "성공! 로그인 페이지로 이동합니다." });
      setTimeout(() => setLocation("/auth"), 2000);
    } catch (e: any) {
      setStatus({ type: "error", msg: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col px-8 pt-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto w-full">
        
        {!isVerified && (
          <div className="bg-amber-50 p-5 rounded-[24px] mb-8 border border-amber-100 flex items-start gap-3">
            <MailOpen className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-amber-900 font-black text-[16px] mb-1">메일함을 확인해주세요</p>
              <p className="text-amber-700/80 font-bold text-[13px] leading-tight">
                메일(또는 스팸함)로 발송된 6자리 숫자를 아래에 입력해 주세요.
              </p>
            </div>
          </div>
        )}

        <h1 className="text-[32px] font-black text-zinc-900 leading-tight mb-2">
          {isVerified ? "새 비밀번호" : "인증번호 입력"}
        </h1>
        <p className="text-zinc-400 font-medium mb-10">
          {!isVerified ? "가입하신 이메일과 번호를 입력해주세요." : "로그인 시 사용할 비밀번호를 설정하세요."}
        </p>

        <div className="space-y-4">
          {!isVerified ? (
            <>
              <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741]">
                <label className="text-[#4A6741] font-bold text-[11px] block mb-2">가입 이메일</label>
                <input 
                  className="w-full bg-transparent outline-none font-bold text-zinc-900 pr-10"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative flex items-center">
                <div className="flex-1 text-center">
                  <label className="text-[#4A6741] font-bold text-[11px] block mb-2 text-left">인증번호 6자리</label>
                  <input 
                    className="w-full bg-transparent outline-none font-black text-zinc-900 text-2xl tracking-[10px]"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              </div>
              <button onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 6} className="w-full h-[64px] bg-zinc-900 text-white rounded-[22px] font-black shadow-lg flex items-center justify-center">
                {isLoading ? <Loader2 className="animate-spin" /> : "인증번호 확인"}
              </button>
            </>
          ) : (
            <>
              {/* 비밀번호 입력창 - 기존 디자인 유지 */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] relative flex items-center">
                <div className="flex-1">
                  <label className="text-[#4A6741] font-bold text-[11px] block mb-2">새 비밀번호</label>
                  <input 
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent outline-none font-bold text-zinc-900 pr-10"
                    placeholder="6자리 이상"
                  />
                </div>
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-6 text-zinc-300">
                  {showPw ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
              {/* 비밀번호 확인창 생략 (이전과 동일 구조) */}
              <button onClick={handleUpdatePassword} disabled={isLoading || !password} className="w-full h-[64px] bg-[#4A6741] text-white rounded-[22px] font-black shadow-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : "변경 완료하기"}
              </button>
            </>
          )}
        </div>

        {status && (
          <div className={`mt-6 p-5 rounded-[22px] flex items-start gap-3 ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {status.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="font-bold text-sm leading-relaxed">{status.msg}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
