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
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({ mode: "onChange" });
  
  const [usernameMsg, setUsernameMsg] = useState({ text: "", color: "" });
  const [nicknameMsg, setNicknameMsg] = useState({ text: "", color: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showPw, setShowPw] = useState(false);
  
  const username = (watch("username") || "").trim();
  const nickname = watch("nickname") || "";
  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";
  const selectedRank = watch("rank");

  const isPasswordMatch = password.length >= 8 && password === passwordConfirm;
  const showPasswordError = passwordConfirm.length > 0 && password !== passwordConfirm;

  // 닉네임 자동 생성
  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameMsg({ text: "특별한 닉네임이 생성되었어요 ✨", color: "text-[#4A6741]" });
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  // 중복 확인
  const checkDuplicate = async (field: "username" | "nickname", value: string) => {
    if (!value) return;
    const { data } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
    const setMsg = field === "username" ? setUsernameMsg : setNicknameMsg;
    
    if (data) setMsg({ text: "이미 사용 중이에요 😢", color: "text-orange-500" });
    else setMsg({ text: "사용 가능한 멋진 이름이에요!", color: "text-[#4A6741]" });
  };

  const onSubmit = async (values: any) => {
    if (!isPasswordMatch) return;
    setIsSubmitting(true);
    try {
      // 1. Auth 가입 (메타데이터에 전화번호, 직분, 본명 모두 포함)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${values.username}@church.com`,
        password: values.password,
        options: {
          data: {
            nickname: values.nickname,
            full_name: values.fullName,
            phone: values.phone,    // 📱 전화번호 추가
            rank: values.rank,
            church: values.church,
            auth_provider: 'email'
          }
        }
      });

      if (authError) throw authError;

      alert("🎉 반가워요! 회원가입이 완료되었습니다.");
      window.location.href = "/";
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputGroupStyle = "bg-zinc-50/50 rounded-2xl p-4 border border-zinc-100 focus-within:border-[#4A6741] focus-within:bg-white transition-all mb-4 shadow-sm";

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 pb-20 overflow-x-hidden">
      <header className="sticky top-0 bg-[#FCFDFB]/80 backdrop-blur-md z-20 pt-8 pb-4">
        <Link href="/auth">
          <a className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-zinc-100 text-zinc-400 mb-4">
            <ArrowLeft size={20} />
          </a>
        </Link>
        <h1 className="font-black text-zinc-900 tracking-tighter leading-tight" style={{ fontSize: `${fontSize * 1.8}px` }}>
          새로운 시작, <br/><span className="text-[#4A6741]">함께해요!</span>
        </h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col">
        {/* 필수 정보 섹션 */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Sparkles size={16} className="text-[#4A6741]" />
            <h2 className="font-bold text-zinc-800" style={{ fontSize: `${fontSize * 0.9}px` }}>꼭 필요한 정보</h2>
          </div>

          <div className={inputGroupStyle}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[12px] font-bold text-zinc-400">아이디</span>
              {usernameMsg.text && <span className={`text-[10px] font-bold ${usernameMsg.color}`}>{usernameMsg.text}</span>}
            </div>
            <div className="flex items-center gap-3">
              <User size={18} className="text-zinc-300" />
              <input {...register("username", { required: true })} className="bg-transparent outline-none w-full text-zinc-900 font-medium" placeholder="영문/숫자 조합" style={{ fontSize: `${fontSize}px` }} />
              <button type="button" onClick={() => checkDuplicate("username", username)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 shrink-0 shadow-sm active:scale-95 transition-transform">중복확인</button>
            </div>
          </div>

          <div className={inputGroupStyle}>
            <span className="text-[12px] font-bold text-zinc-400 block mb-1">비밀번호</span>
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-zinc-300" />
              <input {...register("password", { required: true, minLength: 8 })} type={showPw ? "text" : "password"} placeholder="8자 이상" className="bg-transparent outline-none w-full text-zinc-900 font-medium" style={{ fontSize: `${fontSize}px` }} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 transition-colors hover:text-[#4A6741]">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
          </div>

          <div className={`${inputGroupStyle} ${showPasswordError ? 'border-orange-200 bg-orange-50/30' : ''}`}>
            <span className="text-[12px] font-bold text-zinc-400 block mb-1">비밀번호 확인</span>
            <div className="flex items-center gap-3">
              <Check size={18} className={isPasswordMatch ? "text-emerald-500" : "text-zinc-300"} />
              <input {...register("passwordConfirm", { required: true })} type={showPw ? "text" : "password"} placeholder="한번 더 입력" className="bg-transparent outline-none w-full text-zinc-900 font-medium" style={{ fontSize: `${fontSize}px` }} />
            </div>
          </div>
        </section>

        {/* 부가 정보 섹션 */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Church size={16} className="text-[#4A6741]" />
            <h2 className="font-bold text-zinc-800" style={{ fontSize: `${fontSize * 0.9}px` }}>조금 더 알고 싶어요</h2>
          </div>

          {/* 닉네임 카드 */}
          <div className="bg-white rounded-3xl p-5 border-2 border-[#4A6741]/10 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-[#4A6741] flex items-center gap-1"><Sparkles size={12}/> 추천 닉네임</span>
              <button type="button" onClick={generateNickname} className="flex items-center gap-1 text-[11px] text-zinc-400 font-bold hover:text-zinc-600 transition-colors"><RefreshCw size={10} /> 다른거</button>
            </div>
            <div className="flex items-center gap-4">
              <input {...register("nickname", { required: true })} className="bg-transparent outline-none w-full text-[#4A6741] font-black" style={{ fontSize: `${fontSize * 1.3}px` }} />
              <button type="button" onClick={() => checkDuplicate("nickname", nickname)} className="text-[11px] font-bold px-4 py-2 rounded-xl bg-[#4A6741] text-white shrink-0 shadow-md shadow-green-900/20 active:scale-95 transition-all">중복확인</button>
            </div>
          </div>

          {/* 정보 입력 리스트 */}
          <div className="bg-zinc-50/50 rounded-2xl p-4 border border-zinc-100 space-y-4 shadow-sm">
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-2"><User size={14}/> 본명</span>
                <input {...register("fullName")} placeholder="실명 입력" className="bg-transparent text-right outline-none text-zinc-800 font-medium" />
             </div>
             <div className="h-[1px] bg-zinc-200/50 w-full" />
             
             {/* 📱 전화번호 필드 */}
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-2"><Phone size={14}/> 전화번호</span>
                <input 
                  {...register("phone")} 
                  type="tel"
                  placeholder="010-0000-0000" 
                  className="bg-transparent text-right outline-none text-zinc-800 font-medium"
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "")
                                   .replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
                    setValue("phone", value);
                  }}
                />
             </div>
             <div className="h-[1px] bg-zinc-200/50 w-full" />

             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-2"><Sparkles size={14}/> 직분</span>
                {showCustomRank ? (
                  <div className="flex items-center gap-2">
                    <input {...register("rank")} autoFocus placeholder="직접 입력" className="bg-transparent text-right outline-none text-[#4A6741] font-bold" />
                    <button type="button" onClick={() => setShowCustomRank(false)} className="text-[10px] text-zinc-400">취소</button>
                  </div>
                ) : (
                  <select {...register("rank")} onChange={(e) => e.target.value === "직접 입력" && setShowCustomRank(true)} className="bg-transparent outline-none text-right text-zinc-800 appearance-none cursor-pointer font-medium">
                    <option value="">선택</option>
                    {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
             </div>
             <div className="h-[1px] bg-zinc-200/50 w-full" />

             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-2"><Church size={14}/> 교회</span>
                <input {...register("church")} placeholder="소속 교회" className="bg-transparent text-right outline-none text-zinc-800 font-medium" />
             </div>
          </div>
        </section>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          disabled={isSubmitting || !isPasswordMatch}
          type="submit"
          className={`w-full h-16 rounded-[24px] font-black transition-all mt-6 shadow-xl ${isSubmitting || !isPasswordMatch ? 'bg-zinc-200 text-zinc-400 shadow-none' : 'bg-[#4A6741] text-white shadow-green-900/10 hover:bg-[#3d5435]'}`}
          style={{ fontSize: `${fontSize * 1.1}px` }}
        >
          {isSubmitting ? "가족이 되는 중..." : "기쁘게 시작하기"}
        </motion.button>
      </form>
    </div>
  );
}
