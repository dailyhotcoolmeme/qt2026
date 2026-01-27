import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";
import { motion } from "framer-motion"; 
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2, UserSearch, KeyRound } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function FindAccountPage() {
  const [, setLocation] = useLocation();
  const settings = useDisplaySettings();
  const fontSize = settings?.fontSize || 16;
  
  const [emailForId, setEmailForId] = useState("");
  const [emailForPw, setEmailForPw] = useState("");
  const [isLoadingId, setIsLoadingId] = useState(false);
  const [isLoadingPw, setIsLoadingPw] = useState(false);
  const [idResult, setIdResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pwResult, setPwResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFindId = async () => {
    if (!emailForId) return;
    setIsLoadingId(true);
    setIdResult(null);
    try {
      const { data, error } = await supabase.from("profiles").select("username").eq("email", emailForId.trim()).maybeSingle();
      if (error) throw error;
      if (data) {
        setIdResult({ success: true, message: `회원님의 아이디: ${data.username}` });
      } else {
        setIdResult({ success: false, message: "해당 이메일 정보가 없습니다." });
      }
    } catch (e: any) {
      setIdResult({ success: false, message: "오류 발생" });
    } finally { setIsLoadingId(false); }
  };

  const handleResetPw = async () => {
    if (!emailForPw) return;
    setIsLoadingPw(true);
    setPwResult(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailForPw.trim());
      if (error) throw error;
      setLocation(`/update-password?email=${encodeURIComponent(emailForPw.trim())}`); 
    } catch (e: any) {
      setIsLoadingPw(false);
      setPwResult({ success: false, message: "발송 실패" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative z-50 overflow-y-auto">
      <div className="px-6 pt-12 pb-6 flex items-center gap-4">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.1}px` }}>계정 찾기</h2>
      </div>

      <div className="flex-1 px-8 space-y-12 pb-20">
        
        {/* 섹션 1: 아이디 찾기 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UserSearch size={fontSize} className="text-[#4A6741]" />
            <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.1}px` }}>아이디 찾기</h3>
          </div>
          <div className="bg-white rounded-[24px] p-4 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] flex items-center gap-3 mb-3">
            <Mail className="text-zinc-300" size={18} />
            <input 
              type="email" 
              value={emailForId} 
              onChange={(e) => setEmailForId(e.target.value)} 
              placeholder="가입 이메일 입력" 
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900"
              style={{ fontSize: `${fontSize * 0.9}px` }}
            />
          </div>
          <button 
            onClick={handleFindId}
            disabled={isLoadingId || !emailForId}
            className="w-full h-14 bg-zinc-900 text-white rounded-[18px] font-black text-sm disabled:bg-zinc-200 shadow-md"
          >
            {isLoadingId ? <Loader2 className="animate-spin mx-auto" size={20} /> : "아이디 확인"}
          </button>
          {idResult && (
            <div className={`mt-3 p-4 rounded-[18px] text-[13px] font-bold ${idResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {idResult.message}
            </div>
          )}
        </section>

        <hr className="border-zinc-200" />

        {/* 섹션 2: 비밀번호 찾기 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={fontSize} className="text-[#4A6741]" />
            <h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.1}px` }}>비밀번호 찾기</h3>
          </div>
          <p className="text-zinc-400 font-bold mb-4" style={{ fontSize: `${fontSize * 0.8}px` }}>
            이메일로 전송된 8자리 숫자로 재설정할 수 있습니다.
          </p>
          <div className="bg-white rounded-[24px] p-4 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] flex items-center gap-3 mb-3">
            <Mail className="text-zinc-300" size={18} />
            <input 
              type="email" 
              value={emailForPw} 
              onChange={(e) => setEmailForPw(e.target.value)} 
              placeholder="가입 이메일 입력" 
              className="flex-1 bg-transparent outline-none font-bold text-zinc-900"
              style={{ fontSize: `${fontSize * 0.9}px` }}
            />
          </div>
          <button 
            onClick={handleResetPw}
            disabled={isLoadingPw || !emailForPw}
            className="w-full h-14 bg-[#4A6741] text-white rounded-[18px] font-black text-sm disabled:bg-zinc-200 shadow-md"
          >
            {isLoadingPw ? <Loader2 className="animate-spin mx-auto" size={20} /> : "비밀번호 재설정 메일 발송"}
          </button>
          {pwResult && (
            <div className="mt-3 p-4 rounded-[18px] bg-red-50 text-red-700 text-[13px] font-bold">
              {pwResult.message}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
