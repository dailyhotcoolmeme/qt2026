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
  const { register, handleSubmit, setValue, watch, getValues } = useForm({
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

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
  }, [setValue]);

  useEffect(() => {
    if (isPopupOpen) generateNickname();
  }, [isPopupOpen, generateNickname]);

  // 닉네임 입력 감지 시 상태 초기화 (사용자가 수정하면 다시 중복확인하게)
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'nickname') setNicknameStatus('none');
      if (name === 'username') setUsernameStatus('none');
      if (name === 'emailId' || name === 'emailDomain' || name === 'customDomain') setEmailStatus('none');
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    const values = getValues();
    let value = "";
    if (field === "username") value = values.username?.trim();
    if (field === "nickname") value = values.nickname?.trim();
    if (field === "email") {
      const domain = showCustomDomain ? values.customDomain : values.emailDomain;
      value = `${values.emailId}@${domain}`;
    }
    
    if (!value || value.includes('undefined')) {
      setModal({ show: true, title: "입력 확인", msg: "값을 입력해주세요.", type: "error" });
      return;
    }

    try {
      const { data, error } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (error) throw error;
      
      if (field === "username") setUsernameStatus(!data ? 'success' : 'error');
      if (field === "nickname") setNicknameStatus(!data ? 'success' : 'error');
      if (field === "email") setEmailStatus(!data ? 'success' : 'error');
    } catch (e) {
      setModal({ show: true, title: "오류", msg: "중복 확인 중 문제가 발생했습니다.", type: "error" });
    }
  };

  const handleKakaoLogin = async () => {
    if (!isAgreedAll) {
      setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의하셔야 가입이 가능합니다.", type: "error" });
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: 'kakao' });
  };

  const onSubmit = async (data: any) => {
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의해주세요.", type: "error" });
    if (usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success') {
      return setModal({ show: true, title: "중복 확인", msg: "모든 중복 확인을 완료해주세요.", type: "error" });
    }
    if (!isPasswordMatch) return setModal({ show: true, title: "비밀번호", msg: "비밀번호가 일치하지 않습니다.", type: "error" });

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
      setModal({ show: true, title: "가입 완료", msg: "회원가입이 성공적으로 완료되었습니다!", type: "success" });
    } catch (error: any) {
      setModal({ show: true, title: "가입 실패", msg: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative text-left overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px white inset !important; -webkit-text-fill-color: #4A6741 !important; }
        input { background-color: transparent !important; color: #4A6741 !important; outline: none; border: none; text-align: left; font-weight: 700; width: 100%; font-size: 16px; }
        select { appearance: none; background: transparent; border: none; outline: none; font-weight: 700; color: #4A6741; }
      `}} />

      <header className="px-6 pt-20 pb-10">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400 active:text-zinc-600 transition-colors">
          <ArrowLeft size={24} />
        </button>
      </header>

      <div className="flex-1 px-8 pb-20">
        <div className="mt-4 mb-12 text-center">
          <h1 className="font-black text-zinc-900 leading-[1.4]" style={{ fontSize: `${fontSize * 1.25}px` }}>
            3초만에 가입하고<br />
            <span className="text-[#4A6741]" style={{ fontSize: `${fontSize * 1.6}px` }}>묵상 일기를 남겨보세요</span>
          </h1>
        </div>

        <div className="space-y-6 mb-12 flex flex-col items-center">
          <button 
            onClick={handleKakaoLogin}
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-sm flex items-center justify-center gap-3 active:scale-[0.97] transition-all"
          >
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
            카카오로 3초만에 가입하기
          </button>
          
          <button 
            type="button" 
            onClick={() => setIsAgreedAll(!isAgreedAll)}
            className="flex items-center justify-center gap-2 group cursor-pointer"
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isAgreedAll ? 'bg-[#4A6741]' : 'border-2 border-zinc-200 bg-white'}`}>
              {isAgreedAll && <Check size={16} className="text-white" />}
            </div>
            <span className="text-[14px] font-bold text-red-500">
              필수 <Link href="/terms/service"><a className="underline decoration-red-300 underline-offset-4">이용약관</a></Link> 및 <Link href="/terms/privacy"><a className="underline decoration-red-300 underline-offset-4">개인정보 처리방침</a></Link>에 동의합니다
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-10 px-4">
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
          <span className="text-zinc-400 font-bold text-[11px] uppercase tracking-[0.2em]">혹은</span>
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
        </div>

        <button 
          onClick={() => setIsPopupOpen(true)}
          className="w-full h-[72px] bg-white border-2 border-zinc-100 text-zinc-900 font-bold rounded-[24px] shadow-sm flex flex-col items-center justify-center active:scale-[0.97] transition-all"
        >
          <span className="text-[16px]">직접 정보 입력해서 가입하기</span>
          <span className="text-[11px] text-zinc-400 font-medium mt-0.5">아이디, 이메일, 닉네임 직접 설정</span>
        </button>
      </div>

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
              <div className="px-8 pt-10 pb-6 bg-white flex justify-between items-center shrink-0 border-b border-zinc-50">
                <div className="flex flex-col gap-1">
                  <h2 className="font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 1.3}px` }}>
                    {step === 1 ? "필수 정보 입력" : "추가 정보 입력"}
                  </h2>
                  <div className="flex gap-1.5 mt-1">
                    <div className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-8 bg-[#4A6741]' : 'w-2 bg-zinc-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-8 bg-[#4A6741]' : 'w-2 bg-zinc-200'}`} />
                  </div>
                </div>
                <button onClick={() => setIsPopupOpen(false)} className="bg-zinc-100 p-2 rounded-full text-zinc-400 active:scale-90 transition-transform">
                  <X size={24}/>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-4">
                {step === 1 ? (
                  <div className="space-y-2">
                    {/* 아이디 */}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">아이디</span>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("username")} placeholder="사용할 아이디" />
                        <button type="button" onClick={() => checkDuplicate("username")} 
                          className={`shrink-0 px-4 py-2 text-white text-[12px] rounded-xl font-bold transition-all ${usernameStatus === 'success' ? 'bg-[#4A6741]' : 'bg-zinc-900'}`}>
                          {usernameStatus === 'success' ? '확인 완료' : usernameStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>

                    {/* 이메일 */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-6">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">이메일</span>
                        <div className="flex-1 flex items-center gap-1 overflow-hidden">
                          <input {...register("emailId")} className="!w-24 shrink-0" placeholder="email" />
                          <span className="text-zinc-300 font-bold shrink-0">@</span>
                          <div className="flex-1 min-w-0">
                            {showCustomDomain ? (
                              <input {...register("customDomain")} placeholder="직접 입력" autoFocus />
                            ) : (
                              <select 
                                {...register("emailDomain")} 
                                onChange={(e) => {
                                  if (e.target.value === "직접 입력") setShowCustomDomain(true);
                                }}
                                className="w-full truncate"
                              >
                                {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => checkDuplicate("email")} 
                          className={`shrink-0 px-4 py-2 text-white text-[12px] rounded-xl font-bold transition-all ${emailStatus === 'success' ? 'bg-[#4A6741]' : 'bg-zinc-900'}`}>
                          {emailStatus === 'success' ? '확인 완료' : emailStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>

                    {/* 비밀번호 */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">비밀번호</span>
                        <div className="flex-1 flex items-center gap-2">
                          <input {...register("password")} type={showPw ? "text" : "password"} placeholder="8자리 이상" />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300">
                            {showPw ? <EyeOff size={20}/> : <Eye size={20}/>}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">비밀번호 확인</span>
                        <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} placeholder="한 번 더 입력" />
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
                      <div className="flex items-center gap-1.5 w-28 shrink-0">
                        <span className="font-bold text-zinc-400">닉네임</span>
                        <button type="button" onClick={generateNickname} className="text-[#4A6741] p-1 bg-zinc-50 rounded-full active:rotate-180 transition-transform duration-500">
                          <RefreshCw size={14}/>
                        </button>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("nickname")} placeholder="닉네임" />
                        <button type="button" onClick={() => checkDuplicate("nickname")} 
                          className={`shrink-0 px-4 py-2 text-white text-[12px] rounded-xl font-bold transition-all ${nicknameStatus === 'success' ? 'bg-[#4A6741]' : 'bg-zinc-900'}`}>
                          {nicknameStatus === 'success' ? '확인 완료' : nicknameStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>
                    <div className="h-20" />
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">본명</span>
                      <input {...register("fullName")} placeholder="성함" />
                    </div>
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">전화번호</span>
                      <input {...register("phone")} placeholder="010-0000-0000" />
                    </div>
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-6">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">소속 교회</span>
                      <input {...register("church")} placeholder="교회 이름" />
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
                        <div className="mt-4 pl-28">
                          <input {...register("customRank")} placeholder="직분 직접 입력" className="border-b border-zinc-100 py-1" />
                        </div>
                      )}
                    </div>
                    <div className="h-20" />
                  </div>
                )}
              </div>

              {/* 하단 버튼 영역 - 절대 잘리지 않도록 강제 고정 */}
              <div className="px-8 py-8 bg-white border-t border-zinc-100 shrink-0 z-10">
                {step === 1 ? (
                  <button 
                    onClick={() => {
                      if (usernameStatus === 'success' && emailStatus === 'success' && nicknameStatus === 'success' && isPasswordMatch) {
                        setStep(2);
                      } else {
                        setModal({ show: true, title: "입력 확인", msg: "필수 항목 중복 확인 및 비밀번호를 확인해주세요.", type: "error" });
                      }
                    }}
                    className="w-full h-[68px] bg-zinc-900 text-white rounded-[24px] font-black text-[18px] shadow-xl active:scale-[0.98] transition-all"
                  >
                    다음으로 넘어가기
                  </button>
                ) : (
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(1)}
                      className="w-28 h-[68px] bg-zinc-100 text-zinc-400 rounded-[24px] font-bold text-[17px] active:scale-[0.98] transition-all"
                    >
                      이전
                    </button>
                    <button 
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                      className="flex-1 h-[68px] bg-[#4A6741] text-white rounded-[24px] font-black text-[18px] shadow-xl flex items-center justify-center active:scale-[0.98] transition-all disabled:bg-zinc-300"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : "가입 완료하기"}
                    </button>
                  </div>
                )}
                <div className="h-4" /> {/* 기기 하단 바 대응 여백 */}
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
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-black text-zinc-900 text-[20px]">직분을 선택해주세요</h3>
                <button onClick={() => setIsRankModalOpen(false)} className="text-zinc-300"><X size={28}/></button>
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
                    className={`py-4 rounded-2xl border-2 font-bold transition-all ${watch("rank") === r ? 'border-[#4A6741] bg-[#4A6741] text-white' : 'border-zinc-50 bg-zinc-50 text-zinc-500'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 공통 알림 모달 */}
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-10 bg-black/40 backdrop-blur-[4px]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${modal.type === 'success' ? 'bg-[#4A6741]/10 text-[#4A6741]' : 'bg-red-50 text-red-500'}`}>
                {modal.type === 'success' ? <Check size={32} /> : <X size={32} />}
              </div>
              <h3 className="font-black text-[20px] mb-3 text-zinc-900">{modal.title}</h3>
              <p className="text-zinc-500 mb-8 text-[15px] leading-relaxed break-keep">{modal.msg}</p>
              <button 
                onClick={() => {
                  setModal({ ...modal, show: false });
                  if(modal.type === 'success') setLocation("/auth");
                }}
                className="w-full py-5 bg-zinc-900 text-white rounded-[20px] font-black text-[17px] active:scale-[0.98] transition-all"
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
