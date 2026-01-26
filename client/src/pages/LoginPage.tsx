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
  const [modal, setModal] = useState({ show: false, title: "", msg: "" });

  const handleKakaoLogin = async () => {
    // 🟢 로그인 시에는 약관 동의 체크 과정 없음
    await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: window.location.origin } });
  };

  const onLogin = async (values: any) => {
    setIsLoading(true);
    try {
      const { data: profile, error: pErr } = await supabase.from("profiles").select("email").eq("username", values.username).maybeSingle();
      if (pErr || !profile) throw new Error("아이디를 확인해주세요.");
      const { error: lErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: values.password });
      if (lErr) throw new Error("비밀번호가 틀렸습니다.");
      setLocation("/");
    } catch (e: any) {
      setModal({ show: true, title: "로그인 실패", msg: e.message });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 overflow-x-hidden">
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4"><AlertCircle size={24} /></div>
              <h3 className="font-black mb-2">{modal.title}</h3>
              <p className="text-zinc-500 mb-6 text-sm">{modal.msg}</p>
              <button onClick={() => setModal({ show: false, title: "", msg: "" })} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="pt-16 pb-8 text-center">
        <h1 className="font-black text-[#4A6741] tracking-tighter" style={{ fontSize: `${fontSize * 2.2}px` }}>WELCOME</h1>
        <p className="text-zinc-400 font-bold mt-2">아이디로 로그인하거나 카카오로 시작하세요</p>
      </header>

      <div className="space-y-6">
        <button onClick={handleKakaoLogin} className="w-full h-16 bg-[#FEE500] rounded-[24px] flex items-center justify-center gap-3 font-bold text-zinc-900 shadow-lg active:scale-95 transition-all">
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg" className="w-6" alt="kakao" /> 카카오 로그인
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-1 border-t border-zinc-100"></div>
          <span className="px-4 text-zinc-300 text-[10px] font-black uppercase tracking-widest">or login with ID</span>
          <div className="flex-1 border-t border-zinc-100"></div>
        </div>

        <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border-2 border-zinc-100 focus-within:border-[#4A6741] transition-all">
            <label className="font-bold text-[#4A6741] text-[11px] mb-2 block uppercase tracking-wider">ID</label>
            <input {...register("username")} className="w-full bg-transparent outline-none font-black" placeholder="아이디 입력" />
          </div>

          <div className="bg-white rounded-3xl p-5 border-2 border-zinc-100 focus-within:border-[#4A6741] transition-all">
            <label className="font-bold text-[#4A6741] text-[11px] mb-2 block uppercase tracking-wider">Password</label>
            <div className="flex items-center gap-3">
              <input {...register("password")} type={showPw ? "text" : "password"} className="flex-1 bg-transparent outline-none font-bold" placeholder="비밀번호 입력" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
          </div>

          <div className="flex justify-between px-2 pt-2">
            {/* 🛠️ 비밀번호 찾기 클릭 시 파라미터를 들고 이동하도록 수정 */}
            <Link href="/find-account?tab=pw">
              <a className="text-zinc-400 font-bold text-xs">비밀번호 찾기</a>
            </Link>
            <Link href="/register">
              <a className="text-[#4A6741] font-bold text-xs underline underline-offset-4">회원가입 하기</a>
            </Link>
          </div>

          <button disabled={isLoading} type="submit" className="w-full h-16 bg-[#4A6741] text-white rounded-[28px] font-black shadow-xl mt-6 active:scale-95 transition-all flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="animate-spin
