import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "직접 입력"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch, getValues, trigger } = useForm({ mode: "onChange" });
  
  const [usernameStatus, setUsernameStatus] = useState('none');
  const [emailStatus, setEmailStatus] = useState('none');
  const [nicknameStatus, setNicknameStatus] = useState('none');
  const [msgs, setMsgs] = useState({ username: '', email: '', nickname: '' });
  
  const [modal, setModal] = useState({ show: false, title: "", msg: "", type: "error" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false); // 가입 시도 여부 (음영 표시용)

  const [isAgreedAll, setIsAgreedAll] = useState(false);
  const watchAll = watch();
  const isPasswordMatch = watchAll.password && watchAll.password.length >= 8 && watchAll.password === watchAll.passwordConfirm;

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
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
    if (!isAgreedAll) {
      return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의하셔야 가입이 가능합니다.", type: "error" });
    }
    await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: window.location.origin } });
  };

  const onSubmit = async (values: any) => {
    setAttemptedSubmit(true);
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의해주세요.", type: "error" });
    
    // 필수 조건 체크
    const isIdOk = usernameStatus === 'success';
    const isEmailOk = emailStatus === 'success';
    const isNickOk = nicknameStatus === 'success';
    const isPwOk = isPasswordMatch;

    if (!isIdOk || !isEmailOk || !isNickOk || !isPwOk) {
      return setModal({ show: true, title: "입력 확인", msg: "빨간색으로 표시된 필수 항목을 확인해 주세요.", type: "error" });
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
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.type === 'success' ? 'bg-green-50 text-[#4A6741]' : 'bg-red-50 text-red-500'}`}><AlertCircle size={24} /></div>
              <h3 className="font-black mb-2">{modal.title}</h3>
              <p className="text-zinc-500 mb-6 text-sm leading-relaxed">{modal.msg}</p>
              <button onClick={() => { setModal({ ...modal, show: false }); if(modal.type === 'success') setLocation("/auth"); }} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-20 pb-10">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400"><ArrowLeft size={24} /></button>
      </header>

      <div className="flex-1 px-8 pb-20">
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
          
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsAgreedAll(!isAgreedAll)} className="flex items-center gap-2 group">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${isAgreedAll ? 'bg-[#4A6741]' : 'border-2 border-zinc-200 bg-white'}`}>
                {isAgreedAll && <Check size={14} className="text-white" />}
              </div>
              <span className="text-[13px] font-bold text-zinc-500">
                필수 <Link href="/terms/service"><a className="underline decoration-zinc-300 underline-offset-2">이용약관</a></Link> 및 <Link href="/terms/privacy"><a className="underline decoration-zinc-300 underline-offset-2">개인정보 처리방침</a></Link>에 동의합니다
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
          <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest">혹은</span>
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
        </div>

        {!isFormVisible && (
          <button onClick={() => setIsFormVisible(true)} className="w-full py-4 text-zinc-400 font-bold text-sm underline underline-offset-4 decoration-zinc-200 active:text-zinc-800 transition-colors text-center">
            직접 가입하기 (아이디, 닉네임, 이메일 등록)
          </button>
        )}

        <AnimatePresence>
          {isFormVisible && (
            <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              {/* [필수 입력 영역] */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm space-y-8">
                <p className="text-[#4A6741] font-black text-[12px] px-1">필수 정보</p>
                
                {/* 아이디 */}
                <div className={`transition-all rounded-2xl p-2 ${attemptedSubmit && usernameStatus !== 'success' ? 'bg-red-50' : ''}`}>
                  <label className="font-bold text-zinc-400 text-[11px] block mb-2 px-1">아이디</label>
                  <div className="flex gap-2">
                    <input {...register("username")} className="flex-1 bg-transparent border-b-2 border-zinc-100 focus:border-[#4A6741] outline-none font-black text-zinc-900 pb-2 ml-1" placeholder="아이디" />
                    <button type="button" onClick={() => checkDuplicate("username")} className="shrink-0 px-4 py-2 rounded-xl bg-zinc-900 text-white font-bold text-[11px]">확인</button>
                  </div>
                </div>

                {/* 이메일 */}
                <div className={`transition-all rounded-2xl p-2 ${attemptedSubmit && emailStatus !== 'success' ? 'bg-red-50' : ''}`}>
                  <label className="font-bold text-zinc-400 text-[11px] block mb-2 px-1">이메일</label>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <input {...register("emailId")} className="w-[45%] bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" placeholder="이메일" /><span className="text-zinc-400">@</span>
                    <div className="flex-1">
                      {showCustomDomain ? <input {...register("customDomain")} autoFocus className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" /> : 
                      <select {...register("emailDomain")} onChange={e => e.target.value === "직접 입력" && setShowCustomDomain(true)} className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold appearance-none outline-none">{emailDomains.map(d => <option key={d} value={d}>{d}</option>)}</select>}
                    </div>
                  </div>
                  <button type="button" onClick={() => checkDuplicate("email")} className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-500 font-bold text-[12px]">이메일 중복확인</button>
                </div>

                {/* 비밀번호 */}
                <div className={`transition-all rounded-2xl p-2 ${attemptedSubmit && !isPasswordMatch ? 'bg-red-50' : ''}`}>
                  <label className="font-bold text-zinc-400 text-[11px] block mb-2 px-1">비밀번호</label>
                  <div className="space-y-4 px-1">
                    <div className="flex border-b-2 border-zinc-100 focus-within:border-[#4A6741] pb-2 relative">
                      <input {...register("password")} type={showPw ? "text" : "password"} className="flex-1 bg-transparent outline-none font-bold" placeholder="8자 이상" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 pr-2">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                    </div>
                    <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} className="w-full bg-transparent border-b-2 border-zinc-100 focus:border-[#4A6741] outline-none font-bold pb-2" placeholder="비밀번호 확인" />
                  </div>
                </div>

                {/* 닉네임 */}
                <div className={`transition-all rounded-2xl p-2 ${attemptedSubmit && nicknameStatus !== 'success' ? 'bg-red-50' : ''}`}>
                  <div className="flex justify-between items-center mb-2 px-1"><label className="font-bold text-zinc-400 text-[11px]">닉네임</label><button type="button" onClick={generateNickname} className="text-zinc-400"><RefreshCw size={14}/></button></div>
                  <div className="flex gap-2 px-1">
                    <input {...register("nickname")} className="flex-1 bg-transparent border-b-2 border-zinc-100 focus:border-[#4A6741] outline-none font-black text-[#4A6741] pb-2" />
                    <button type="button" onClick={() => checkDuplicate("nickname")} className="shrink-0 px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-[11px]">확인</button>
                  </div>
                </div>
              </div>

              {/* [선택 입력 영역] */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm divide-y divide-zinc-50">
                <p className="text-zinc-400 font-black text-[12px] px-1 mb-4">선택 정보 (선택사항)</p>
                {[ { id: "fullName", label: "본명" }, { id: "phone", label: "전화번호" }, { id: "rank", label: "직분", type: "select" }, { id: "church", label: "소속 교회" } ].map(item => (
                  <div key={item.id} className="flex items-center justify-between px-1 py-5 gap-4">
                    <span className="font-bold text-zinc-400 text-[13px] shrink-0">{item.label}</span>
                    {item.id === "rank" ? (
                      showCustomRank ? <input {...register("rank")} className="text-right outline-none font-bold text-[#4A6741] bg-transparent" /> :
                      <select {...register("rank")} onChange={e => e.target.value === "직접 입력" && setShowCustomRank(true)} className="text-right outline-none font-bold bg-transparent appearance-none text-[#4A6741]"><option value="">선택</option>{ranks.map(r => <option key={r} value={r}>{r}</option>)}</select>
                    ) : <input {...register(item.id)} className="w-full text-right outline-none font-bold text-zinc-800 bg-transparent px-0" placeholder="입력" />}
                  </div>
                ))}
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full h-18 bg-[#4A6741] text-white rounded-[28px] font-black shadow-xl active:scale-95 transition-all mt-6">
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "가입하기"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
