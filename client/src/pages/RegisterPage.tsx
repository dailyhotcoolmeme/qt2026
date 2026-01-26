import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Sparkles, Church, User, Lock, Phone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch } = useForm({ mode: "onChange" });
  
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'success' | 'error'>('none');
  const [nicknameStatus, setNicknameStatus] = useState<'none' | 'success' | 'error'>('none');
  const [usernameMsg, setUsernameMsg] = useState("");
  const [nicknameMsg, setNicknameMsg] = useState("");
  const [errorModal, setErrorModal] = useState<{show: boolean, msg: string}>({ show: false, msg: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showPw, setShowPw] = useState(false);
  
  const username = (watch("username") || "").trim();
  const nickname = watch("nickname") || "";
  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";

  const isPasswordValid = password.length >= 8;
  const isPasswordMatch = isPasswordValid && password === passwordConfirm;
  const showPasswordError = passwordConfirm.length > 0 && password !== passwordConfirm;

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
    setNicknameMsg("멋진 이름이네요! 그대로 사용하셔도 됩니다 ✨");
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  const checkDuplicate = async (field: "username" | "nickname", value: string) => {
    if (!value) return;
    try {
      const { data } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (field === "username") {
        if (data) { setUsernameStatus('error'); setUsernameMsg("이미 사용 중인 정보입니다 😢"); }
        else { setUsernameStatus('success'); setUsernameMsg("사용 가능한 정보입니다!"); }
      } else {
        if (data) { setNicknameStatus('error'); setNicknameMsg("이미 사용 중인 정보입니다 😢"); }
        else { setNicknameStatus('success'); setNicknameMsg("사용 가능한 정보입니다!"); }
      }
    } catch (e) { console.error(e); }
  };

  const onSubmit = async (values: any) => {
    if (usernameStatus !== 'success') return setErrorModal({ show: true, msg: "아이디 중복 확인을 완료해 주세요." });
    if (!isPasswordMatch) return setErrorModal({ show: true, msg: "비밀번호가 일치하지 않거나 너무 짧습니다." });
    if (nicknameStatus !== 'success') return setErrorModal({ show: true, msg: "닉네임 중복 확인을 완료해 주세요." });

    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${values.username}@church.com`,
        password: values.password,
        options: {
          data: { nickname: values.nickname, full_name: values.fullName, phone: values.phone, rank: values.rank, church: values.church }
        }
      });
      if (authError) throw authError;
      window.location.href = "/";
    } catch (error: any) {
      setErrorModal({ show: true, msg: "가입 중 오류가 발생했습니다." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBorderStyle = (status: 'none' | 'success' | 'error') => {
    if (status === 'success') return "border-emerald-500 bg-emerald-50/10";
    if (status === 'error') return "border-red-500 bg-red-50/10";
    return "border-[#4A6741]/10 bg-white";
  };

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 pb-24 overflow-x-hidden">
      <AnimatePresence>
        {errorModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-black text-zinc-900 mb-2" style={{ fontSize: `${fontSize * 1.1}px` }}>확인이 필요해요</h3>
              <p className="text-zinc-500 font-medium mb-6 leading-relaxed" style={{ fontSize: `${fontSize * 0.9}px` }}>{errorModal.msg}</p>
              <button onClick={() => setErrorModal({ show: false, msg: "" })} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold active:scale-95 transition-transform">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 bg-[#FCFDFB]/80 backdrop-blur-md z-20 pt-8 pb-4">
        <Link href="/auth"><a className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-zinc-100 text-zinc-400 mb-4"><ArrowLeft size={20} /></a></Link>
        <h1 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.8}px` }}>회원가입</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <h2 className="font-bold text-zinc-400 mb-4 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>꼭 필요한 정보</h2>

        {/* 아이디 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm mb-4 transition-all duration-300 ${getBorderStyle(usernameStatus)}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1" style={{ fontSize: `${fontSize * 0.75}px` }}><User size={14}/> 아이디</label>
            {usernameMsg && <span className="font-bold" style={{ fontSize: `${fontSize * 0.65}px`, color: usernameStatus === 'success' ? '#10b981' : '#ef4444' }}>{usernameMsg}</span>}
          </div>
          <div className="flex items-center gap-3">
            <input {...register("username", { required: true })} className="bg-transparent outline-none w-full text-zinc-900 font-black" placeholder="영문/숫자 입력" style={{ fontSize: `${fontSize * 1.1}px` }} />
            <button type="button" onClick={() => checkDuplicate("username", username)} className="font-bold px-4 py-2 rounded-xl bg-zinc-900 text-white shrink-0 shadow-sm active:scale-95 transition-transform" style={{ fontSize: `${fontSize * 0.7}px` }}>중복확인</button>
          </div>
        </div>

        {/* 비밀번호 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm mb-4 transition-all duration-300 ${showPasswordError ? 'border-red-500 bg-red-50/10' : isPasswordMatch ? 'border-emerald-500 bg-emerald-50/10' : 'border-[#4A6741]/10'}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1" style={{ fontSize: `${fontSize * 0.75}px` }}><Lock size={14}/> 비밀번호</label>
            {showPasswordError && <span className="font-bold text-red-500 flex items-center gap-1" style={{ fontSize: `${fontSize * 0.65}px` }}><X size={10}/> 비밀번호 일치하지 않음</span>}
            {isPasswordMatch && <span className="font-bold text-emerald-600 flex items-center gap-1" style={{ fontSize: `${fontSize * 0.65}px` }}><Check size={10}/> 비밀번호 일치</span>}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-2">
              <input {...register("password", { required: true })} type={showPw ? "text" : "password"} placeholder="8자 이상" className="bg-transparent outline-none w-full text-zinc-900 font-bold" style={{ fontSize: `${fontSize}px` }} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
            <div className="flex items-center gap-3">
              <input {...register("passwordConfirm", { required: true })} type={showPw ? "text" : "password"} placeholder="비밀번호 재입력" className="bg-transparent outline-none w-full text-zinc-900 font-bold" style={{ fontSize: `${fontSize}px` }} />
            </div>
          </div>
        </div>

        {/* 닉네임 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm mb-4 transition-all duration-300 ${getBorderStyle(nicknameStatus)}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1" style={{ fontSize: `${fontSize * 0.75}px` }}><Sparkles size={14}/> 닉네임</label>
            <button type="button" onClick={generateNickname} className="text-zinc-400 font-bold flex items-center gap-1 hover:text-zinc-600" style={{ fontSize: `${fontSize * 0.65}px` }}><RefreshCw size={10} /> 다른추천</button>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <input {...register("nickname", { required: true })} className="bg-transparent outline-none w-full text-[#4A6741] font-black" style={{ fontSize: `${fontSize * 1.3}px` }} />
            <button type="button" onClick={() => checkDuplicate("nickname", nickname)} className="font-bold px-4 py-2 rounded-xl bg-[#4A6741] text-white shrink-0 active:scale-95 transition-transform" style={{ fontSize: `${fontSize * 0.7}px` }}>중복확인</button>
          </div>
          {nicknameMsg && <p className="font-bold mt-1" style={{ fontSize: `${fontSize * 0.65}px`, color: nicknameStatus === 'success' ? '#10b981' : '#ef4444' }}>{nicknameMsg}</p>}
        </div>

        <h2 className="font-bold text-zinc-400 mt-10 mb-4 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>선택 입력</h2>
        
        {/* 선택 입력 섹션 (너비 수정) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-[#4A6741]/5 space-y-6 shadow-sm overflow-hidden">
             <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-400 shrink-0" style={{ fontSize: `${fontSize * 0.75}px` }}>본명</span>
                <input {...register("fullName")} placeholder="실명을 입력해 주세요" className="bg-transparent text-right outline-none text-zinc-800 font-medium min-w-0 flex-1" style={{ fontSize: `${fontSize}px` }} />
             </div>
             <div className="h-[1px] bg-zinc-50 w-full" />
             <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-400 shrink-0" style={{ fontSize: `${fontSize * 0.75}px` }}>전화번호</span>
                <input {...register("phone")} placeholder="010-0000-0000" className="bg-transparent text-right outline-none text-zinc-800 font-medium min-w-0 flex-1" style={{ fontSize: `${fontSize}px` }} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
                    setValue("phone", val);
                  }} />
             </div>
             <div className="h-[1px] bg-zinc-50 w-full" />
             <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-400 shrink-0" style={{ fontSize: `${fontSize * 0.75}px` }}>직분</span>
                <div className="flex-1 flex justify-end overflow-hidden">
                  {showCustomRank ? (
                    <input {...register("rank")} autoFocus placeholder="직접 입력" className="bg-transparent text-right outline-none text-[#4A6741] font-bold w-full" style={{ fontSize: `${fontSize}px` }} />
                  ) : (
                    <select {...register("rank")} onChange={(e) => e.target.value === "직접 입력" && setShowCustomRank(true)} className="bg-transparent outline-none text-right text-zinc-800 font-medium appearance-none w-full max-w-[150px]" style={{ fontSize: `${fontSize}px` }}>
                      <option value="">선택</option>
                      {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </div>
             </div>
             <div className="h-[1px] bg-zinc-50 w-full" />
             <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-400 shrink-0" style={{ fontSize: `${fontSize * 0.75}px` }}>소속 교회</span>
                <input {...register("church")} placeholder="교회 이름을 입력해 주세요" className="bg-transparent text-right outline-none text-zinc-800 font-medium min-w-0 flex-1" style={{ fontSize: `${fontSize}px` }} />
             </div>
        </div>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          disabled={isSubmitting}
          type="submit"
          className={`w-full h-16 rounded-[24px] font-black transition-all mt-10 shadow-xl ${isSubmitting ? 'bg-zinc-200 text-zinc-400' : 'bg-[#4A6741] text-white shadow-green-900/10'}`}
          style={{ fontSize: `${fontSize * 1.1}px` }}
        >
          {isSubmitting ? "처리 중..." : "가입하기"}
        </motion.button>
      </form>
    </div>
  );
}
