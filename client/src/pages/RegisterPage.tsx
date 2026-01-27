import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Loader2, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch, getValues, trigger } = useForm({ mode: "onChange" });
  
  const [step, setStep] = useState(1);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  
  const [usernameStatus, setUsernameStatus] = useState('none');
  const [emailStatus, setEmailStatus] = useState('none');
  const [nicknameStatus, setNicknameStatus] = useState('none');
  
  const [modal, setModal] = useState({ show: false, title: "", msg: "", type: "error" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isAgreedAll, setIsAgreedAll] = useState(false);

  const watchAll = watch();
  const isPasswordMatch = watchAll.password && watchAll.password.length >= 8 && watchAll.password === watchAll.passwordConfirm;

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('none');
  }, [setValue]);

  useEffect(() => { if(isPopupOpen) generateNickname(); }, [isPopupOpen, generateNickname]);

  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    const values = getValues();
    let value = "";
    if (field === "username") value = values.username?.trim();
    if (field === "nickname") value = values.nickname?.trim();
    if (field === "email") {
      const domain = showCustomDomain ? values.customDomain : values.emailDomain;
      value = `${values.emailId}@${domain}`;
    }
    if (!value || value.includes('undefined')) return setModal({ show: true, title: "알림", msg: "정보를 입력해주세요.", type: "error" });
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (error) throw error;
      const isAvailable = !data;
      if (field === "username") setUsernameStatus(isAvailable ? 'success' : 'error');
      if (field === "nickname") setNicknameStatus(isAvailable ? 'success' : 'error');
      if (field === "email") setEmailStatus(isAvailable ? 'success' : 'error');
      setModal({ show: true, title: isAvailable ? "확인 완료" : "중복", msg: isAvailable ? "사용 가능합니다." : "이미 사용 중입니다.", type: isAvailable ? "success" : "error" });
    } catch (e) { setModal({ show: true, title: "오류", msg: "통신 실패", type: "error" }); }
  };

  const handleNext = async () => {
    const isIdValid = await trigger("username");
    const isPwValid = await trigger("password");
    if (!isIdValid || !isPwValid || usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success' || !isPasswordMatch) {
      return setModal({ show: true, title: "확인", msg: "필수 항목 입력과 중복 확인을 완료해주세요.", type: "error" });
    }
    setStep(2);
  };

  const onSubmit = async (values: any) => {
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "약관에 동의하셔야 가입이 가능합니다.", type: "error" });
    setIsSubmitting(true);
    try {
      const finalEmail = `${values.emailId}@${showCustomDomain ? values.customDomain : values.emailDomain}`;
      const { error } = await supabase.auth.signUp({
        email: finalEmail, password: values.password,
        options: { data: { username: values.username, nickname: values.nickname, full_name: values.fullName || "", phone: values.phone || "", rank: values.rank || "", church: values.church || "" } }
      });
      if (error) throw error;
      setModal({ show: true, title: "가입 완료", msg: "환영합니다!", type: "success" });
    } catch (error: any) {
      setModal({ show: true, title: "실패", msg: error.message, type: "error" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative text-left">
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px white inset !important; -webkit-text-fill-color: #4A6741 !important; }
        input { background-color: transparent !important; color: #4A6741 !important; outline: none; border: none; text-align: right; font-weight: 700; }
        input::placeholder { color: #d1d1d6; font-weight: 500; }
      `}} />

      <header className="px-6 pt-20 pb-10">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400"><ArrowLeft size={24} /></button>
      </header>

      {/* 메인 레이아웃 (기존 유지) */}
      <div className="flex-1 px-8">
        <div className="mt-4 mb-12 text-center">
          <h1 className="font-black text-zinc-900 leading-[1.4]" style={{ fontSize: `${fontSize * 1.2}px` }}>
            3초만에 가입하고<br />
            <span className="text-[#4A6741]" style={{ fontSize: `${fontSize * 1.6}px` }}>묵상을 시작하세요</span>
          </h1>
        </div>

        <div className="space-y-6 flex flex-col items-center mb-10">
          <button className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] flex items-center justify-center gap-3 active:scale-95 transition-all">
             <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
             카카오로 3초만에 시작하기
          </button>
          
          <div className="w-full bg-white rounded-[26px] p-6 shadow-sm space-y-4">
             <div className="flex justify-between items-center"><span className="text-zinc-500 font-bold text-sm">서비스 이용약관 동의 (필수)</span><ChevronRight size={18} className="text-zinc-300"/></div>
             <div className="flex justify-between items-center"><span className="text-zinc-500 font-bold text-sm">개인정보 처리방침 동의 (필수)</span><ChevronRight size={18} className="text-zinc-300"/></div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-10">
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
          <span className="text-zinc-300 font-bold text-[11px]">또는 일반 이메일 가입</span>
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
        </div>

        {/* 직접 가입 버튼 */}
        <button onClick={() => setIsPopupOpen(true)} className="w-full py-4 text-zinc-500 font-bold underline underline-offset-4 decoration-zinc-200 text-center" style={{ fontSize: `${fontSize * 0.9}px` }}>
          직접 정보를 입력해서 가입하시겠어요?
        </button>
      </div>

      {/* 가입 팝업 (바텀 시트) */}
      <AnimatePresence>
        {isPopupOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPopupOpen(false)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[110] flex flex-col max-h-[90vh]"
            >
              <div className="p-8 pb-4 flex justify-between items-center">
                <h2 className="font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 1.3}px` }}>{step === 1 ? "필수 정보 입력" : "선택 정보 입력"}</h2>
                <button onClick={() => { setIsPopupOpen(false); setStep(1); }} className="text-zinc-400 p-2"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-10">
                {step === 1 ? (
                  <div className="space-y-6 pt-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                      <span className="font-bold text-zinc-400 w-24">아이디</span>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("username")} className="flex-1" placeholder="아이디 입력" />
                        <button type="button" onClick={() => checkDuplicate("username")} className="bg-zinc-900 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold">중복확인</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                      <span className="font-bold text-zinc-400 w-24">이메일</span>
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center justify-end gap-1">
                          <input {...register("emailId")} className="w-20" placeholder="이메일" />
                          <span className="text-zinc-300 text-xs">@</span>
                          {showCustomDomain ? <input {...register("customDomain")} className="w-24" /> : 
                          <select {...register("emailDomain")} onChange={e => e.target.value === "직접 입력" && setShowCustomDomain(true)} className="bg-transparent font-bold text-[#4A6741] text-right outline-none">
                            {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>}
                        </div>
                        <button type="button" onClick={() => checkDuplicate("email")} className="text-[10px] text-zinc-400 font-bold underline text-right">이메일 중복확인</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                      <span className="font-bold text-zinc-400 w-24">비밀번호</span>
                      <div className="flex-1 flex items-center justify-end gap-2">
                        <input {...register("password")} type={showPw ? "text" : "password"} className="flex-1" placeholder="8자 이상" />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                      <div className="flex items-center gap-1 w-24"><span className="font-bold text-zinc-400">닉네임</span><button type="button" onClick={generateNickname} className="text-zinc-300"><RefreshCw size={12}/></button></div>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("nickname")} className="flex-1 !text-[#4A6741]" />
                        <button type="button" onClick={() => checkDuplicate("nickname")} className="bg-[#4A6741] text-white text-[10px] px-3 py-1.5 rounded-lg font-bold">확인</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4">
                    {[ { id: "fullName", label: "본명" }, { id: "phone", label: "전화번호" }, { id: "church", label: "소속 교회" } ].map(item => (
                      <div key={item.id} className="flex items-center justify-between border-b border-zinc-100 py-4">
                        <span className="font-bold text-zinc-400 w-24">{item.label}</span>
                        <input {...register(item.id)} className="flex-1" placeholder="입력" />
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                      <span className="font-bold text-zinc-400 w-24">직분</span>
                      <button type="button" onClick={() => setIsRankModalOpen(true)} className="flex-1 text-right font-bold text-[#4A6741]">{watch("rank") || "선택하기"}</button>
                    </div>
                    {/* 2단계 마지막에 약관 동의 배치 */}
                    <div className="pt-6">
                      <button type="button" onClick={() => setIsAgreedAll(!isAgreedAll)} className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl w-full transition-all">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isAgreedAll ? 'bg-[#4A6741]' : 'border-2 border-zinc-200 bg-white'}`}>
                          {isAgreedAll && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-sm font-bold text-zinc-500">필수 약관 및 개인정보 지침에 동의합니다.</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <footer className="p-8 pt-2">
                {step === 1 ? (
                  <button onClick={handleNext} className="w-full h-16 bg-zinc-900 text-white rounded-[20px] font-black shadow-lg">다음 단계</button>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="w-24 h-16 bg-zinc-100 text-zinc-400 rounded-[20px] font-bold">이전</button>
                    <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="flex-1 h-16 bg-[#4A6741] text-white rounded-[20px] font-black shadow-lg">
                      {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "가입 완료하기"}
                    </button>
                  </div>
                )}
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 직분 선택 시트 & 알림 모달 (동일하게 유지) */}
      <AnimatePresence>
        {isRankModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRankModalOpen(false)} className="fixed inset-0 bg-black/20 z-[200]" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[30px] z-[210] p-8">
              <div className="flex flex-wrap gap-2">
                {ranks.map(r => (
                  <button key={r} onClick={() => { setValue("rank", r); setIsRankModalOpen(false); }} className="px-4 py-2 rounded-xl border border-zinc-100 font-bold text-zinc-500">{r}</button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 알림 모달 */}
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-10 bg-black/20">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[24px] w-full p-6 text-center shadow-xl">
              <h3 className="font-bold mb-2">{modal.title}</h3>
              <p className="text-sm text-zinc-500 mb-6">{modal.msg}</p>
              <button onClick={() => { setModal({ ...modal, show: false }); if(modal.type === 'success') setLocation("/auth"); }} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
