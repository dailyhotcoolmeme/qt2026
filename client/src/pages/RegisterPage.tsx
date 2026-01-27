import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch, getValues } = useForm({ mode: "onChange" });
  
  const [usernameStatus, setUsernameStatus] = useState('none');
  const [emailStatus, setEmailStatus] = useState('none');
  const [nicknameStatus, setNicknameStatus] = useState('none');
  
  const [modal, setModal] = useState({ show: false, title: "", msg: "", type: "error" });
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [isAgreedAll, setIsAgreedAll] = useState(false);
  const watchAll = watch();
  const isPasswordMatch = watchAll.password && watchAll.password.length >= 8 && watchAll.password === watchAll.passwordConfirm;

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('none');
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
      setModal({ show: true, title: isAvailable ? "확인 완료" : "중복", msg: isAvailable ? "사용 가능합니다." : "이미 사용 중입니다.", type: isAvailable ? "success" : "error" });
    } catch (e) { setModal({ show: true, title: "오류", msg: "통신 실패", type: "error" }); }
  };

  const handleKakaoSignUp = async () => {
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의하셔야 가입이 가능합니다.", type: "error" });
    await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: window.location.origin } });
  };

  const onSubmit = async (values: any) => {
    setAttemptedSubmit(true);
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의해주세요.", type: "error" });
    if (usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success') {
      return setModal({ show: true, title: "확인 필요", msg: "중복 확인을 모두 완료해주세요.", type: "error" });
    }
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
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px white inset !important; -webkit-text-fill-color: #4A6741 !important; }
        input { background-color: transparent !important; color: #4A6741 !important; }
      `}} />

      {/* 직분 선택 커스텀 팝업 */}
      <AnimatePresence>
        {isRankModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRankModalOpen(false)} className="fixed inset-0 bg-black/40 z-[110] backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[120] px-8 pt-10 pb-16 shadow-2xl">
              <div className="flex justify-between items-center mb-8"><h3 className="font-black text-zinc-900" style={{ fontSize: `${fontSize * 1.2}px` }}>직분 선택</h3><button onClick={() => setIsRankModalOpen(false)} className="text-zinc-400 p-2"><X size={24}/></button></div>
              <div className="flex flex-wrap gap-3">
                {ranks.map(r => (
                  <button key={r} onClick={() => { setValue("rank", r); setShowCustomRank(false); setIsRankModalOpen(false); }} className="px-5 py-3 rounded-2xl border-2 border-zinc-100 font-bold text-zinc-500 active:bg-[#4A6741] active:text-white active:border-[#4A6741] transition-all">
                    {r}
                  </button>
                ))}
                <button onClick={() => { setShowCustomRank(true); setIsRankModalOpen(false); }} className="px-5 py-3 rounded-2xl border-2 border-zinc-100 font-bold text-zinc-400 italic">직접 입력</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header className="px-6 pt-20 pb-10 flex items-center">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400 shrink-0"><ArrowLeft size={24} /></button>
      </header>

      <div className="flex-1 px-8 pb-20 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 mb-12 text-center">
          <h1 className="font-black text-zinc-900 leading-[1.4] tracking-tighter" style={{ fontSize: `${fontSize * 1.2}px` }}>
            3초만에 가입하고<br />
            <span className="text-[#4A6741]" style={{ fontSize: `${fontSize * 1.6}px` }}>묵상 일기를 남겨보세요</span>
          </h1>
        </motion.div>

        <div className="space-y-6 mb-12 flex flex-col items-center">
          <button onClick={handleKakaoSignUp} className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all">
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
            카카오로 3초만에 가입하기
          </button>
          <button type="button" onClick={() => setIsAgreedAll(!isAgreedAll)} className="flex items-center gap-2">
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

        {!isFormVisible && (
          <button onClick={() => setIsFormVisible(true)} className="w-full py-4 text-zinc-400 font-bold text-sm underline underline-offset-4 decoration-zinc-200 text-center">
            직접 가입하기 (아이디, 닉네임, 이메일 등록)
          </button>
        )}

        <AnimatePresence>
          {isFormVisible && (
            <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
              
              {/* [필수 입력 영역] */}
              <div className="flex flex-col gap-4">
                <p className="font-black text-[#4A6741] px-2" style={{ fontSize: `${fontSize * 1.15}px` }}>필수 입력</p>
                <div className="bg-white rounded-[32px] p-6 shadow-sm space-y-7">
                  {/* 아이디 */}
                  <div className={`transition-all rounded-2xl ${attemptedSubmit && usernameStatus !== 'success' ? 'bg-red-50 p-2' : ''}`}>
                    <label className="font-bold text-zinc-400 block mb-1 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>아이디</label>
                    <div className="flex items-center gap-2 border-b-2 border-zinc-100 focus-within:border-[#4A6741] pb-1 mr-1">
                      <input {...register("username")} className="flex-1 min-w-0 outline-none font-black" placeholder="아이디 입력" />
                      <button type="button" onClick={() => checkDuplicate("username")} className="shrink-0 px-4 py-1.5 rounded-xl bg-zinc-900 text-white font-bold text-[11px]">중복확인</button>
                    </div>
                  </div>

                  {/* 이메일 */}
                  <div className={`transition-all rounded-2xl ${attemptedSubmit && emailStatus !== 'success' ? 'bg-red-50 p-2' : ''}`}>
                    <label className="font-bold text-zinc-400 block mb-2 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>이메일</label>
                    <div className="flex items-center gap-2 mb-3">
                      <input {...register("emailId")} className="flex-1 min-w-0 bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none text-[#4A6741]" placeholder="이메일" />
                      <span className="text-zinc-400 shrink-0">@</span>
                      <div className="flex-1 min-w-0">
                        {showCustomDomain ? <input {...register("customDomain")} autoFocus className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" /> : 
                        <select {...register("emailDomain")} onChange={e => e.target.value === "직접 입력" && setShowCustomDomain(true)} className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold appearance-none outline-none text-[#4A6741]">{emailDomains.map(d => <option key={d} value={d}>{d}</option>)}</select>}
                      </div>
                    </div>
                    <button type="button" onClick={() => checkDuplicate("email")} className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-500 font-bold text-[12px]">이메일 중복확인</button>
                  </div>

                  {/* 비밀번호 */}
                  <div className={`transition-all rounded-2xl ${attemptedSubmit && !isPasswordMatch ? 'bg-red-50 p-2' : ''}`}>
                    <label className="font-bold text-zinc-400 block mb-1 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>비밀번호</label>
                    <div className="space-y-4">
                      <div className="flex items-center border-b-2 border-zinc-100 focus-within:border-[#4A6741] pb-1 mr-1">
                        <input {...register("password")} type={showPw ? "text" : "password"} className="flex-1 min-w-0 outline-none font-bold" placeholder="8자 이상 입력" />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 px-2 shrink-0">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                      </div>
                      <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} className="w-full bg-transparent border-b-2 border-zinc-100 focus:border-[#4A6741] outline-none font-bold pb-1" placeholder="비밀번호 다시 입력" />
                    </div>
                  </div>

                  {/* 닉네임 */}
                  <div className={`transition-all rounded-2xl ${attemptedSubmit && nicknameStatus !== 'success' ? 'bg-red-50 p-2' : ''}`}>
                    <div className="flex justify-between items-center mb-1 px-1">
                      <label className="font-bold text-zinc-400" style={{ fontSize: `${fontSize * 0.8}px` }}>닉네임</label>
                      <button type="button" onClick={generateNickname} className="text-zinc-300"><RefreshCw size={14}/></button>
                    </div>
                    <div className="flex items-center gap-2 border-b-2 border-zinc-100 focus-within:border-[#4A6741] pb-1 mr-1">
                      <input {...register("nickname")} className="flex-1 min-w-0 outline-none font-black !text-[#4A6741]" />
                      <button type="button" onClick={() => checkDuplicate("nickname")} className="shrink-0 px-4 py-1.5 rounded-xl bg-[#4A6741] text-white font-bold text-[11px]">중복확인</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* [선택 입력 영역] */}
              <div className="flex flex-col gap-4">
                <p className="font-black text-zinc-900 px-2" style={{ fontSize: `${fontSize * 1.15}px` }}>선택 입력</p>
                <div className="bg-white rounded-[32px] p-6 shadow-sm divide-y divide-zinc-50">
                  {[ { id: "fullName", label: "본명" }, { id: "phone", label: "전화번호" }, { id: "rank", label: "직분" }, { id: "church", label: "소속 교회" } ].map(item => (
                    <div key={item.id} className="flex items-center justify-between py-5 gap-4">
                      <span className="font-bold text-zinc-400 shrink-0" style={{ fontSize: `${fontSize * 0.85}px` }}>{item.label}</span>
                      {item.id === "rank" ? (
                        showCustomRank ? <input {...register("rank")} className="text-right outline-none font-bold bg-transparent" placeholder="직접 입력" /> :
                        <button type="button" onClick={() => setIsRankModalOpen(true)} className="text-right font-bold text-[#4A6741]">{watch("rank") || "선택하기"}</button>
                      ) : <input {...register(item.id)} className="flex-1 text-right outline-none font-bold bg-transparent text-zinc-800" placeholder="입력" />}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full h-[64px] shrink-0 bg-[#4A6741] text-white rounded-[28px] font-black shadow-xl active:scale-95 transition-all mt-6 flex items-center justify-center">
                {isSubmitting ? <Loader2 className="animate-spin" /> : "가입하기"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* 기본 안내 모달 */}
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <h3 className="font-black mb-2" style={{ fontSize: `${fontSize * 1.1}px` }}>{modal.title}</h3>
              <p className="text-zinc-500 mb-6 text-sm">{modal.msg}</p>
              <button onClick={() => { setModal({ ...modal, show: false }); if(modal.type === 'success' && modal.title === "가입 완료") setLocation("/auth"); }} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
