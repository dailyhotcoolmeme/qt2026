import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";
import { motion } from "framer-motion"; 
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

export default function FindAccountPage() {
  const [, setLocation] = useLocation();
  const settings = useDisplaySettings();
  const fontSize = settings?.fontSize || 16;
  
  const [activeTab, setActiveTab] = useState<"id" | "pw">("id");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFindId = async () => {
    if (!email) return;
    setIsLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.from("profiles").select("username").eq("email", email.trim()).maybeSingle();
      if (error) throw error;
      if (data) {
        setResult({ success: true, message: `회원님의 아이디는 [${data.username}] 입니다.` });
      } else {
        setResult({ success: false, message: "해당 이메일로 가입된 정보가 없습니다." });
      }
    } catch (e: any) {
      setResult({ success: false, message: "오류가 발생했습니다." });
    } finally { setIsLoading(false); }
  };

  // 핵심 수정 부분: 이메일 발송 후 즉시 페이지 이동
  const handleResetPw = async () => {
  if (!email) return;
  setIsLoading(true);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
    
    // 핵심: 이메일 주소를 주소창(Query String)에 담아서 보냅니다.
    setLocation(`/update-password?email=${encodeURIComponent(email.trim())}`); 

  } catch (e: any) {
    setIsLoading(false);
    setResult({ success: false, message: "이메일 발송 실패." });
  }
};


  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative z-50">
      <div className="px-6 pt-12 pb-6 flex items-center gap-4">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.2}px` }}>계정 정보 찾기</h2>
      </div>

      <div className="flex-1 px-8 pt-4">
        <div className="flex bg-zinc-100 p-1.5 rounded-[20px] mb-10">
          <button onClick={() => { setActiveTab("id"); setResult(null); }} className={`flex-1 py-3 rounded-[16px] font-bold transition-all ${activeTab === "id" ? "bg-white text-[#4A6741] shadow-sm" : "text-zinc-400"}`}>아이디 찾기</button>
          <button onClick={() => { setActiveTab("pw"); setResult(null); }} className={`flex-1 py-3 rounded-[16px] font-bold transition-all ${activeTab === "pw" ? "bg-white text-[#4A6741] shadow-sm" : "text-zinc-400"}`}>비밀번호 찾기</button>
        </div>

        <div className="mb-8 px-1">
          <h3 className="font-black text-zinc-900 mb-2" style={{ fontSize: `${fontSize * 1.4}px` }}>
            {activeTab === "id" ? "아이디를 잊으셨나요?" : "비밀번호를 재설정할까요?"}
          </h3>
          <p className="text-zinc-400 font-medium leading-relaxed" style={{ fontSize: `${fontSize * 0.9}px` }}>
            가입 시 등록한 이메일 주소를 입력해 주세요.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-transparent focus-within:border-[#4A6741] flex items-center gap-4">
            <Mail className="text-zinc-300" size={20} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소 입력" className="flex-1 bg-transparent outline-none font-bold text-zinc-900 text-sm" />
          </div>

          <button 
            onClick={activeTab === "id" ? handleFindId : handleResetPw}
            disabled={isLoading || !email}
            className="w-full h-[64px] bg-[#4A6741] disabled:bg-zinc-200 text-white rounded-[22px] font-black shadow-lg flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "확인하기"}
          </button>
        </div>

        {result && (
          <div className={`mt-8 p-6 rounded-[24px] flex items-start gap-3 ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.success ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
            <p className="font-bold leading-relaxed" style={{ fontSize: `${fontSize * 0.9}px` }}>{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
