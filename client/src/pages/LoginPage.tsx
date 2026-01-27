import React, { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      setLocation("/");
    } catch (error: any) {
      alert(error.message || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-8 pt-20 flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto w-full"
      >
        <button onClick={() => setLocation("/auth")} className="mb-8 text-zinc-400">
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-[32px] font-black text-zinc-900 leading-tight mb-2">
          다시 만나서<br />반가워요!
        </h1>
        <p className="text-zinc-400 font-medium mb-12">로그인하여 큐티를 시작하세요.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="bg-zinc-50 rounded-[24px] p-5 flex items-center gap-4">
            <Mail className="text-zinc-300" size={20} />
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900"
              required
            />
          </div>

          <div className="bg-zinc-50 rounded-[24px] p-5 flex items-center gap-4">
            <Lock className="text-zinc-300" size={20} />
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900"
              required
            />
          </div>

          <div className="flex justify-end px-2 pt-2">
            {/* 문구를 통합하고 경로를 단순화했습니다 */}
            <button 
              type="button"
              onClick={() => setLocation("/find-account")} 
              className="text-zinc-400 text-sm font-bold hover:text-zinc-600"
            >
              아이디 · 비밀번호 찾기
            </button>
          </div>

          <button 
            disabled={isLoading}
            type="submit" 
            className="w-full h-16 bg-[#4A6741] text-white rounded-[28px] font-black shadow-lg shadow-green-900/10 flex items-center justify-center gap-2 mt-8 active:scale-95 transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "로그인하기"}
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-zinc-400 font-medium mb-4">계정이 없으신가요?</p>
          <button 
            onClick={() => setLocation("/register")}
            className="text-zinc-900 font-black border-b-2 border-zinc-900 pb-0.5"
          >
            회원가입 하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
