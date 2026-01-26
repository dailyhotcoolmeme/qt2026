import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";

export default function UpdatePasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState(""); // 인증을 위해 이메일 필요
  const [otp, setOtp] = useState("");     // 이메일로 받은 6자리 숫자
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // 인증 성공 여부
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // 1단계: 6자리 코드로 인증 확인 (이때 로그인이 됩니다)
  const handleVerifyOtp = async () => {
    if (!email || !otp) {
      setStatus({ type: "error", msg: "이메일과 인증번호를 모두 입력해주세요." });
      return;
    }
    setIsLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery'
    });

    if (error) {
      setStatus({ type: "error", msg: "인증번호가 틀렸거나 만료되었습니다." });
    } else {
      setIsVerified(true);
      setStatus({ type: "success", msg: "인증되었습니다. 새 비밀번호를 입력하세요." });
    }
    setIsLoading(false);
  };

  // 2단계: 로그인된 상태에서 비밀번호 변경
  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "비밀번호가 일치하지 않습니다." });
      return;
    }
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setStatus({ type: "error", msg: error.message });
    } else {
      setStatus({ type: "success", msg: "비밀번호가 성공적으로 변경되었습니다!" });
      setTimeout(() => setLocation("/login"), 2000);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto w-full">
        <h1 className="text-[32px] font-black text-zinc-900 leading-tight mb-2">
          비밀번호 재설정
        </h1>
        <p className="text-zinc-500 font-medium mb-10">
          {!isVerified ? "이메일로 받은 6자리 인증번호를 입력해주세요." : "새롭게 사용할 비밀번호를 입력해주세요."}
        </p>

        <div className="space-y-4">
          {!isVerified ? (
            // 인증 전 화면
            <>
              <input 
                className="w-full h-[64px] bg-zinc-50 rounded-[22px] px-6 font-bold text-zinc-900 outline-none border-2 border-transparent focus:border-zinc-900 transition-all"
                placeholder="가입한 이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                className="w-full h-[64px] bg-zinc-50 rounded-[22px] px-6 font-bold text-zinc-900 outline-none border-2 border-transparent focus:border-zinc-900 transition-all tracking-[10px] text-center text-2xl"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button 
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 6}
                className="w-full h-[64px] bg-zinc-900 text-white rounded-[22px] font-black shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:bg-zinc-200"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : "인증번호 확인"}
              </button>
            </>
          ) : (
            // 인증 후 비밀번호 입력 화면
            <>
              <div className="relative flex items-center">
                <input 
                  type={showPw ? "text" : "password"}
                  className="w-full h-[64px] bg-zinc-50 rounded-[22px] px-6 font-bold text-zinc-900 outline-none border-2 border-transparent focus:border-zinc-900 transition-all"
                  placeholder="새 비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-6 text-zinc-300">
                  {showPw ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
              <div className="relative flex items-center">
                <input 
                  type={showPwConfirm ? "text" : "password"}
                  className="w-full h-[64px] bg-zinc-50 rounded-[22px] px-6 font-bold text-zinc-900 outline-none border-2 border-transparent focus:border-zinc-900 transition-all"
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)} className="absolute right-6 text-zinc-300">
                  {showPwConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
              <button 
                onClick={handleUpdatePassword}
                disabled={isLoading || !password}
                className="w-full h-[64px] bg-[#4A6741] text-white rounded-[22px] font-black shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:bg-zinc-200"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : "비밀번호 변경 완료"}
              </button>
            </>
          )}
        </div>

        {status && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 p-5 rounded-[22px] flex items-start gap-3 ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {status.type === "success" ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
            <p className="font-bold text-[15px] leading-snug">{status.msg}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
