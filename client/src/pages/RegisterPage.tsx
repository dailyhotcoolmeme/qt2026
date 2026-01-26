import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Sparkles, Mail, User, Lock, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "직접 입력"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch, trigger } = useForm({ mode: "onChange" });
  
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'success' | 'error'>('none');
  const [emailStatus, setEmailStatus] = useState<'none' | 'success' | 'error'>('none');
  const [nicknameStatus, setNicknameStatus] = useState<'none' | 'success' | 'error'>('none');
  
  const [usernameMsg, setUsernameMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [nicknameMsg, setNicknameMsg] = useState("");
  
  const [errorModal, setErrorModal] = useState<{show: boolean, msg: string}>({ show: false, msg: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // 실시간 값 감시
  const username = watch("username")?.trim();
  const emailId = watch("emailId")?.trim();
  const emailDomain = watch("emailDomain");
  const customDomain = watch("customDomain")?.trim();
  const nickname = watch("nickname");
  const password = watch("password");
  const passwordConfirm = watch("passwordConfirm");

  const isPasswordMatch = password && password.length >= 8 && password === passwordConfirm;

  // 닉네임 자동 생성
  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
    setNicknameMsg("사용 가능한 멋진 이름입니다! ✨");
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  // 중복 확인 (이메일 포함)
  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    let value = "";
    if (field === "username") value = username;
    if (field === "nickname") value = nickname;
    if (field === "email") {
      const domain = showCustomDomain ? customDomain : emailDomain;
      if (!emailId || !domain) return setErrorModal({ show: true, msg: "이메일 주소를 먼저 완성해 주세요." });
      value = `${emailId}@${domain}`;
    }

    if (!value) return;

    try {
      const { data, error } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (error) throw error;
      
      if (field === "username") {
        if (data) { setUsernameStatus('error'); setUsernameMsg("이미 사용 중인 아이디입니다."); }
        else { setUsernameStatus('success'); setUsernameMsg("사용 가능한 아이디입니다!"); }
      } else if (field === "nickname") {
        if (data) { setNicknameStatus('error'); setNicknameMsg("이미 사용 중인 닉네임입니다."); }
        else { setNicknameStatus('success'); setNicknameMsg("사용 가능한 닉네임입니다!"); }
      } else if (field === "email") {
        if (data) { setEmailStatus('error'); setEmailMsg("이미 가입된 이메일입니다."); }
        else { setEmailStatus('success'); setEmailMsg("사용 가능한 이메일입니다!"); }
      }
    } catch (e: any) {
      console.error(e);
      setErrorModal({ show: true, msg: "중복 확인 중 오류가 발생했습니다." });
    }
  };

  const onSubmit = async (values: any) => {
    if (usernameStatus !== 'success') return setErrorModal({ show: true, msg: "아이디 중복 확인을 해주세요." });
    if (emailStatus !== 'success') return setErrorModal({ show: true, msg: "이메일 중복 확인을 해주세요." });
    if (!isPasswordMatch) return setErrorModal({ show: true, msg: "비밀번호를 확인해 주세요." });
    if (nicknameStatus !== 'success') return setErrorModal({ show: true, msg: "닉네임 중복 확인을 해주세요." });

    setIsSubmitting(true);
    try {
      const finalEmail = `${values.emailId}@${showCustomDomain ? values.customDomain : values.emailDomain}`;

      // 1. Auth 가입 (최소 정보만 전달하여 DB 트리거 충돌 방지)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: finalEmail,
        password: values.password
      });

      if (authError) throw authError;

      // 2. Profiles 테이블 업데이트 (가입 성공 후 명시적으로 데이터 입력)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            username: values.username,
            nickname: values.nickname,
            full_name: values.fullName,
            phone: values.phone,
            rank: values.rank || null,
            church: values.church || null
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error("Profile update error:", profileError);
          // 프로필 업데이트 실패 시 경고는 주되 가입은 완료된 상태임
        }
      }

      alert("🎉 가입이 성공적으로 완료되었습니다!");
      setLocation("/");
    } catch (error: any) {
      setErrorModal({ show: true, msg: error.message || "가입 중 서버 오류가 발생했습니다." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBorderStyle = (status: 'none' | 'success' | 'error') => {
    if (status === 'success') return "border-[#4A6741] bg-[#4A6741]/5";
    if (status === 'error') return "border-red-500 bg-red-50/10";
    return "border-zinc-100 bg-white";
  };

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 pb-24">
      <AnimatePresence>
        {errorModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={24} /></div>
              <h3 className="font-black text-zinc-900 mb-2">알림</h3>
              <p className="text-zinc-500 font-medium mb-6 leading-relaxed px-2">{errorModal.msg}</p>
              <button onClick={() => setErrorModal({ show: false, msg: "" })} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 bg-[#FCFDFB]/80 backdrop-blur-md z-20 pt-8 pb-4 flex items-center gap-4">
        <Link href="/auth"><a className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-zinc-100 text-zinc-400"><ArrowLeft size={20} /></a></Link>
        <h1 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.5}px` }}>회원가입</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <h2 className="font-bold text-zinc-400 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>꼭 필요한 정보</h2>

        {/* 아이디 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${getBorderStyle(usernameStatus)}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1" style={{ fontSize: `${fontSize * 0.75}px` }}><User size={14}/> 아이디</label>
            {usernameMsg && <span className="font-bold" style={{ fontSize: `${fontSize * 0.65}px`, color: usernameStatus === 'success' ? '#4A6741' : '#ef4444' }}>{usernameMsg}</span>}
          </div>
          <div className="flex items-center gap-3">
            <input {...register("username", { required: true })} className="bg-transparent outline-none w-full text-zinc-900 font-black" placeholder="영문/숫자 입력" style={{ fontSize: `${fontSize * 1.1}px` }} />
            <button type="button" onClick={() => checkDuplicate("username")} className="font-bold px-4 py-2 rounded-xl bg-zinc-900 text-white shrink-0 active:scale-95 transition-transform" style={{ fontSize: `${fontSize * 0.7}px` }}>중복확인</button>
          </div>
        </div>

        {/* 이메일 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${getBorderStyle(emailStatus)}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1" style={{ fontSize: `${fontSize * 0.75}px` }}><Mail size={14}/> 이메일 (비번 찾기용)</label>
            {emailMsg && <span className="font-bold" style={{ fontSize: `${fontSize * 0.65}px`, color: emailStatus === 'success' ? '#4A6741' : '#ef4444' }}>{emailMsg}</span>}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input {...register("emailId", { required: true })} className="bg-zinc-50 rounded-xl px-4 py-3 w-full text-zinc-900 font-bold outline-none" placeholder="아이디" style={{ fontSize: `${fontSize}px` }} />
              <span className="text-zinc-400 font-bold">@</span>
              <div className="relative w-full">
                {showCustomDomain ? (
                  <div className="relative flex items-center">
                    <input {...register("customDomain", { required: true })} className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 w-full text-zinc-900 font-bold outline-none" placeholder="직접입력" style={{ fontSize: `${fontSize}px` }} />
                    <button type="button" onClick={() => { setShowCustomDomain(false); setValue("customDomain", ""); }} className="absolute right-3 text-zinc-300"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="relative">
                    <select {...register("emailDomain", { required: true })} 
                      onChange={(e) => e.target.value === "직접 입력" && setShowCustomDomain(true)}
                      className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 w-full text-zinc-900 font-bold outline-none appearance-none pr-10" style={{ fontSize: `${fontSize}px` }}>
                      <option value="">도메인 선택</option>
                      {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
            <button type="button" onClick={() => checkDuplicate("email")} className="w-full font-bold py-3 rounded-xl bg-zinc-900 text-white active:scale-95 transition-transform" style={{ fontSize: `${fontSize * 0.8}px` }}>이메일 중복확인</button>
          </div>
        </div>

        {/* 비밀번호 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${isPasswordMatch ? 'border-[#4A6741] bg-[#4A6741]/5' : 'border-zinc-100'}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1" style={{ fontSize: `${fontSize * 0.75}px` }}><Lock size={14}/> 비밀번호</label>
            {isPasswordMatch && <span className="font-bold text-[#4A6741] flex items-center gap-1" style={{ fontSize: `${fontSize * 0.65}px` }}><Check size={10}/> 비밀번호 일치</span>}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-50 pb-2">
              <input {...register("password", { required: true })} type={showPw ? "text" : "password"} placeholder="8자 이상" className="bg-transparent outline-none w-full text-zinc-900 font-bold" style={{ fontSize: `${fontSize}px` }} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
            <input {...register("passwordConfirm", { required: true })} type={showPw ? "text" : "password"} placeholder="비밀번호 재입력" className="bg-transparent outline-none w-full text-zinc-900 font-bold" style={{ fontSize: `${fontSize}px` }} />
          </div>
        </div>

        {/* 닉네임 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${getBorderStyle(nicknameStatus)}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1" style={{ fontSize: `${fontSize * 0.75}px` }}><Sparkles size={14}/> 닉네임</label>
            <button type="button" onClick={generateNickname} className="text-zinc-400 font-bold flex items-center gap-1" style={{ fontSize: `${fontSize * 0.65}px` }}><RefreshCw size={10} /> 추천받기</button>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <input {...register("nickname", { required: true })} className="bg-transparent outline-none w-full text-[#4A6741] font-black" style={{ fontSize: `${fontSize * 1.2}px` }} />
            <button type="button" onClick={() => checkDuplicate("nickname")} className="font-bold px-4 py-2 rounded-xl bg-[#4A6741] text-white shrink-0 active:scale-95 transition-transform shadow-sm" style={{ fontSize: `${fontSize * 0.7}px` }}>중복확인</button>
          </div>
          {nicknameMsg && <p className="font-bold mt-1" style={{ fontSize: `${fontSize * 0.65}px`, color: nicknameStatus === 'success' ? '#4A6741' : '#ef4444' }}>{nicknameMsg}</p>}
        </div>

        <h2 className="font-bold text-zinc-400 mt-6 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>선택 입력</h2>
        
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 space-y-5 shadow-sm">
             <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                <span className="font-bold text-zinc-400" style={{ fontSize: `${fontSize * 0.75}px` }}>본명</span>
                <input {...register("fullName")} placeholder="실명 입력" className="text-right outline-none text-zinc-800 font-medium bg-transparent" style={{ fontSize: `${fontSize}px` }} />
             </div>
             <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                <span className="font-bold text-zinc-400" style={{ fontSize: `${fontSize * 0.75}px` }}>전화번호</span>
                <input {...register("phone")} placeholder="010-0000-0000" className="text-right outline-none text-zinc-800 font-medium bg-transparent" style={{ fontSize: `${fontSize}px` }} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
                    setValue("phone", val);
                  }} />
             </div>
             <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                <span className="font-bold text-zinc-400" style={{ fontSize: `${fontSize * 0.75}px` }}>직분</span>
                <div className="flex justify-end flex-1">
                  {showCustomRank ? (
                    <input {...register("rank")} autoFocus placeholder="직접입력" className="text-right outline-none text-[#4A6741] font-bold bg-transparent" style={{ fontSize: `${fontSize}px` }} />
                  ) : (
                    <select {...register("rank")} onChange={(e) => e.target.value === "직접 입력" && setShowCustomRank(true)} className="text-right outline-none text-zinc-800 font-medium bg-transparent appearance-none">
                      <option value="">선택</option>
                      {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </div>
             </div>
             <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-400" style={{ fontSize: `${fontSize * 0.75}px` }}>소속 교회</span>
                <input {...register("church")} placeholder="교회 이름" className="text-right outline-none text-zinc-800 font-medium bg-transparent" style={{ fontSize: `${fontSize}px` }} />
             </div>
        </div>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          disabled={isSubmitting}
          type="submit"
          className={`w-full h-16 rounded-[24px] font-black transition-all mt-6 shadow-xl ${isSubmitting ? 'bg-zinc-200 text-zinc-400' : 'bg-[#4A6741] text-white shadow-green-900/10'}`}
          style={{ fontSize: `${fontSize * 1.1}px` }}
        >
          {isSubmitting ? "가입 처리 중..." : "가입하기"}
        </motion.button>
      </form>
    </div>
  );
}
