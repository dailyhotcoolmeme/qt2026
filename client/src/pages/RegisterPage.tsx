import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Sparkles, Mail, User, Lock, ChevronDown, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "직접 입력"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch, getValues } = useForm({ mode: "onChange" });
  
  const [usernameStatus, setUsernameStatus] = useState('none');
  const [emailStatus, setEmailStatus] = useState('none');
  const [nicknameStatus, setNicknameStatus] = useState('none');
  const [msgs, setMsgs] = useState({ username: '', email: '', nickname: '' });
  
  const [modal, setModal] = useState({ show: false, title: "", msg: "", type: "error" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // 약관 동의 상태
  const [agreed, setAgreed] = useState({ service: false, privacy: false });

  const watchAll = watch();
  const isPasswordMatch = watchAll.password && watchAll.password.length >= 8 && watchAll.password === watchAll.passwordConfirm;

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
    setMsgs(prev => ({ ...prev, nickname: "멋진 이름이네요! ✨" }));
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    const values = getValues();
    let value = "";
    if (field === "username") value = values.username?.trim();
    if (field === "nickname") value = values.nickname?.trim();
    if (field === "email") {
      const domain = showCustomDomain ? values.customDomain : values.emailDomain;
      if (!values.emailId || !domain) return setModal({ show: true, title: "알림", msg: "이메일을 완성해주세요.", type: "error" });
      value = `${values.emailId}@${domain}`;
    }
    if (!value) return;
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (error) throw error;
      const isAvailable = !data;
      if (field === "username") setUsernameStatus(isAvailable ? 'success' : 'error');
      if (field === "nickname") setNicknameStatus(isAvailable ? 'success' : 'error');
      if (field === "email") setEmailStatus(isAvailable ? 'success' : 'error');
      setMsgs(prev => ({ ...prev, [field]: isAvailable ? "사용 가능합니다!" : "중복된 정보입니다." }));
    } catch (e) { setModal({ show: true, title: "오류", msg: "통신 실패", type: "error" }); }
  };

  const handleKakaoSignUp = async () => {
    if (!agreed.service || !agreed.privacy) {
      return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 모두 동의하셔야 가입이 가능합니다.", type: "error" });
    }
    await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: window.location.origin } });
  };

  const onSubmit = async (values: any) => {
    if (!agreed.service || !agreed.privacy) {
      return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의해주세요.", type: "error" });
    }
    if (usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success') {
      return setModal({ show: true, title: "확인 필요", msg: "중복 확인을 완료해주세요.", type: "error" });
    }
    if (!isPasswordMatch) return setModal({ show: true, title: "비밀번호", msg: "비밀번호가 일치하지 않습니다.", type: "error" });

    setIsSubmitting(true);
    try {
      const finalEmail = `${values.emailId}@${showCustomDomain ? values.customDomain : values.emailDomain}`;
      const { error } = await supabase.auth.signUp({
        email: finalEmail, password: values.password,
        options: { data: { username: values.username, nickname: values.nickname, full_name: values.fullName || "", phone: values.phone || "", rank: values.rank || "", church: values.church || "", display_name: values.nickname } }
      });
      if (error) throw error;
      setModal({ show: true, title: "가입 완료", msg: "환영합니다! 가입이 완료되었습니다.", type: "success" });
    } catch (error: any) {
      setModal({ show: true, title: "실패", msg: error.message, type: "error" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 pb-24 overflow-x-hidden">
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.type === 'success' ? 'bg-green-50 text-[#4A6741]' : 'bg-red-50 text-red-500'}`}><AlertCircle size={24} /></div>
              <h3 className="font-black mb-2">{modal.title}</h3>
              <p className="text-zinc-500 mb-6 text-sm">{modal.msg}</p>
              <button onClick={() => { setModal({ ...modal, show: false }); if(modal.type === 'success') setLocation("/login"); }} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="pt-8 pb-4">
        <Link href="/login"><a className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-zinc-100 mb-4"><ArrowLeft size={20} /></a></Link>
        <h1 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.8}px` }}>회원가입</h1>
      </header>

      <div className="mt-4 space-y-6">
        <button onClick={handleKakaoSignUp} className="w-full h-14 bg-[#FEE500] rounded-2xl flex items-center justify-center gap-3 font-bold text-zinc-900 shadow-sm active:scale-95 transition-all">
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg" className="w-5" alt="kakao" /> 카카오로 시작하기
        </button>

        <div className="bg-white rounded-3xl p-5 border-2 border-zinc-100 space-y-4">
          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">필수 약관 동의</p>
          <div className="space-y-3">
            {[ { id: 'service', label: '서비스 이용약관 동의' }, { id: 'privacy', label: '개인정보 처리방침 동의' } ].map(item => (
              <label key={item.id} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={(agreed as any)[item.id]} onChange={e => setAgreed({ ...agreed, [item.id]: e.target.checked })} className="w-5 h-5 accent-[#4A6741]" />
                  <span className="text-sm font-bold text-zinc-600">{item.label}</span>
                </div>
                <Link href={`/terms/${item.id}`}><ChevronRight size={18} className="text-zinc-300" /></Link>
              </label>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className={`rounded-3xl p-5 border-2 transition-all ${usernameStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : usernameStatus === 'error' ? 'border-red-500 bg-red-50' : 'border-zinc-100 bg-white'}`}>
            <div className="flex justify-between mb-2"><label className="font-bold text-[#4A6741] text-[11px]">아이디</label><span className="text-[10px] font-bold text-red-500">{usernameStatus === 'error' && msgs.username}</span></div>
            <div className="flex gap-2 overflow-hidden"><input {...register("username")} className="flex-1 min-w-0 bg-transparent outline-none font-black" placeholder="아이디 입력" /><button type="button" onClick={() => checkDuplicate("username")} className="shrink-0 px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold text-[11px]">중복확인</button></div>
          </div>

          <div className={`rounded-3xl p-5 border-2 transition-all ${emailStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : emailStatus === 'error' ? 'border-red-500 bg-red-50' : 'border-zinc-100 bg-white'}`}>
            <div className="flex justify-between mb-2"><label className="font-bold text-[#4A6741] text-[11px]">이메일</label></div>
            <div className="flex items-center gap-2 mb-3">
              <input {...register("emailId")} className="w-[45%] min-w-0 bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" placeholder="아이디" /><span className="text-zinc-400">@</span>
              <div className="flex-1 relative overflow-hidden">
                {showCustomDomain ? <input {...register("customDomain")} autoFocus className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" /> : <select {...register("emailDomain")} onChange={e => e.target.value === "직접 입력" && setShowCustomDomain(true)} className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold appearance-none outline-none"><option value="">선택</option>{emailDomains.map(d => <option key={d} value={d}>{d}</option>)}</select>}
              </div>
            </div>
            <button type="button" onClick={() => checkDuplicate("email")} className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-500 font-bold text-[12px]">이메일 중복확인</button>
          </div>

          <div className={`rounded-3xl p-5 border-2 transition-all ${isPasswordMatch ? 'border-[#4A6741] bg-[#4A6741]/5' : (watchAll.passwordConfirm && !isPasswordMatch) ? 'border-red-500 bg-red-50' : 'border-zinc-100 bg-white'}`}>
            <label className="font-bold text-[#4A6741] text-[11px] mb-2 block">비밀번호</label>
            <div className="space-y-4">
              <div className="flex border-b pb-2"><input {...register("password")} type={showPw ? "text" : "password"} className="flex-1 min-w-0 bg-transparent outline-none font-bold" placeholder="8자 이상" /><button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
              <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} className="w-full min-w-0 bg-transparent outline-none font-bold" placeholder="재입력" />
            </div>
          </div>

          <div className={`rounded-3xl p-5 border-2 transition-all ${nicknameStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : 'border-zinc-100 bg-white'}`}>
            <div className="flex justify-between mb-2"><label className="font-bold text-[#4A6741] text-[11px]">닉네임</label><button type="button" onClick={generateNickname} className="text-zinc-400 text-[10px] font-bold"><RefreshCw size={10}/></button></div>
            <div className="flex gap-2 overflow-hidden"><input {...register("nickname")} className="flex-1 min-w-0 bg-transparent outline-none font-black text-[#4A6741]" /><button type="button" onClick={() => checkDuplicate("nickname")} className="shrink-0 px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-[11px]">중복확인</button></div>
          </div>

          <div className="bg-white rounded-3xl border-2 border-zinc-50 divide-y overflow-hidden">
            {[ { id: "fullName", label: "본명" }, { id: "phone", label: "전화번호" }, { id: "rank", label: "직분", type: "select" }, { id: "church", label: "소속 교회" } ].map(item => (
              <div key={item.id} className="flex items-center justify-between px-6 py-5 min-h-[64px] gap-4">
                <span className="font-bold text-zinc-400 text-[12px] shrink-0">{item.label}</span>
                {item.id === "rank" ? (
                  showCustomRank ? <input {...register("rank")} autoFocus className="text-right outline-none font-bold text-[#4A6741]" /> :
                  <select {...register("rank")} onChange={e => e.target.value === "직접 입력" && setShowCustomRank(true)} className="text-right outline-none font-bold bg-transparent appearance-none"><option value="">선택</option>{ranks.map(r => <option key={r} value={r}>{r}</option>)}</select>
                ) : <input {...register(item.id)} className="w-full text-right outline-none font-bold text-zinc-800" placeholder="입력" />}
              </div>
            ))}
          </div>
          <button type="submit" className="w-full h-18 bg-[#4A6741] text-white rounded-[28px] font-black shadow-xl active:scale-95 transition-all">가입하기</button>
        </form>
      </div>
    </div>
  );
}
