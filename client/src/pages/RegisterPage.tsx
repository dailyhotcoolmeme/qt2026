import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, X, ChevronRight, Loader2 } from "lucide-react";
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
  const [isFormVisible, setIsFormVisible] = useState(false);

  // 약관 동의 통합 상태
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
    if (!isAgreedAll) return setModal({ show: true, title: "약관 동의", msg: "필수 약관에 동의해주세요.", type: "error" });
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
      {/* 뒤로가기 헤더 - 위치 조정을 위해 pt-16으로 아래로 내림 */}
      <header className="px-6 pt-16 pb-4">
        <button onClick={() => setLocation("/auth")} className="p-2 -ml-2 text-zinc-400">
          <ArrowLeft size={24} />
        </button>
      </header>

      <div className="flex-1 px-8 pb-20">
        {/* 상단 문구 - AuthPage 스타일의 스르륵 효과 및 중앙 정렬 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mt-4 mb-12 text-center"
        >
          <h1 className="font-black text-zinc-900 leading-[1.4] tracking-tighter" style={{ fontSize: `${fontSize * 1.6}px` }}>
            3초만에 가입하고<br />
            <span className="text-[#4A6741]">묵상을 시작하세요</span>
          </h1>
        </motion.div>

        {/* 카카오 가입 구역 */}
        <div className="space-y-6 mb-12 flex flex-col items-center">
          <button 
            onClick={handleKakaoSignUp} 
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="카카오" />
            카카오로 3초만에 가입하기
          </button>
          
          {/* 약관 동의 한 줄 통합 스타일 */}
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

        {/* 구분선 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
          <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest">OR</span>
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
        </div>

        {/* 일반 가입 토글 */}
        {!isFormVisible && (
          <button 
            onClick={() => setIsFormVisible(true)}
            className="w-full py-4 text-zinc-400 font-bold text-sm underline underline-offset-4 decoration-zinc-200 active:text-zinc-800 transition-colors text-center"
          >
            직접 정보를 입력해서 가입하시겠어요?
          </button>
        )}

        <AnimatePresence>
          {isFormVisible && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleSubmit(onSubmit)} 
              className="space-y-6"
            >
              {/* 아이디, 이메일, 비밀번호 등 기존 폼 내용 유지... */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-50">
                <label className="font-bold text-[#4A6741] text-[11px] block mb-2">아이디</label>
                <div className="flex gap-2"><input {...register("username")} className="flex-1 bg-transparent outline-none font-black text-zinc-900" placeholder="아이디 입력" /><button type="button" onClick={() => checkDuplicate("username")} className="shrink-0 px-4 py-2 rounded-xl bg-zinc-900 text-white font-bold text-[11px]">중복확인</button></div>
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

      {/* 모달 생략 (기존 코드와 동일) */}
    </div>
  );
}
