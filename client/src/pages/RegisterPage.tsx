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
  const { register, handleSubmit, setValue, watch, getValues } = useForm({ mode: "onChange" });
  
  const [step, setStep] = useState(1);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [showCustomRankInput, setShowCustomRankInput] = useState(false);
  
  const [usernameStatus, setUsernameStatus] = useState('none');
  const [emailStatus, setEmailStatus] = useState('none');
  const [nicknameStatus, setNicknameStatus] = useState('success'); // 닉네임은 생성되므로 초기값 완료상태
  
  const [modal, setModal] = useState({ show: false, title: "", msg: "", type: "error" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isAgreedAll, setIsAgreedAll] = useState(false);

  const watchAll = watch();
  const isPasswordMatch = watchAll.passwordConfirm && watchAll.password === watchAll.passwordConfirm;

  // 닉네임 자동 생성
  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
  }, [setValue]);

  useEffect(() => { if(isPopupOpen) generateNickname(); }, [isPopupOpen, generateNickname]);

  // 중복 확인 로직
  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    const values = getValues();
    let value = "";
    if (field === "username") value = values.username?.trim();
    if (field === "nickname") value = values.nickname?.trim();
    if (field === "email") {
      const domain = showCustomDomain ? values.customDomain : values.emailDomain;
      value = `${values.emailId}@${domain}`;
    }
    if (!value) return;
    
    try {
      const { data, error } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (error) throw error;
      const isAvailable = !data;
      
      const setStatus = field === "username" ? setUsernameStatus : field === "nickname" ? setNicknameStatus : setEmailStatus;
      setStatus(isAvailable ? 'success' : 'error');
    } catch (e) { 
      setModal({ show: true, title: "오류", msg: "통신 실패", type: "error" }); 
    }
  };

  const onSubmit = async (values: any) => {
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의해주세요.", type: "error" });
    setIsSubmitting(true);
    try {
      const finalRank = values.rank === "기타" ? values.customRank : values.rank;
      const finalEmail = `${values.emailId}@${showCustomDomain ? values.customDomain : values.emailDomain}`;
      const { error } = await supabase.auth.signUp({
        email: finalEmail, password: values.password,
        options: { data: { username: values.username, nickname: values.nickname, rank: finalRank || "" } }
      });
      if (error) throw error;
      setModal({ show: true, title: "가입 완료", msg: "환영합니다!", type: "success" });
    } catch (error: any) {
      setModal({ show: true, title: "실패", msg: error.message, type: "error" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative text-left overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        input { background-color: transparent !important; color: #4A6741 !important; outline: none; border: none; text-align: left; font-weight: 700; width: 100%; }
        select { appearance: none; background: transparent; border: none; outline: none; }
      `}} />

      {/* 메인 화면 레이아웃 */}
      <header className="px-6 pt-20 pb-4">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400"><ArrowLeft size={24} /></button>
      </header>

      <div className="flex-1 px-8">
        <div className="mt-4 mb-10 text-center">
          <h1 className="font-black text-zinc-900 leading-[1.4]" style={{ fontSize: `${fontSize * 1.3}px` }}>
            3초만에 가입하고<br /><span className="text-[#4A6741]" style={{ fontSize: `${fontSize * 1.6}px` }}>묵상 일기를 남겨보세요</span>
          </h1>
        </div>

        <div className="space-y-6 flex flex-col items-center">
          <button onClick={() => setIsPopupOpen(true)} className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-sm flex items-center justify-center gap-3">
             <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />카카오로 3초만에 가입하기
          </button>
          
          <button onClick={() => setIsPopupOpen(true)} className="w-full h-16 bg-white border-2 border-zinc-100 text-zinc-900 font-bold rounded-[22px] shadow-sm">
             직접 정보 입력해서 가입하기
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isPopupOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPopupOpen(false)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[110] flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
              
              <div className="px-8 pt-10 pb-4 flex justify-between items-center relative">
                <h2 className="font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 1.3}px` }}>{step === 1 ? "필수 입력" : "선택 입력"}</h2>
                <button onClick={() => setIsPopupOpen(false)} className="text-zinc-300"><X size={28}/></button>
                <div className="flex gap-1.5 absolute top-10 left-1/2 -translate-x-1/2">
                   <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-[#4A6741]' : 'bg-zinc-200'}`} />
                   <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-[#4A6741]' : 'bg-zinc-200'}`} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-32">
                {step === 1 ? (
                  <div className="space-y-1">
                    {/* 아이디 */}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-5">
                      <span className="font-bold text-zinc-400 shrink-0 w-28">아이디</span>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("username")} onChange={() => setUsernameStatus('none')} />
                        <button type="button" onClick={() => checkDuplicate("username")} 
                          className={`shrink-0 px-3 py-1.5 text-white text-[11px] rounded-lg font-bold transition-all ${usernameStatus === 'success' ? 'bg-[#4A6741]' : 'bg-zinc-900'}`}>
                          {usernameStatus === 'success' ? '확인 완료' : usernameStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>

                    {/* 이메일 영역: 레이아웃 최적화 */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">이메일</span>
                        <div className="flex-1 flex items-center gap-1">
                          <input {...register("emailId")} className="!w-24 shrink-0" onChange={() => setEmailStatus('none')} />
                          <span className="text-zinc-300 text-xs shrink-0">@</span>
                          <div className="flex-1">
                            {showCustomDomain ? <input {...register("customDomain")} autoFocus onChange={() => setEmailStatus('none')} /> : 
                            <select {...register("emailDomain")} onChange={e => { setEmailStatus('none'); if(e.target.value === "직접 입력") setShowCustomDomain(true); }} className="w-full font-bold text-[#4A6741]">
                              {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>}
                          </div>
                        </div>
                        <button type="button" onClick={() => checkDuplicate("email")} 
                          className={`shrink-0 px-3 py-1.5 text-white text-[11px] rounded-lg font-bold ${emailStatus === 'success' ? 'bg-[#4A6741]' : 'bg-zinc-900'}`}>
                          {emailStatus === 'success' ? '확인 완료' : emailStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>

                    {/* 비밀번호 영역: 라인 정렬 */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">비밀번호</span>
                        <div className="flex-1 flex items-center gap-2">
                          <input {...register("password")} type={showPw ? "text" : "password"} />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 shrink-0">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">비밀번호 확인</span>
                        <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} />
                      </div>
                      <div className="pl-28 mt-2"> {/* 비밀번호 필드 시작점과 라인 맞춤 */}
                        {watchAll.passwordConfirm && (
                          <p className={`text-[11px] font-bold ${isPasswordMatch ? 'text-[#4A6741]' : 'text-red-500'}`}>
                            {isPasswordMatch ? "✓ 비밀번호가 일치합니다." : "✕ 비밀번호가 일치하지 않습니다."}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 닉네임: 초기 완료상태, 수정 시 중복확인으로 변경 */}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-5">
                      <div className="flex items-center gap-1 w-28 shrink-0">
                        <span className="font-bold text-zinc-400">닉네임</span>
                        <button type="button" onClick={generateNickname} className="text-zinc-300"><RefreshCw size={12}/></button>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("nickname")} onChange={() => setNicknameStatus('none')} />
                        <button type="button" onClick={() => checkDuplicate("nickname")} 
                          className={`shrink-0 px-3 py-1.5 text-white text-[11px] rounded-lg font-bold ${nicknameStatus === 'success' ? 'bg-[#4A6741]' : 'bg-zinc-900'}`}>
                          {nicknameStatus === 'success' ? '확인 완료' : nicknameStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 pt-4">
                    {["fullName", "phone", "church"].map(id => (
                      <div key={id} className="flex items-center justify-between border-b-2 border-zinc-50 py-5">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">{id === "fullName" ? "본명" : id === "phone" ? "전화번호" : "소속 교회"}</span>
                        <input {...register(id as any)} />
                      </div>
                    ))}
                    
                    <div className="flex flex-col border-b-2 border-zinc-50 py-5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-28">직분</span>
                        <button type="button" onClick={() => setIsRankModalOpen(true)} className="flex-1 text-left font-bold text-[#4A6741] flex items-center justify-between">
                          {watch("rank") || "선택하기"} <ChevronRight size={16} className="text-zinc-300"/>
                        </button>
                      </div>
                      {showCustomRankInput && (
                        <div className="mt-4 pl-28"><input {...register("customRank")} placeholder="직접 입력" className="border-b border-zinc-100 py-1" /></div>
                      )}
                    </div>

                    {/* 약관 동의 영역: 글자 크기 확대 및 디자인 적용 */}
                    <div className="pt-12 pb-6 text-center">
                      <button type="button" onClick={() => setIsAgreedAll(!isAgreedAll)} className="flex items-center justify-center gap-2 mx-auto">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isAgreedAll ? 'bg-red-500' : 'border-2 border-red-200'}`}>
                          {isAgreedAll && <Check size={14} className="text-white" />}
                        </div>
                        <span className="font-bold text-red-500" style={{ fontSize: `${fontSize * 0.9}px` }}>
                          필수 <Link href="/terms/service"><a className="underline">이용약관</a></Link> 및 <Link href="/terms/privacy"><a className="underline">개인정보 처리방침</a></Link>에 동의합니다
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 하단 고정 버튼 영역 */}
              <div className="p-8 pb-12 bg-white border-t border-zinc-50 sticky bottom-0">
                {step === 1 ? (
                  <button onClick={() => setStep(2)} className="w-full h-[64px] bg-zinc-900 text-white rounded-[24px] font-black shadow-lg">다음 단계로</button>
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
              <div className="flex justify-between items-center mb-8"><h3 className="font-black text-zinc-900">직분 선택</h3><button onClick={() => setIsRankModalOpen(false)}><X size={24}/></button></div>
              <div className="flex flex-wrap gap-3">
                {ranks.map(r => (
                  <button key={r} onClick={() => { setValue("rank", r); setShowCustomRankInput(r === "기타"); setIsRankModalOpen(false); }} className="px-5 py-3 rounded-2xl border-2 border-zinc-100 font-bold text-zinc-500 active:bg-[#4A6741] active:text-white transition-all">{r}</button>
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
              <h3 className="font-black mb-2">{modal.title}</h3>
              <p className="text-zinc-500 mb-6 text-sm break-keep">{modal.msg}</p>
              <button onClick={() => { setModal({ ...modal, show: false }); if(modal.type === 'success') setLocation("/auth"); }} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
