import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { CheckCircle2, AlertCircle, Loader2, MailOpen, ArrowLeft } from "lucide-react";
import { resetPassword } from "../lib/auth-client";

export default function UpdatePasswordPage() {
  const [, setLocation] = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialEmail = searchParams.get("email") || "";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleUpdatePassword = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setStatus({ type: "error", msg: "아이디, 이메일, 새 비밀번호를 모두 입력해 주세요." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "비밀번호 확인이 일치하지 않습니다." });
      return;
    }

    setIsLoading(true);
    setStatus(null);
    try {
      await resetPassword({
        username: username.trim(),
        email: email.trim(),
        newPassword: password.trim(),
      });
      setStatus({ type: "success", msg: "비밀번호가 변경되었습니다. 홈으로 이동합니다." });
      setTimeout(() => setLocation("/"), 1200);
    } catch (error) {
      setStatus({ type: "error", msg: error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] px-8 pt-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-md">
        <button onClick={() => setLocation("/find-account?tab=pw")} className="mb-6 -ml-2 p-2 text-zinc-400">
          <ArrowLeft size={24} />
        </button>

        <div className="mb-8 flex items-start gap-3 rounded-[24px] border border-amber-100 bg-amber-50 p-5">
          <MailOpen className="mt-0.5 shrink-0 text-amber-600" size={20} />
          <div>
            <p className="mb-1 text-[16px] font-black text-amber-900">계정 확인 후 새 비밀번호를 설정합니다.</p>
            <p className="text-[13px] font-bold leading-tight text-amber-700/80">
              가입한 아이디와 이메일을 입력해 주세요.
            </p>
          </div>
        </div>

        <h1 className="mb-2 text-[32px] font-black text-zinc-900">새 비밀번호 설정</h1>

        <div className="mt-8 space-y-4">
          <input
            className="h-[64px] w-full rounded-[22px] bg-white px-6 font-bold shadow-sm outline-none"
            placeholder="아이디"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            type="email"
            className="h-[64px] w-full rounded-[22px] bg-white px-6 font-bold shadow-sm outline-none"
            placeholder="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            className="h-[64px] w-full rounded-[22px] bg-white px-6 font-bold shadow-sm outline-none"
            placeholder="새 비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <input
            type="password"
            className="h-[64px] w-full rounded-[22px] bg-white px-6 font-bold shadow-sm outline-none"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button
            onClick={handleUpdatePassword}
            disabled={isLoading || !username.trim() || !email.trim() || !password.trim()}
            className="h-[64px] w-full rounded-[22px] bg-[#4A6741] font-black text-white shadow-lg"
          >
            {isLoading ? <Loader2 className="mx-auto animate-spin" /> : "변경 완료하기"}
          </button>
        </div>

        {status && (
          <div className={`mt-6 flex items-start gap-3 rounded-[22px] p-5 ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {status.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-bold leading-relaxed">{status.msg}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
