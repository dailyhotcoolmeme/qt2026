import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Sparkles, Church, User, Lock, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch } = useForm({ mode: "onChange" });
  
  const [usernameMsg, setUsernameMsg] = useState({ text: "", color: "" });
  const [nicknameMsg, setNicknameMsg] = useState({ text: "", color: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showPw, setShowPw] = useState(false);
  
  const username = (watch("username") || "").trim();
  const nickname = watch("nickname") || "";
  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";

  const isPasswordMatch = password.length >= 8 && password === passwordConfirm;
  const showPasswordError = passwordConfirm.length > 0 && password !== passwordConfirm;

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameMsg({ text: "자동 추천되었습니다. 원하시면 직접 수정하셔도 돼요! ✨", color: "text-[#4A6741]" });
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  const checkDuplicate = async (field: "username" | "nickname", value: string) => {
    if (!value) return;
    const { data } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
    const setMsg = field === "username" ? setUsernameMsg : setNicknameMsg;
    
    if (data) setMsg({ text: "이미 사용 중인 정보입니다 😢", color: "text-red-500" });
    else setMsg({ text: "사용 가능한 정보입니다!", color: "text-[#4A6741]" });
  };

  const onSubmit = async (values: any) => {
    if (!isPasswordMatch) return;
    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${values.username}@church.com`,
        password: values.password,
        options: {
          data: {
            nickname: values.nickname,
            full_name: values.fullName,
            phone: values.phone,
            rank: values.rank,
            church: values.church,
          }
        }
      });
      if (authError) throw authError;
      alert("🎉 회원가입이 완료되었습니다!");
      window.location.href = "/";
    } catch (error: any) { alert(error.message); }
    finally { setIsSubmitting(false); }
  };

  const cardStyle = "bg-white rounded-3xl p-5 border-2 border-[#4A6741]/10 shadow-sm mb-4";
  const labelStyle = "text-xs font-bold text-[#4A6741] flex items-center gap-1 mb-2";

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 pb-20 overflow-x-hidden">
      <header className="sticky top-0 bg-[#FCFDFB]/80 backdrop-blur-md z-20 pt-8 pb-4">
        <Link href="/auth"><a className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-zinc-100 text-zinc-400 mb-4"><ArrowLeft size={20} /></a></Link>
        <h1 className="font-black text-zinc-900 tracking-tighter leading-tight" style={{ fontSize: `${fontSize * 1.8}px` }}>회원가입</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <h2 className="font-bold text-zinc-400 mb-4 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>꼭 필요한 정보</h2>

        {/* 아이디 카드 */}
        <div className={cardStyle}>
          <div className="flex justify-between items-center">
            <label className={labelStyle}><User size={14}/> 아이디</label>
            {usernameMsg.text && <span className={`text-[10px] font-bold ${usernameMsg.color}`}>{usernameMsg.text}</span>}
          </div>
          <div className="flex items-center gap-3">
            <input {...register("username", { required: true })} className="bg-transparent outline-none w-full text-zinc-900 font-black" placeholder="영문/숫자 입력" style={{ fontSize: `${fontSize * 1.1}px` }} />
            <button type="button" onClick={() => checkDuplicate("username", username)} className="text-[11px] font-bold px-3 py-2 rounded-xl bg-zinc-100 text-zinc-600 shrink-0 shadow-sm">중복확인</button>
          </div>
        </div>

        {/* 비밀번호 카드 */}
        <div className={`${cardStyle} ${showPasswordError ? 'border-red-100 bg-red-50/20' : isPasswordMatch ? 'border-emerald-100 bg-emerald-50/20' : ''}`}>
          <div className="flex justify-between items-center">
            <label className={labelStyle}><Lock size={14}/> 비밀번호</label>
            {showPasswordError && <span className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertCircle size={10}/> 일치하지 않음</span>}
            {isPasswordMatch && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><Check size={10}/> 비밀번호 일치</span>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-2">
              <input {...register("password", { required: true, minLength: 8 })} type={showPw ? "text" : "password"} placeholder="8자 이상 입력" className="bg-transparent outline-none w-full text-zinc-900 font-bold" style={{ fontSize: `${fontSize}px` }} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input {...register("passwordConfirm", { required: true })} type={showPw ? "text" : "password"} placeholder="비밀번호 재입력" className="bg-transparent outline-none w-full text-zinc-900 font-bold" style={{ fontSize: `${fontSize}px` }} />
            </div>
          </div>
        </div>

        {/* 닉네임 카드 */}
        <div className={cardStyle}>
          <div className="flex justify-between items-center">
            <label className={labelStyle}><Sparkles size={14}/> 닉네임</label>
            <button type="button" onClick={generateNickname} className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold"><RefreshCw size={10} /> 다른추천</button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <input {...register("nickname", { required: true })} className="bg-transparent outline-none w-full text-[#4A6741] font-black" style={{ fontSize: `${fontSize * 1.3}px` }} />
            <button type="button" onClick={() => checkDuplicate("nickname", nickname)} className="text-[11px] font-bold px-3 py-2 rounded-xl bg-[#4A6741] text-white shrink-0 shadow-md">중복확인</button>
          </div>
          {nicknameMsg.text && <p className={`text-[10px] font-bold ${nicknameMsg.color}`}>{nicknameMsg.text}</p>}
        </div>

        <h2 className="font-bold text-zinc-400 mt-10 mb-4 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>선택 입력</h2>
        
        <div className="bg-zinc-50/50 rounded-2xl p-5 border border-zinc-100 space-y-5 shadow-sm">
             <div className="flex items-center justify-between min-h-[24px]">
                <span className="text-xs font-bold text-zinc-400 shrink-0">본명</span>
                <input {...register("fullName")} placeholder="실명 입력" className="bg-transparent text-right outline-none text-zinc-800 font-medium flex-1 ml-4" />
             </div>
             <div className="h-[1px] bg-zinc-200/50 w-full" />
             <div className="flex items-center justify-between min-h-[24px]">
                <span className="text-xs font-bold text-zinc-400 shrink-0">전화번호</span>
                <input {...register("phone")} type="tel" placeholder="010-0000-0000" className="bg-transparent text-right outline-none text-zinc-800 font-medium flex-1 ml-4" 
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
                    setValue("phone", val);
                  }} 
                />
             </div>
             <div className="h-[1px] bg-zinc-200/50 w-full" />
             <div className="flex items-center justify-between min-h-[24px]">
                <span className="text-xs font-bold text-zinc-400 shrink-0">직분</span>
                <div className="flex-1 flex justify-end ml-4">
                  {showCustomRank ? (
                    <input {...register("rank")} autoFocus placeholder="직접 입력" className="bg-transparent text-right outline-none text-[#4A6741] font-bold w-full" />
                  ) : (
                    <select {...register("rank")} onChange={(e) => e.target.value === "직접 입력" && setShowCustomRank(true)} className="bg-transparent outline-none text-right text-zinc-800 font-medium appearance-none w-full">
                      <option value="">선택</option>
                      {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </div>
             </div>
             <div className="h-[1px] bg-zinc-200/50 w-full" />
             <div className="flex items-center justify-between min-h-[24px]">
                <span className="text-xs font-bold text-zinc-400 shrink-0">소속 교회</span>
                <input {...register("church")} placeholder="교회 이름" className="bg-transparent text-right outline-none text-zinc-800 font-medium flex-1 ml-4" />
             </div>
        </div>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          disabled={isSubmitting || !isPasswordMatch}
          type="submit"
          className={`w-full h-16 rounded-[24px] font-black transition-all mt-10 shadow-xl ${isSubmitting || !isPasswordMatch ? 'bg-zinc-200 text-zinc-400' : 'bg-[#4A6741] text-white shadow-green-900/10'}`}
          style={{ fontSize: `${fontSize * 1.1}px` }}
        >
          가입하기
        </motion.button>
      </form>
    </div>
  );
}
