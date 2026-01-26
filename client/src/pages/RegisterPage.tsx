import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Sparkles, Mail, User, Lock, ChevronDown, X } from "lucide-center";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "직접 입력"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch } = useForm({ mode: "onChange" });
  
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'success' | 'error'>('none');
  const [emailStatus, setEmailStatus] = useState<'none' | 'success' | 'error'>('none');
  const [nicknameStatus, setNicknameStatus] = useState<'none' | 'success' | 'error'>('none');
  
  const [usernameMsg, setUsernameMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [nicknameMsg, setNicknameMsg] = useState("");
  
  const [errorModal, setErrorModal] = useState({ show: false, msg: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // 실시간 값 감시 (중복 확인 버튼 활성화 및 비밀번호 체크용)
  const watchAll = watch();
  const isPasswordMatch = watchAll.password && watchAll.password.length >= 8 && watchAll.password === watchAll.passwordConfirm;

  // 닉네임 자동 생성
  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
    setNicknameMsg("멋진 이름이네요! 그대로 사용하셔도 됩니다 ✨");
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  // 중복 확인 함수 (아이디, 닉네임, 이메일)
  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    let value = "";
    if (field === "username") value = watchAll.username?.trim();
    if (field === "nickname") value = watchAll.nickname?.trim();
    if (field === "email") {
      const domain = showCustomDomain ? watchAll.customDomain : watchAll.emailDomain;
      if (!watchAll.emailId || !domain) return setErrorModal({ show: true, msg: "이메일 주소를 완성해 주세요." });
      value = `${watchAll.emailId}@${domain}`;
    }

    if (!value) return;

    try {
      const { data, error } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (error) throw error;
      
      const isAvailable = !data;
      const successColor = "#4A6741";

      if (field === "username") {
        setUsernameStatus(isAvailable ? 'success' : 'error');
        setUsernameMsg(isAvailable ? "사용 가능한 아이디입니다!" : "이미 사용 중인 아이디입니다 😢");
      } else if (field === "nickname") {
        setNicknameStatus(isAvailable ? 'success' : 'error');
        setNicknameMsg(isAvailable ? "사용 가능한 닉네임입니다!" : "이미 사용 중인 닉네임입니다 😢");
      } else if (field === "email") {
        setEmailStatus(isAvailable ? 'success' : 'error');
        setEmailMsg(isAvailable ? "사용 가능한 이메일입니다!" : "이미 가입된 이메일입니다 😢");
      }
    } catch (e) { 
      setErrorModal({ show: true, msg: "서버 연결 확인이 필요합니다." }); 
    }
  };

  const onSubmit = async (values: any) => {
    if (usernameStatus !== 'success') return setErrorModal({ show: true, msg: "아이디 중복 확인을 해주세요." });
    if (emailStatus !== 'success') return setErrorModal({ show: true, msg: "이메일 중복 확인을 해주세요." });
    if (nicknameStatus !== 'success') return setErrorModal({ show: true, msg: "닉네임 중복 확인을 해주세요." });
    if (!isPasswordMatch) return setErrorModal({ show: true, msg: "비밀번호를 다시 확인해 주세요." });

    setIsSubmitting(true);
    try {
      const finalEmail = `${values.emailId}@${showCustomDomain ? values.customDomain : values.emailDomain}`;
      
      // Auth 가입 시 Metadata에 모든 정보 전달 (트리거가 profiles에 저장함)
      const { data, error } = await supabase.auth.signUp({
        email: finalEmail,
        password: values.password,
        options: {
          data: {
            username: values.username,
            nickname: values.nickname,
            full_name: values.fullName || "",
            phone: values.phone || "",
            rank: values.rank || "",
            church: values.church || ""
          }
        }
      });

      if (error) throw error;
      alert("🎉 회원가입이 완료되었습니다!");
      setLocation("/");
    } catch (error: any) {
      setErrorModal({ show: true, msg: error.message || "가입 중 알 수 없는 오류가 발생했습니다." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 pb-24">
      {/* 알림 모달 */}
      <AnimatePresence>
        {errorModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={24} /></div>
              <h3 className="font-black text-zinc-900 mb-2">알림</h3>
              <p className="text-zinc-500 font-medium mb-6 leading-relaxed whitespace-pre-wrap">{errorModal.msg}</p>
              <button onClick={() => setErrorModal({ show: false, msg: "" })} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="pt-8 pb-4">
        <Link href="/auth"><a className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-zinc-100 mb-4"><ArrowLeft size={20} /></a></Link>
        <h1 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.8}px` }}>회원가입</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <h2 className="font-bold text-zinc-400 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>꼭 필요한 정보</h2>

        {/* 아이디 입력 섹션 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${usernameStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : 'border-zinc-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px]"><User size={14}/> 아이디</label>
            {usernameMsg && <span className="font-bold text-[10px]" style={{ color: usernameStatus === 'success' ? '#4A6741' : '#ef4444' }}>{usernameMsg}</span>}
          </div>
          <div className="flex items-center gap-2">
            <input {...register("username", { required: true })} className="flex-1 bg-transparent outline-none font-black text-zinc-900" placeholder="영문/숫자 입력" style={{ fontSize: `${fontSize * 1.1}px` }} />
            <button type="button" onClick={() => checkDuplicate("username")} className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold text-[11px] active:scale-95 transition-transform">중복확인</button>
          </div>
        </div>

        {/* 이메일 입력 섹션 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${emailStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : 'border-zinc-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px]"><Mail size={14}/> 이메일 (비밀번호 찾기용)</label>
            {emailMsg && <span className="font-bold text-[10px]" style={{ color: emailStatus === 'success' ? '#4A6741' : '#ef4444' }}>{emailMsg}</span>}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input {...register("emailId", { required: true })} className="w-[45%] bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" placeholder="아이디" />
            <span className="text-zinc-400 font-bold">@</span>
            <div className="flex-1 relative">
              {showCustomDomain ? (
                <div className="relative">
                  <input {...register("customDomain")} autoFocus className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none border border-[#4A6741]/20" placeholder="직접 입력" />
                  <button type="button" onClick={() => {setShowCustomDomain(false); setValue("customDomain", "");}} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300"><X size={14}/></button>
                </div>
              ) : (
                <div className="relative">
                  <select {...register("emailDomain", { required: true })} onChange={(e) => e.target.value === "직접 입력" && setShowCustomDomain(true)} className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none appearance-none pr-8">
                    <option value="">선택</option>
                    {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={() => checkDuplicate("email")} className="w-full py-3 rounded-xl bg-zinc-900 text-white font-bold text-[12px] shadow-md active:scale-[0.98] transition-all">이메일 중복확인</button>
        </div>

        {/* 비밀번호 섹션 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${isPasswordMatch ? 'border-[#4A6741] bg-[#4A6741]/5' : 'border-zinc-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px]"><Lock size={14}/> 비밀번호</label>
            {isPasswordMatch && <span className="font-bold text-[#4A6741] text-[10px]">✓ 비밀번호가 일치합니다</span>}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-50 pb-2">
              <input {...register("password", { required: true })} type={showPw ? "text" : "password"} placeholder="8자 이상 입력" className="flex-1 bg-transparent outline-none font-bold text-zinc-900" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
            <input {...register("passwordConfirm", { required: true })} type={showPw ? "text" : "password"} placeholder="비밀번호를 한 번 더 입력해 주세요" className="w-full bg-transparent outline-none font-bold text-zinc-900" />
          </div>
        </div>

        {/* 닉네임 섹션 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${nicknameStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : 'border-zinc-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px]"><Sparkles size={14}/> 닉네임</label>
            <button type="button" onClick={generateNickname} className="text-zinc-400 text-[10px] font-bold flex items-center gap-1"><RefreshCw size={10}/> 다른추천</button>
          </div>
          <div className="flex items-center gap-2">
            <input {...register("nickname", { required: true })} className="flex-1 bg-transparent outline-none font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 1.3}px` }} />
            <button type="button" onClick={() => checkDuplicate("nickname")} className="px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-[11px] active:scale-95 transition-transform">중복확인</button>
          </div>
          {nicknameMsg && <p className="text-[10px] font-bold mt-2" style={{ color: nicknameStatus === 'success' ? '#4A6741' : '#ef4444' }}>{nicknameMsg}</p>}
        </div>

        <h2 className="font-bold text-zinc-400 mt-10 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>선택 입력</h2>
        
        {/* 선택 입력 섹션 (이미지 레이아웃 정렬 완벽 재현) */}
        <div className="bg-white rounded-3xl border-2 border-zinc-50 shadow-sm overflow-hidden divide-y divide-zinc-50">
          <div className="grid grid-cols-[100px_1fr] items-center px-6 py-5">
            <span className="font-bold text-zinc-400 text-[12px]">본명</span>
            <input {...register("fullName")} placeholder="실명 입력" className="text-right outline-none font-bold text-zinc-800 bg-transparent" />
          </div>
          <div className="grid grid-cols-[100px_1fr] items-center px-6 py-5">
            <span className="font-bold text-zinc-400 text-[12px]">전화번호</span>
            <input {...register("phone")} placeholder="010-0000-0000" className="text-right outline-none font-bold text-zinc-800 bg-transparent" 
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "").replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
                setValue("phone", val);
              }} />
          </div>
          <div className="grid grid-cols-[100px_1fr] items-center px-6 py-5">
            <span className="font-bold text-zinc-400 text-[12px]">직분</span>
            <div className="text-right relative">
              {showCustomRank ? (
                <div className="flex items-center justify-end gap-2">
                  <input {...register("rank")} autoFocus placeholder="직접 입력" className="text-right outline-none font-bold text-[#4A6741] bg-transparent w-full" />
                  <button type="button" onClick={() => {setShowCustomRank(false); setValue("rank", "");}} className="text-zinc-300"><X size={14}/></button>
                </div>
              ) : (
                <select {...register("rank")} onChange={(e) => e.target.value === "직접 입력" && setShowCustomRank(true)} className="outline-none font-bold text-zinc-800 bg-transparent text-right appearance-none pr-4 w-full">
                  <option value="">선택</option>
                  {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-center px-6 py-5">
            <span className="font-bold text-zinc-400 text-[12px]">소속 교회</span>
            <input {...register("church")} placeholder="교회 이름 입력" className="text-right outline-none font-bold text-zinc-800 bg-transparent" />
          </div>
        </div>

        <button disabled={isSubmitting} type="submit" className={`w-full h-16 rounded-[24px] font-black text-white mt-10 shadow-xl transition-all ${isSubmitting ? 'bg-zinc-200 text-zinc-400' : 'bg-[#4A6741] active:scale-[0.98]'}`} style={{ fontSize: `${fontSize * 1.1}px` }}>
          {isSubmitting ? "가입을 처리하고 있습니다..." : "가입하기"}
        </button>
      </form>
    </div>
  );
}
