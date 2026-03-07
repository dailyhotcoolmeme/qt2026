import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, MailOpen } from "lucide-react";

export default function UpdatePasswordPage() {
  const [, setLocation] = useLocation();
  
  // 1. 주소창에서 이메일 주소를 자동으로 가져옵니다.
  const searchParams = new URLSearchParams(window.location.search);
  const initialEmail = searchParams.get("email") || "";

  const [email] = useState(initialEmail); 
  const [otp, setOtp] = useState("");     
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false); 
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleVerifyOtp = async () => {
    if (!email || !otp) {
      setStatus({ type: "error", msg: "인증번호를 입력해주세요." });
      return;
    }
    setIsLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp.trim(), // 메일로 온 8자리 숫자를 그대로 사용합니다.
      type: 'recovery'
    });

    if (error) {
      setStatus({ type: "error", msg: "인증번호가 틀렸거나 만료되었습니다." });
    } else {
      setIsVerified(true);
      setStatus({ type: "success", msg: "인증 성공! 이제 새 비밀번호를 설정하세요." });
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "비밀번호가 일치하지 않습니다." });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password.trim() });
    if (error) {
      setStatus({ type: "error", msg: error.message });
    } else {
      setStatus({ type: "success", msg: "성공! 로그인 페이지로 이동합니다." });
      setTimeout(() => setLocation("/auth"), 2000);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col px-8 pt-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto w-full">
        
        {!isVerified && (
          <div className="bg-amber-50 p-5 rounded-[24px] mb-8 border border-amber-100 flex items-start gap-3">
            <MailOpen className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-amber-900 font-black text-[16px] mb-1">인증번호가 발송되었습니다</p>
              <p className="text-amber-700/80 font-bold text-[13px] leading-tight">
                {email} 메일함에 도착한 숫자를 입력해 주세요.
              </p>
            </div>
          </div>
        )}

        <h1 className="text-[32px] font-black text-zinc-900 mb-2">
          {isVerified ? "새 비밀번호" : "인증번호 입력"}
        </h1>

        <div className="mt-8 space-y-4">
          {!isVerified ? (
            <>
              <div className="bg-white rounded-[24px] p-6 shadow-sm border-2 border-transparent focus-within:border-[#4A6741]">
                <label className="text-[#4A6741] font-bold text-[11px] block mb-3 uppercase tracking-wider">인증번호 입력</label>
                <input 
                  className="w-full bg-transparent outline-none font-black text-zinc-900 text-3xl tracking-[4px] text-center"
                  placeholder="숫자 입력"
                  maxLength={10} // 8자리 이상 대응을 위해 여유있게 설정
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button onClick={handleVerifyOtp} disabled={isLoading || otp.length < 6} className="w-full h-[64px] bg-zinc-900 text-white rounded-[22px] font-black shadow-lg">
                {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "인증번호 확인"}
              </button>
            </>
          ) : (
            <>
              {/* 비밀번호 설정창 (기존 유지) */}
              <input 
                type="password"
                className="w-full h-[64px] bg-white rounded-[22px] px-6 font-bold shadow-sm outline-none"
                placeholder="새 비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input 
                type="password"
                className="w-full h-[64px] bg-white rounded-[22px] px-6 font-bold shadow-sm outline-none"
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button onClick={handleUpdatePassword} disabled={isLoading || !password} className="w-full h-[64px] bg-[#4A6741] text-white rounded-[22px] font-black shadow-lg">
                변경 완료하기
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
