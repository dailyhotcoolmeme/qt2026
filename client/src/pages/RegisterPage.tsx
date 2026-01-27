import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, X, ChevronRight, Loader2, Mail, User, Lock } from "lucide-react";
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
  const [isFormVisible, setIsFormVisible] = useState(false); // 일반 가입 폼 노출 제어

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
    if (!agreed.service || !agreed.privacy) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의해주세요.", type: "error" });
    if (usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success') return setModal({ show: true, title: "확인 필요", msg: "중복 확인을 완료해주세요.", type: "error" });
    if (!isPasswordMatch) return setModal({ show: true, title: "비밀번호", msg: "비밀번호가 일치하지 않습니다.", type: "error" });

    setIsSubmitting(true);
    try {
      const finalEmail = `${values.emailId}@${showCustomDomain ? values.customDomain : values.emailDomain}`;
      const { error } = await supabase.auth.signUp({
        email: finalEmail, password: values.password,
        options: { data: { username: values.username, nickname: values.nickname, full_name: values.fullName || "", phone: values.phone || "", rank: values.rank || "", church: values.church || "" } }
      });
      if (error) throw error;
      setModal({ show: true, title: "가입 완료", msg: "환영합니다! 가입이 완료되었습니다.", type: "success" });
    } catch (error: any) {
      setModal({ show: true, title: "실패", msg: error.message, type: "error" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative text-left overflow-x-hidden">
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.type === 'success' ? 'bg-green-50 text-[#4A6741]' : 'bg-red-50 text-red-500'}`}><AlertCircle size={24} /></div>
              <h3 className="font-black mb-2">{modal.title}</h3>
              <p className="text-zinc-500 mb-6 text-sm">{modal.msg}</p>
              <button onClick={() => { setModal({ ...modal, show: false }); if(modal.type === 'success') setLocation("/auth"); }} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-12 pb-6 flex items-center gap-4">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400"><ArrowLeft size={24} /></button>
        <h2 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.2}px` }}>회원가입</h2>
      </header>

      <div className="flex-1 px-8 pb-20">
        {/* 상단 메시지 */}
        <div className="mt-4 mb-10">
          <h1 className="font-black text-zinc-900 leading-tight tracking-tighter mb-4" style={{ fontSize: `${fontSize * 1.8}px` }}>
            <span className="text-[#4A6741]">3초만에</span> 가입하고<br />
            묵상을 시작하세요
          </h1>
        </div>

        {/* 카카오 가입 (메인) */}
        <div className="space-y-4 mb-12">
          <button 
            onClick={handleKakaoSignUp} 
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
            카카오로 3초만에 시작하기
          </button>
          
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-zinc-100">
            <div className="space-y-4">
              {[ { id: 'service', label: '서비스 이용약관 동의 (필수)' }, { id: 'privacy', label: '개인정보 처리방침 동의 (필수)' } ].map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <button type="button" onClick={() => setAgreed({ ...agreed, [item.id]: !(agreed as any)[item.id] })} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${(agreed as any)[item.id] ? 'bg-[#4A6741]' : 'border-2 border-zinc-200'}`}>
                      {(agreed as any)[item.id] && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-sm font-bold text-zinc-600">{item.label}</span>
                  </button>
                  <Link href={`/terms/${item.id}`}><ChevronRight size={18} className="text-zinc-300" /></Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
          <span className="text-zinc-400 font-bold text-[11px] uppercase tracking-widest text-center">또는 일반 이메일 가입</span>
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
        </div>

        {/* 일반 가입 토글 버튼 */}
        {!isFormVisible && (
          <button 
            onClick={() => setIsFormVisible(true)}
            className="w-full py-4 text-zinc-500 font-bold text-sm underline underline-offset-4 decoration-zinc-200 active:text-zinc-800 transition-colors"
          >
            직접 정보를 입력해서 가입하시겠어요?
          </button>
        )}

        {/* 일반 가입 폼 (애니메이션 노출) */}
        <AnimatePresence>
          {isFormVisible && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleSubmit(onSubmit)} className="space-y-6"
            >
              {/* 아이디 */}
              <div className={`rounded-3xl p-5 border-2 transition-all ${usernameStatus === 'success' ? 'border-[#4A6741] bg-white' : 'border-white bg-white shadow-sm'}`}>
                <div className="flex justify-between mb-2"><label className="font-bold text-[#4A6741] text-[11px]">아이디</label><span className="text-[10px] font-bold text-red-500">{usernameStatus === 'error' && msgs.username}</span></div>
                <div className="flex gap-2"><input {...register("username")} className="flex-1 bg-transparent outline-none font-black text-zinc-900" placeholder="아이디 입력" /><button type="button" onClick={() => checkDuplicate("username")} className="shrink-0 px-4 py-2 rounded-xl bg-zinc-900 text-white font-bold text-[11px]">중복확인</button></div>
              </div>

              {/* 이메일 */}
              <div className={`rounded-3xl p-5 border-2 transition-all ${emailStatus === 'success' ? 'border-[#4A6741] bg-white' : 'border-white bg-white shadow-sm'}`}>
                <label className="font-bold text-[#4A6741] text-[11px] mb-2 block">이메일</label>
                <div className="flex items-center gap-2 mb-3">
                  <input {...register("emailId")} className="w-[45%] bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" placeholder="아이디" /><span className="text-zinc-400">@</span>
                  <div className="flex-1 relative">
                    {showCustomDomain ? <input {...register("customDomain")} autoFocus className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" /> : <select {...register("emailDomain")} onChange={e => e.target.value === "직접 입력" && setShowCustomDomain(true)} className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold appearance-none outline-none">{emailDomains.map(d => <option key={d} value={d}>{d}</option>)}</select>}
                  </div>
                </div>
                <button type="button" onClick={() => checkDuplicate("email")} className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-500 font-bold text-[12px]">이메일 중복확인</button>
              </div>

              {/* 비밀번호 */}
              <div className={`rounded-3xl p-5 border-2 transition-all ${isPasswordMatch ? 'border-[#4A6741] bg-white' : 'border-white bg-white shadow-sm'}`}>
                <label className="font-bold text-[#4A6741] text-[11px] mb-2 block">비밀번호 설정</label>
                <div className="space-y-4">
                  <div className="flex border-b border-zinc-50 pb-2"><input {...register("password")} type={showPw ? "text" : "password"} className="flex-1 bg-transparent outline-none font-bold" placeholder="8자 이상 입력" /><button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
                  <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} className="w-full bg-transparent outline-none font-bold" placeholder="비밀번호 재입력" />
                </div>
              </div>

              {/* 닉네임 */}
              <div className={`rounded-3xl p-5 border-2 transition-all ${nicknameStatus === 'success' ? 'border-[#4A6741] bg-white' : 'border-white bg-white shadow-sm'}`}>
                <div className="flex justify-between mb-2"><label className="font-bold text-[#4A6741] text-[11px]">닉네임</label><button type="button" onClick={generateNickname} className="text-zinc-400 text-[10px] font-bold"><RefreshCw size={10}/></button></div>
                <div className="flex gap-2"><input {...register("nickname")} className="flex-1 bg-transparent outline-none font-black text-[#4A6741]" /><button type="button" onClick={() => checkDuplicate("nickname")} className="shrink-0 px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-[11px]">중복확인</button></div>
              </div>

              {/* 상세 정보 (선택) */}
              <div className="bg-white rounded-[24px] shadow-sm divide-y border border-zinc-50">
                {[ { id: "fullName", label: "본명" }, { id: "phone", label: "전화번호" }, { id: "rank", label: "직분", type: "select" }, { id: "church", label: "소속 교회" } ].map(item => (
                  <div key={item.id} className="flex items-center justify-between px-6 py-5 gap-4">
                    <span className="font-bold text-zinc-400 text-[12px]">{item.label}</span>
                    {item.id === "rank" ? (
                      showCustomRank ? <input {...register("rank")} className="text-right outline-none font-bold text-[#4A6741]" /> :
                      <select {...register("rank")} onChange={e => e.target.value === "직접 입력" && setShowCustomRank(true)} className="text-right outline-none font-bold bg-transparent appearance-none"><option value="">선택</option>{ranks.map(r => <option key={r} value={r}>{r}</option>)}</select>
                    ) : <input {...register(item.id)} className="w-full text-right outline-none font-bold text-zinc-800 px-0" placeholder="입력" />}
                  </div>
                ))}
              </div>

              <button 
                type="submit" disabled={isSubmitting}
                className="w-full h-18 bg-[#4A6741] text-white rounded-[28px] font-black shadow-lg active:scale-95 transition-all mt-6"
              >
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "가입하기"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
