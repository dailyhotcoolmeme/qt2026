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
  const [attemptedStep1, setAttemptedStep1] = useState(false);

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

  const handleNextStep = () => {
    setAttemptedStep1(true);
    if (usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success' || !isPasswordMatch) {
      return setModal({ show: true, title: "확인", msg: "필수 입력 및 중복 확인을 완료해주세요.", type: "error" });
    }
    setStep(2);
  };

  const onSubmit = async (values: any) => {
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의하셔야 가입이 가능합니다.", type: "error" });
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
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative text-left">
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px white inset !important; -webkit-text-fill-color: #4A6741 !important; }
        input { background-color: transparent !important; color: #4A6741 !important; outline: none; border: none; text-align: right; font-weight: 700; }
      `}} />

      <header className="px-6 pt-20 pb-10 flex items-center">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400 shrink-0"><ArrowLeft size={24} /></button>
      </header>

      <div className="flex-1 px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 mb-12 text-center">
          <h1 className="font-black text-zinc-900 leading-[1.4] tracking-tighter" style={{ fontSize: `${fontSize * 1.2}px` }}>
            3초만에 가입하고<br />
            <span className="text-[#4A6741]" style={{ fontSize: `${fontSize * 1.6}px` }}>묵상 일기를 남겨보세요</span>
          </h1>
        </motion.div>

        <div className="space-y-6 mb-12 flex flex-col items-center">
          <button 
            onClick={() => { if(!isAgreedAll) return setModal({show:true, title:"약관 동의", msg:"필수 약관에 동의하셔야 가입이 가능합니다.", type:"error"}); supabase.auth.signInWithOAuth({provider:'kakao'}); }} 
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
            카카오로 3초만에 가입하기
          </button>
          
          <button type="button" onClick={() => setIsAgreedAll(!isAgreedAll)} className="flex items-center gap-2 group">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${isAgreedAll ? 'bg-[#4A6741]' : 'border-2 border-zinc-200 bg-white'}`}>
              {isAgreedAll && <Check size={14} className="text-white" />}
            </div>
            <span className="text-[13px] font-bold text-zinc-500">
              필수 <Link href="/terms/service"><a className="underline decoration-zinc-300 underline-offset-2">이용약관</a></Link> 및 <Link href="/terms/privacy"><a className="underline decoration-zinc-300 underline-offset-2">개인정보 처리방침</a></Link>에 동의합니다
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
          <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest px-2">혹은</span>
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
        </div>

        <button 
          onClick={() => setIsPopupOpen(true)}
          className="w-full h-[64px] bg-white border-2 border-zinc-100 text-zinc-900 font-bold rounded-[22px] shadow-sm flex flex-col items-center justify-center active:scale-95 transition-all"
        >
          <span style={{ fontSize: `${fontSize * 0.95}px` }}>직접 정보 입력해서 가입하기</span>
          <span className="text-[10px] text-zinc-400 font-medium tracking-tight">아이디, 이메일, 닉네임 직접 설정</span>
        </button>
      </div>

      {/* 가입 팝업 (바텀 시트) */}
      <AnimatePresence>
        {isPopupOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPopupOpen(false)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[110] flex flex-col max-h-[92vh] shadow-2xl overflow-hidden"
            >
              {/* 상단 헤더: 단계 표시 및 닫기 */}
              <div className="px-8 pt-10 pb-4 relative">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 1.3}px` }}>{step === 1 ? "필수 입력" : "선택 입력"}</h2>
                  <button onClick={() => { setIsPopupOpen(false); setStep(1); }} className="text-zinc-300"><X size={28}/></button>
                </div>
                {/* 1/2단계 인디케이터 */}
                <div className="flex gap-1.5 absolute top-10 left-1/2 -translate-x-1/2">
                   <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-[#4A6741]' : 'bg-zinc-200'}`} />
                   <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-[#4A6741]' : 'bg-zinc-200'}`} />
                </div>
              </div>

              {/* 입력 영역 (스크롤 가능) */}
              <div className="flex-1 overflow-y-auto px-8 pb-32">
                {step === 1 ? (
                  <div className="space-y-1 pt-4">
                    <div className={`flex items-center justify-between border-b-2 py-5 transition-all ${attemptedStep1 && usernameStatus !== 'success' ? 'bg-red-50 px-3 rounded-xl border-transparent' : 'border-zinc-50'}`}>
                      <span className="font-bold text-zinc-400 shrink-0 w-20" style={{ fontSize: `${fontSize * 0.9}px` }}>아이디</span>
                      <div className="flex-1 flex items-center justify-end gap-2">
                        <input {...register("username")} className="w-full" placeholder="아이디 입력" />
                        <button type="button" onClick={() => checkDuplicate("username")} className="shrink-0 px-3 py-1.5 bg-zinc-900 text-white text-[10px] rounded-lg font-bold">확인</button>
                      </div>
                    </div>
                    <div className={`flex flex-col border-b-2 py-5 transition-all ${attemptedStep1 && emailStatus !== 'success' ? 'bg-red-50 px-3 rounded-xl border-transparent' : 'border-zinc-50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-20" style={{ fontSize: `${fontSize * 0.9}px` }}>이메일</span>
                        <div className="flex-1 flex items-center justify-end gap-1">
                          <input {...register("emailId")} className="w-20" placeholder="이메일" />
                          <span className="text-zinc-300 text-xs">@</span>
                          <div className="w-28">
                            {showCustomDomain ? <input {...register("customDomain")} autoFocus className="w-full" /> : 
                            <select {...register("emailDomain")} onChange={e => e.target.value === "직접 입력" && setShowCustomDomain(true)} className="w-full text-right font-bold text-[#4A6741] bg-transparent outline-none appearance-none pr-1">{emailDomains.map(d => <option key={d} value={d}>{d}</option>)}</select>}
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => checkDuplicate("email")} className="text-[10px] text-zinc-400 font-bold underline text-right mt-2">이메일 중복확인</button>
                    </div>
                    <div className={`flex flex-col border-b-2 py-5 transition-all ${attemptedStep1 && !isPasswordMatch ? 'bg-red-50 px-3 rounded-xl border-transparent' : 'border-zinc-50'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-zinc-400 shrink-0 w-20" style={{ fontSize: `${fontSize * 0.9}px` }}>비밀번호</span>
                        <div className="flex-1 flex items-center justify-end gap-2">
                          <input {...register("password")} type={showPw ? "text" : "password"} className="w-full" placeholder="8자 이상" />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 shrink-0">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-20" style={{ fontSize: `${fontSize * 0.8}px` }}>확인</span>
                        <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} className="w-full" placeholder="비밀번호 다시 입력" />
                      </div>
                    </div>
                    <div className={`flex items-center justify-between border-b-2 py-5 transition-all ${attemptedStep1 && nicknameStatus !== 'success' ? 'bg-red-50 px-3 rounded-xl border-transparent' : 'border-zinc-50'}`}>
                      <div className="flex items-center gap-1 w-20 shrink-0"><span className="font-bold text-zinc-400" style={{ fontSize: `${fontSize * 0.9}px` }}>닉네임</span><button type="button" onClick={generateNickname} className="text-zinc-300"><RefreshCw size={12}/></button></div>
                      <div className="flex-1 flex items-center justify-end gap-2">
                        <input {...register("nickname")} className="w-full !text-[#4A6741]" />
                        <button type="button" onClick={() => checkDuplicate("nickname")} className="shrink-0 px-3 py-1.5 bg-[#4A6741] text-white text-[10px] rounded-lg font-bold">확인</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 pt-4">
                    {[ { id: "fullName", label: "본명" }, { id: "phone", label: "전화번호" }, { id: "church", label: "소속 교회" } ].map(item => (
                      <div key={item.id} className="flex items-center justify-between border-b-2 border-zinc-50 py-5">
                        <span className="font-bold text-zinc-400 shrink-0 w-20" style={{ fontSize: `${fontSize * 0.9}px` }}>{item.label}</span>
                        <input {...register(item.id)} className="w-full" placeholder="입력(선택)" />
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-5">
                      <span className="font-bold text-zinc-400 shrink-0 w-20" style={{ fontSize: `${fontSize * 0.9}px` }}>직분</span>
                      <button type="button" onClick={() => setIsRankModalOpen(true)} className="flex-1 text-right font-bold text-[#4A6741] flex items-center justify-end gap-1">
                        {watch("rank") || "선택하기"} <ChevronRight size={16}/>
                      </button>
                    </div>
                    {/* 약관 동의 */}
                    <div className="pt-8">
                      <button type="button" onClick={() => setIsAgreedAll(!isAgreedAll)} className="flex items-center gap-3 p-5 bg-zinc-50 rounded-[22px] w-full">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isAgreedAll ? 'bg-[#4A6741]' : 'border-2 border-zinc-200 bg-white'}`}>
                          {isAgreedAll && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-[14px] font-bold text-zinc-600">필수 이용약관 및 개인정보 지침 동의</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 하단 고정 버튼 영역 */}
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-white border-t border-zinc-50">
                {step === 1 ? (
                  <button onClick={handleNextStep} className="w-full h-[64px] bg-zinc-900 text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2">다음 단계로 <ChevronRight size={20}/></button>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="w-24 h-[64px] bg-zinc-100 text-zinc-400 rounded-[24px] font-bold">이전</button>
                    <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="flex-1 h-[64px] bg-[#4A6741] text-white rounded-[24px] font-black shadow-lg flex items-center justify-center">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : "가입 완료하기"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 직분 선택 바텀시트 */}
      <AnimatePresence>
        {isRankModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRankModalOpen(false)} className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[210] px-8 pt-10 pb-16">
              <div className="flex justify-between items-center mb-8"><h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.2}px` }}>직분 선택</h3><button onClick={() => setIsRankModalOpen(false)} className="text-zinc-400 p-2"><X size={24}/></button></div>
              <div className="flex flex-wrap gap-3">
                {ranks.map(r => (
                  <button key={r} onClick={() => { setValue("rank", r); setIsRankModalOpen(false); }} className="px-5 py-3 rounded-2xl border-2 border-zinc-100 font-bold text-zinc-500 active:bg-[#4A6741] active:text-white transition-all">{r}</button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 알림 모달 */}
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-10 bg-black/20 backdrop-blur-[2px]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <h3 className="font-black mb-2" style={{ fontSize: `${fontSize * 1.1}px` }}>{modal.title}</h3>
              <p className="text-zinc-500 mb-6 text-sm break-keep">{modal.msg}</p>
              <button onClick={() => { setModal({ ...modal, show: false }); if(modal.type === 'success' && modal.title === "가입 완료") setLocation("/auth"); }} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
