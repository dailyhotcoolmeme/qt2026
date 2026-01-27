import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, Eye, EyeOff, Loader2, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "기타"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  
  const { register, handleSubmit, setValue, watch, getValues, formState: { errors } } = useForm({
    mode: "onChange",
    defaultValues: {
      username: "",
      emailId: "",
      emailDomain: "naver.com",
      customDomain: "",
      password: "",
      passwordConfirm: "",
      nickname: "",
      fullName: "",
      phone: "",
      church: "",
      rank: "",
      customRank: ""
    }
  });
  
  const [step, setStep] = useState(1);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [showCustomRankInput, setShowCustomRankInput] = useState(false);
  
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'success' | 'error'>('none');
  const [emailStatus, setEmailStatus] = useState<'none' | 'success' | 'error'>('none');
  const [nicknameStatus, setNicknameStatus] = useState<'none' | 'success' | 'error'>('success'); 
  
  const [modal, setModal] = useState({ show: false, title: "", msg: "", type: "error" as "error" | "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isAgreedAll, setIsAgreedAll] = useState(false);

  const watchAll = watch();
  const isPasswordMatch = watchAll.passwordConfirm && watchAll.password === watchAll.passwordConfirm;

  // 닉네임 자동 생성기
  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
  }, [setValue]);

  // 팝업 열릴 때 닉네임 초기화 방지 및 생성
  useEffect(() => {
    if (isPopupOpen && !getValues("nickname")) {
      generateNickname();
    }
  }, [isPopupOpen, generateNickname, getValues]);

  // 입력 변경 시 상태 리셋
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'username') setUsernameStatus('none');
      if (name === 'nickname') setNicknameStatus('none');
      if (name === 'emailId' || name === 'emailDomain' || name === 'customDomain') setEmailStatus('none');
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // 중복 확인 로직 (안내 팝업 포함)
  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    const values = getValues();
    let value = "";
    if (field === "username") value = values.username?.trim();
    if (field === "nickname") value = values.nickname?.trim();
    if (field === "email") {
      const domain = showCustomDomain ? values.customDomain : values.emailDomain;
      value = `${values.emailId}@${domain}`;
    }
    
    if (!value || value.includes('undefined') || (field === "email" && !values.emailId)) {
      setModal({ show: true, title: "알림", msg: "확인할 내용을 입력해주세요.", type: "error" });
      return;
    }

    try {
      const { data, error } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (error) throw error;

      if (data) {
        setModal({ show: true, title: "중복 확인", msg: `이미 등록된 ${field === 'username' ? '아이디' : field === 'nickname' ? '닉네임' : '이메일'}입니다.`, type: "error" });
        if (field === "username") setUsernameStatus('error');
        if (field === "nickname") setNicknameStatus('error');
        if (field === "email") setEmailStatus('error');
      } else {
        setModal({ show: true, title: "중복 확인", msg: "사용 가능한 정보입니다!", type: "success" });
        if (field === "username") setUsernameStatus('success');
        if (field === "nickname") setNicknameStatus('success');
        if (field === "email") setEmailStatus('success');
      }
    } catch (e) {
      setModal({ show: true, title: "오류", msg: "서버 통신에 실패했습니다.", type: "error" });
    }
  };

  const handleKakaoLogin = async () => {
    if (!isAgreedAll) {
      setModal({ show: true, title: "약관 동의 필수", msg: "이용약관 및 개인정보 처리방침에 동의하셔야 합니다.", type: "error" });
      return;
    }
    await supabase.auth.signInWithOAuth({ 
      provider: 'kakao',
      options: { redirectTo: window.location.origin }
    });
  };

  const onSubmit = async (data: any) => {
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의해주세요.", type: "error" });
    if (usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success') {
      return setModal({ show: true, title: "확인 필요", msg: "모든 항목의 중복 확인을 완료해주세요.", type: "error" });
    }

    setIsSubmitting(true);
    try {
      const finalRank = data.rank === "기타" ? data.customRank : data.rank;
      const finalEmail = `${data.emailId}@${showCustomDomain ? data.customDomain : data.emailDomain}`;
      
      const { error } = await supabase.auth.signUp({
        email: finalEmail,
        password: data.password,
        options: {
          data: {
            username: data.username,
            nickname: data.nickname,
            full_name: data.fullName,
            phone: data.phone,
            church_name: data.church,
            rank: finalRank
          }
        }
      });
      if (error) throw error;
      setModal({ show: true, title: "가입 완료", msg: "회원가입을 축하드립니다!", type: "success" });
    } catch (error: any) {
      setModal({ show: true, title: "가입 실패", msg: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative text-left overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px white inset !important;
          -webkit-text-fill-color: #4A6741 !important;
        }
        input { background-color: transparent !important; color: #4A6741 !important; outline: none; border: none; font-weight: 700; width: 100%; font-size: 16px; }
        select { appearance: none; background: transparent; border: none; outline: none; font-weight: 700; color: #4A6741; width: 100%; cursor: pointer; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      {/* 헤더 */}
      <header className="px-6 pt-16 pb-6 relative z-20">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft size={24} />
        </button>
      </header>

      {/* 메인 가입 유도 화면 */}
      <div className="flex-1 px-8 relative">
        {/* 상단 스르륵 효과 (Fade Gradient) */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#F8F8F8] via-[#F8F8F8]/80 to-transparent z-10 pointer-events-none" />
        
        <div className="mt-8 mb-14 text-center relative z-0">
          <h1 className="font-black text-zinc-900 leading-[1.45]" style={{ fontSize: `${fontSize * 1.25}px` }}>
            3초만에 가입하고<br />
            <span className="text-[#4A6741]" style={{ fontSize: `${fontSize * 1.65}px` }}>묵상 일기를 남겨보세요</span>
          </h1>
        </div>

        <div className="space-y-6 mb-12 flex flex-col items-center relative z-20">
          {/* 카카오 버튼 */}
          <button 
            onClick={handleKakaoLogin}
            className="w-full h-[68px] bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[24px] shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
            카카오로 3초만에 가입하기
          </button>
          
          {/* 약관 동의 체크 (메인 화면용) */}
          <button 
            type="button" 
            onClick={() => setIsAgreedAll(!isAgreedAll)}
            className="flex items-center justify-center gap-2 group"
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isAgreedAll ? 'bg-[#4A6741]' : 'border-2 border-zinc-200 bg-white'}`}>
              {isAgreedAll && <Check size={16} className="text-white" />}
            </div>
            <span className="text-[14px] font-bold text-zinc-500">
              필수 <Link href="/terms/service"><a className="underline decoration-zinc-300 underline-offset-4">이용약관</a></Link> 및 <Link href="/terms/privacy"><a className="underline decoration-zinc-300 underline-offset-4">개인정보 처리방침</a></Link>에 동의합니다
            </span>
          </button>
        </div>

        {/* 혹은 구분선 */}
        <div className="flex items-center gap-4 mb-10 px-2">
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
          <span className="text-zinc-400 font-bold text-[11px] uppercase tracking-[0.3em]">혹은</span>
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
        </div>

        {/* 일반 가입 유도 버튼 */}
        <button 
          onClick={() => setIsPopupOpen(true)}
          className="w-full h-[76px] bg-white border-2 border-zinc-100 text-zinc-900 font-bold rounded-[26px] shadow-sm flex flex-col items-center justify-center active:scale-[0.98] transition-all"
        >
          <span className="text-[17px]">직접 정보 입력해서 가입하기</span>
          <span className="text-[11px] text-zinc-400 font-medium mt-1">아이디, 이메일, 닉네임 직접 설정</span>
        </button>
      </div>

      {/* 가입 정보 입력 바텀 시트 */}
      <AnimatePresence>
        {isPopupOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPopupOpen(false)}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-[2px]" 
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[110] flex flex-col max-h-[94vh] shadow-2xl overflow-hidden"
            >
              {/* 바텀시트 헤더 */}
              <div className="px-8 pt-10 pb-6 bg-white flex justify-between items-center shrink-0 border-b border-zinc-50">
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 1.35}px` }}>
                    {step === 1 ? "필수 가입 정보" : "추가 정보 (선택)"}
                  </h2>
                  <div className="flex gap-2">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-10 bg-[#4A6741]' : 'w-2 bg-zinc-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-10 bg-[#4A6741]' : 'w-2 bg-zinc-200'}`} />
                  </div>
                </div>
                <button onClick={() => setIsPopupOpen(false)} className="bg-zinc-100 p-2.5 rounded-full text-zinc-400 active:scale-90 transition-transform">
                  <X size={26}/>
                </button>
              </div>

              {/* 입력 영역 스크롤 */}
              <div className="flex-1 overflow-y-auto px-8 py-6 no-scrollbar">
                {step === 1 ? (
                  <div className="space-y-2">
                    {/* 아이디 */}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">아이디</span>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("username")} placeholder="사용할 아이디" />
                        <button type="button" onClick={() => checkDuplicate("username")} 
                          className="shrink-0 px-4 py-2 bg-zinc-900 text-white text-[12px] rounded-xl font-bold active:scale-95 transition-all">
                          중복확인
                        </button>
                      </div>
                    </div>

                    {/* 이메일 - 가로폭 수정본 */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-6">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">이메일</span>
                        <div className="flex-1 flex items-center gap-1.5 overflow-visible">
                          <input {...register("emailId")} className="!w-24 shrink-0" placeholder="email" />
                          <span className="text-zinc-300 font-bold shrink-0">@</span>
                          <div className="flex-1 min-w-[120px]">
                            {showCustomDomain ? (
                              <input {...register("customDomain")} placeholder="도메인 입력" autoFocus />
                            ) : (
                              <select 
                                {...register("emailDomain")} 
                                onChange={(e) => { if (e.target.value === "직접 입력") setShowCustomDomain(true); }}
                                className="w-full truncate font-bold"
                              >
                                {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => checkDuplicate("email")} 
                          className="shrink-0 px-4 py-2 bg-zinc-900 text-white text-[12px] rounded-xl font-bold active:scale-95 transition-all ml-1">
                          중복확인
                        </button>
                      </div>
                    </div>

                    {/* 비밀번호 */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">비밀번호</span>
                        <div className="flex-1 flex items-center gap-2">
                          <input {...register("password")} type={showPw ? "text" : "password"} placeholder="8자리 이상" />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 p-1">
                            {showPw ? <EyeOff size={20}/> : <Eye size={20}/>}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">비밀번호 확인</span>
                        <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} placeholder="다시 입력" />
                      </div>
                      <div className="pl-28 mt-3">
                        {watchAll.passwordConfirm && (
                          <p className={`text-[12px] font-bold ${isPasswordMatch ? 'text-[#4A6741]' : 'text-red-500'}`}>
                            {isPasswordMatch ? "✓ 비밀번호가 일치합니다." : "✕ 비밀번호가 일치하지 않습니다."}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 닉네임 */}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <span className="font-bold text-zinc-400">닉네임</span>
                        <button type="button" onClick={generateNickname} className="text-[#4A6741] p-1.5 bg-zinc-50 rounded-full active:rotate-180 transition-transform duration-500">
                          <RefreshCw size={14}/>
                        </button>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("nickname")} placeholder="닉네임" />
                        <button type="button" onClick={() => checkDuplicate("nickname")} 
                          className="shrink-0 px-4 py-2 bg-zinc-900 text-white text-[12px] rounded-xl font-bold active:scale-95 transition-all">
                          중복확인
                        </button>
                      </div>
                    </div>
                    <div className="h-24" /> {/* 스크롤 여백 */}
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">본명</span>
                      <input {...register("fullName")} placeholder="성함을 입력해주세요" />
                    </div>
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">전화번호</span>
                      <input {...register("phone")} placeholder="010-0000-0000" />
                    </div>
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">소속 교회</span>
                      <input {...register("church")} placeholder="교회명을 입력해주세요" />
                    </div>
                    <div className="flex flex-col border-b-2 border-zinc-50 py-6">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">직분</span>
                        <button 
                          type="button" 
                          onClick={() => setIsRankModalOpen(true)}
                          className="flex-1 text-left font-bold text-[#4A6741] flex items-center justify-between py-1"
                        >
                          {watch("rank") || "선택해주세요"}
                          <ChevronRight size={20} className="text-zinc-300"/>
                        </button>
                      </div>
                      {showCustomRankInput && (
                        <div className="mt-5 pl-28 transition-all">
                          <input {...register("customRank")} placeholder="직접 입력" className="border-b border-zinc-200 py-1.5" />
                        </div>
                      )}
                    </div>
                    
                    {/* 약관 동의 (바텀시트 하단용) */}
                    <div className="pt-12 pb-6">
                      <button 
                        type="button" 
                        onClick={() => setIsAgreedAll(!isAgreedAll)}
                        className="flex items-center justify-center gap-3 mx-auto py-4 px-6 bg-zinc-50 rounded-[20px] w-full"
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${isAgreedAll ? 'bg-[#4A6741]' : 'border-2 border-zinc-300 bg-white'}`}>
                          {isAgreedAll && <Check size={14} className="text-white" />}
                        </div>
                        <span className="font-bold text-[14px] text-zinc-600">필수 약관 및 개인정보 정책에 동의합니다</span>
                      </button>
                    </div>
                    <div className="h-24" />
                  </div>
                )}
              </div>

              {/* 하단 고정 버튼 (스크롤에 영향받지 않음) */}
              <div className="px-8 pt-6 pb-12 bg-white border-t border-zinc-50 shrink-0 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                {step === 1 ? (
                  <button 
                    onClick={() => {
                      if (usernameStatus === 'success' && emailStatus === 'success' && nicknameStatus === 'success' && isPasswordMatch) {
                        setStep(2);
                      } else {
                        setModal({ show: true, title: "입력 확인", msg: "중복 확인과 비밀번호 일치를 확인해주세요.", type: "error" });
                      }
                    }}
                    className="w-full h-[70px] bg-zinc-900 text-white rounded-[26px] font-black text-[18px] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    다음 단계로 <ChevronRight size={20}/>
                  </button>
                ) : (
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(1)}
                      className="w-28 h-[70px] bg-zinc-100 text-zinc-400 rounded-[26px] font-bold text-[17px] active:scale-[0.98] transition-all"
                    >
                      이전
                    </button>
                    <button 
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                      className="flex-1 h-[70px] bg-[#4A6741] text-white rounded-[26px] font-black text-[18px] shadow-xl flex items-center justify-center active:scale-[0.98] transition-all disabled:bg-zinc-300"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : "가입 완료하기"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 직분 선택 모달 */}
      <AnimatePresence>
        {isRankModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRankModalOpen(false)} className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[210] px-8 pt-12 pb-16">
              <div className="flex justify-between items-center mb-10 px-2">
                <h3 className="font-black text-zinc-900 text-[22px]">직분을 선택해주세요</h3>
                <button onClick={() => setIsRankModalOpen(false)} className="bg-zinc-100 p-2 rounded-full text-zinc-400"><X size={24}/></button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {ranks.map(r => (
                  <button 
                    key={r} 
                    onClick={() => {
                      setValue("rank", r);
                      setShowCustomRankInput(r === "기타");
                      setIsRankModalOpen(false);
                    }}
                    className={`py-5 rounded-[22px] border-2 font-bold transition-all ${watch("rank") === r ? 'border-[#4A6741] bg-[#4A6741] text-white' : 'border-zinc-50 bg-zinc-50 text-zinc-500'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 공통 알림/중복확인 안내 팝업 */}
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-10 bg-black/40 backdrop-blur-[6px]">
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white rounded-[36px] w-full max-w-sm p-10 shadow-2xl text-center relative overflow-hidden"
            >
              {modal.type === 'success' && <div className="absolute top-0 left-0 right-0 h-2 bg-[#4A6741]" />}
              <div className={`w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center ${modal.type === 'success' ? 'bg-[#4A6741]/10 text-[#4A6741]' : 'bg-red-50 text-red-500'}`}>
                {modal.type === 'success' ? <Check size={40} strokeWidth={3} /> : <X size={40} strokeWidth={3} />}
              </div>
              <h3 className="font-black text-[22px] mb-4 text-zinc-900">{modal.title}</h3>
              <p className="text-zinc-500 mb-10 text-[16px] leading-relaxed break-keep font-medium">{modal.msg}</p>
              <button 
                onClick={() => {
                  setModal({ ...modal, show: false });
                  if(modal.type === 'success' && modal.title === '가입 완료') setLocation("/auth");
                }}
                className="w-full py-5 bg-zinc-900 text-white rounded-[22px] font-black text-[18px] active:scale-[0.97] transition-all shadow-lg"
              >
                확인
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
