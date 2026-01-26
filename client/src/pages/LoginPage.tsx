import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Lock, User, Eye, EyeOff, Check, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit } = useForm();
  
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, title: "", msg: "", type: "error" });
  const [autoLogin, setAutoLogin] = useState(true);

  const onLogin = async (values: any) => {
    const { username, password } = values;
    
    if (!username || !password) {
      setModal({ show: true, title: "입력 확인", msg: "아이디와 비밀번호를 모두 입력해주세요.", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      // 1. 아이디(username)로 해당 유저의 이메일 찾기
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", username)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error("존재하지 않는 아이디입니다.");
      }

      // 2. 찾은 이메일로 로그인 시도
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password,
      });

      if (loginError) {
        if (loginError.message.includes("Invalid login credentials")) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        throw loginError;
      }

      // 로그인 성공
      setLocation("/"); 
    } catch (error: any) {
      setModal({ show: true, title: "로그인 실패", msg: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 pb-24 overflow-x-hidden">
      {/* 커스텀 모달 */}
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-black text-zinc-900 mb-2">{modal.title}</h3>
              <p className="text-zinc-500 font-medium mb-6 text-sm leading-relaxed">{modal.msg}</p>
              <button onClick={() => setModal({ ...modal, show: false })} 
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold active:scale-95 transition-all">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="pt-12 pb-8 text-center">
        <h1 className="font-black text-[#4A6741] tracking-tighter" style={{ fontSize: `${fontSize * 2.2}px` }}>
          WELCOME
        </h1>
        <p className="text-zinc-400 font-bold mt-2" style={{ fontSize: `${fontSize * 0.9}px` }}>서비스 이용을 위해 로그인해주세요</p>
      </header>

      <form onSubmit={handleSubmit(onLogin)} className="mt-8 space-y-4">
        {/* 아이디 입력 */}
        <div className="bg-white rounded-3xl p-5 border-2 border-zinc-100 shadow-sm focus-within:border-[#4A6741] transition-all">
          <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px] mb-2 uppercase tracking-wider">
            <User size={14}/> 아이디
          </label>
          <input 
            {...register("username")}
            autoFocus
            className="w-full bg-transparent outline-none font-black text-zinc-900" 
            placeholder="아이디를 입력하세요" 
            style={{ fontSize: `${fontSize * 1.1}px` }} 
          />
        </div>

        {/* 비밀번호 입력 */}
        <div className="bg-white rounded-3xl p-5 border-2 border-zinc-100 shadow-sm focus-within:border-[#4A6741] transition-all">
          <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px] mb-2 uppercase tracking-wider">
            <Lock size={14}/> 비밀번호
          </label>
          <div className="flex items-center gap-3">
            <input 
              {...register("password")}
              type={showPw ? "text" : "password"} 
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900" 
              placeholder="비밀번호를 입력하세요" 
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">
              {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
        </div>

        {/* 자동 로그인 및 링크 */}
        <div className="flex items-center justify-between px-2 pt-2">
          <button 
            type="button" 
            onClick={() => setAutoLogin(!autoLogin)}
            className="flex items-center gap-2 group"
          >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${autoLogin ? 'bg-[#4A6741]' : 'border-2 border-zinc-200'}`}>
              {autoLogin && <Check size={14} className="text-white" />}
            </div>
            <span className={`text-[13px] font-bold ${autoLogin ? 'text-[#4A6741]' : 'text-zinc-400'}`}>로그인 상태 유지</span>
          </button>
          
          <div className="flex gap-4">
            <Link href="/find-pw">
              <a className="text-zinc-400 font-bold text-[13px] hover:text-zinc-600">비밀번호 찾기</a>
            </Link>
          </div>
        </div>

        {/* 로그인 버튼 */}
        <button 
          disabled={isLoading}
          type="submit" 
          className={`w-full h-16 rounded-[24px] font-black text-white mt-8 shadow-xl transition-all flex items-center justify-center gap-2 ${
            isLoading ? 'bg-zinc-300' : 'bg-[#4A6741] active:scale-[0.98] shadow-[#4A6741]/20'
          }`}
          style={{ fontSize: `${fontSize * 1.1}px` }}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : "로그인"}
        </button>

        {/* 회원가입 유도 */}
        <div className="text-center mt-10">
          <p className="text-zinc-400 font-bold text-[14px]">
            아직 계정이 없으신가요?{" "}
            <Link href="/register">
              <a className="text-[#4A6741] border-b-2 border-[#4A6741]/30 pb-0.5 ml-1">회원가입</a>
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
