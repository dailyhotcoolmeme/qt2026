import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { 
  RefreshCw, 
  ArrowLeft, 
  Check, 
  Eye, 
  EyeOff, 
  Loader2, 
  X, 
  ChevronRight,
  User,
  Mail,
  Lock,
  Smartphone,
  Church,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

/** * 가입 단계 및 텍스트 데이터 
 */
const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "기타"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  
  // React Hook Form 초기화 (모든 필드 명시)
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
  
  // 상태 관리
  const [step, setStep] = useState(1);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [showCustomRankInput, setShowCustomRankInput] = useState(false);
  
  // 중복 확인 상태 (none: 미확인, success: 확인 완료, error: 사용 불가)
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'success' | 'error'>('none');
  const [emailStatus, setEmailStatus] = useState<'none' | 'success' | 'error'>('none');
  const [nicknameStatus, setNicknameStatus] = useState<'none' | 'success' | 'error'>('success'); 
  
  // 공통 모달 상태
  const [modal, setModal] = useState({ 
    show: false, 
    title: "", 
    msg: "", 
    type: "error" as "error" | "success" 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isAgreedAll, setIsAgreedAll] = useState(false);

  // 실시간 값 감시
  const watchAll = watch();
  const isPasswordMatch = watchAll.passwordConfirm && watchAll.password === watchAll.passwordConfirm;

  /**
   * 랜덤 닉네임 생성 함수
   */
  const generateNickname = useCallback(() => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 899 + 100);
    const nick = `${adj}${noun}${num}`;
    setValue("nickname", nick);
    setNicknameStatus('success');
  }, [setValue]);

  /**
   * 바텀시트 오픈 시 닉네임 자동 생성
   */
  useEffect(() => {
    if (isPopupOpen && !getValues("nickname")) {
      generateNickname();
    }
  }, [isPopupOpen, generateNickname, getValues]);

  /**
   * 입력값 변경 시 중복확인 상태 초기화
   */
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'username') setUsernameStatus('none');
      if (name === 'nickname') setNicknameStatus('none');
      if (name === 'emailId' || name === 'emailDomain' || name === 'customDomain') {
        setEmailStatus('none');
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  /**
   * 중복 확인 로직 (모달 연동)
   */
  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    const values = getValues();
    let value = "";
    
    if (field === "username") value = values.username?.trim();
    if (field === "nickname") value = values.nickname?.trim();
    if (field === "email") {
      const domain = showCustomDomain ? values.customDomain : values.emailDomain;
      value = `${values.emailId}@${domain}`;
    }
    
    if (!value || (field === "email" && !values.emailId)) {
      setModal({ 
        show: true, 
        title: "입력 알림", 
        msg: "확인할 정보를 먼저 입력해주세요.", 
        type: "error" 
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq(field, value)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setModal({ 
          show: true, 
          title: "중복 확인", 
          msg: `이미 등록된 정보입니다. (사용 불가)`, 
          type: "error" 
        });
        if (field === "username") setUsernameStatus('error');
        if (field === "nickname") setNicknameStatus('error');
        if (field === "email") setEmailStatus('error');
      } else {
        setModal({ 
          show: true, 
          title: "중복 확인", 
          msg: "사용 가능한 정보입니다.", 
          type: "success" 
        });
        if (field === "username") setUsernameStatus('success');
        if (field === "nickname") setNicknameStatus('success');
        if (field === "email") setEmailStatus('success');
      }
    } catch (e) {
      setModal({ 
        show: true, 
        title: "오류 발생", 
        msg: "서버와 통신 중 문제가 발생했습니다.", 
        type: "error" 
      });
    }
  };

  /**
   * 카카오 가입 핸들러
   */
  const handleKakaoLogin = async () => {
    if (!isAgreedAll) {
      setModal({ 
        show: true, 
        title: "약관 동의", 
        msg: "필수 이용약관에 동의하셔야 시작할 수 있습니다.", 
        type: "error" 
      });
      return;
    }
    await supabase.auth.signInWithOAuth({ 
      provider: 'kakao',
      options: { redirectTo: window.location.origin }
    });
  };

  /**
   * 최종 폼 제출 (회원가입)
   */
  const onSubmit = async (data: any) => {
    if (usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success') {
      setModal({ show: true, title: "확인 필요", msg: "중복 확인이 완료되지 않은 항목이 있습니다.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
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
            rank: data.rank === "기타" ? data.customRank : data.rank
          }
        }
      });

      if (error) throw error;
      setModal({ show: true, title: "가입 완료", msg: "정상적으로 가입되었습니다! 환영합니다.", type: "success" });
    } catch (error: any) {
      setModal({ show: true, title: "가입 실패", msg: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col relative text-left overflow-x-hidden">
      {/* 전역 스타일 주입 */}
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0px 1000px white inset !important; -webkit-text-fill-color: #4A6741 !important; }
        input { background-color: transparent !important; color: #4A6741 !important; outline: none; border: none; font-weight: 700; width: 100%; font-size: 16px; }
        select { appearance: none; background: transparent; border: none; outline: none; font-weight: 700; color: #4A6741; cursor: pointer; width: 100%; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .mask-fade-top {
          mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
        }
      `}} />

      {/* 헤더 바 */}
      <header className="px-6 pt-16 pb-6 relative z-30">
        <button 
          onClick={() => setLocation("/auth")} 
          className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600 transition-all active:scale-90"
        >
          <ArrowLeft size={28} />
        </button>
      </header>

      {/* 메인 랜딩 영역 */}
      <div className="flex-1 px-8 relative">
        {/* '스르륵' 효과를 위한 마스킹 배경 레이어 */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#F8F8F8] via-[#F8F8F8]/90 to-transparent z-10 pointer-events-none" />
        
        <div className="mt-8 mb-14 text-center relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-black text-zinc-900 leading-[1.45]" style={{ fontSize: `${fontSize * 1.25}px` }}>
              3초만에 가입하고<br />
              <span className="text-[#4A6741]" style={{ fontSize: `${fontSize * 1.65}px` }}>
                신앙 기록을 보관하세요
              </span>
            </h1>
          </motion.div>
        </div>

        {/* 소셜 가입 및 약관 동의 */}
        <div className="space-y-6 mb-12 flex flex-col items-center relative z-20">
          <button 
            onClick={handleKakaoLogin}
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-[22px] shadow-sm flex items-center justify-center gap-3 active:scale-[0.97] transition-all"
          >
            <img 
              src="/kakao-login.png" 
              className="w-6 h-6" 
              alt="카카오" 
            />
            카카오로 3초만에 가입하기
          </button>
          
          <button 
            type="button" 
            onClick={() => setIsAgreedAll(!isAgreedAll)}
            className="flex items-center justify-center gap-2 group"
          >
            <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isAgreedAll ? 'bg-[#4A6741] border-[#4A6741]' : 'border-2 border-zinc-200 bg-white'}`}>
              {isAgreedAll && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-[13px] font-bold text-zinc-500">
              필수 <Link href="/terms/service"><a className="underline decoration-zinc-300 underline-offset-4 font-bold text-zinc-600 hover:text-[#4A6741]">이용약관</a></Link> 및 <Link href="/terms/privacy"><a className="underline decoration-zinc-300 underline-offset-4 font-bold text-zinc-600 hover:text-[#4A6741]">개인정보 처리방침</a></Link>에 동의합니다
            </span>
          </button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-4 mb-10 px-4 relative z-20">
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
          <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">OR</span>
          <div className="h-[1px] flex-1 bg-zinc-200"></div>
        </div>

        {/* 일반 가입 버튼 */}
        <button 
          onClick={() => setIsPopupOpen(true)}
          className="w-full h-[80px] bg-white border-2 border-zinc-100 text-zinc-900 font-bold rounded-[26px] shadow-sm flex flex-col items-center justify-center active:scale-[0.97] transition-all relative z-20"
        >
          <span className="text-[17px]">직접 정보 입력해서 가입하기</span>
          <span className="text-[11px] text-zinc-400 font-medium mt-1">아이디, 이메일, 닉네임 직접 설정</span>
        </button>
      </div>

      {/* 가입 입력 바텀시트 (전체 덮기 금지, 상단 여백 유지) */}
      <AnimatePresence>
        {isPopupOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsPopupOpen(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-[4px]" 
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[45px] z-[110] flex flex-col h-[92vh] shadow-2xl overflow-hidden"
            >
              {/* 바텀시트 내부 헤더 */}
              <div className="px-10 pt-12 pb-6 bg-white flex justify-between items-start shrink-0">
                <div className="flex flex-col gap-2">
                  <h2 className="font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 1.4}px` }}>
                    {step === 1 ? "필수 정보 입력" : "추가 정보 입력"}
                  </h2>
                  <div className="flex gap-2">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 1 ? 'w-12 bg-[#4A6741]' : 'w-3 bg-zinc-100'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 2 ? 'w-12 bg-[#4A6741]' : 'w-3 bg-zinc-100'}`} />
                  </div>
                </div>
                <button 
                  onClick={() => setIsPopupOpen(false)} 
                  className="bg-zinc-50 p-3 rounded-full text-zinc-300 hover:text-zinc-500 transition-colors"
                >
                  <X size={28}/>
                </button>
              </div>

              {/* 입력 폼 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto px-10 py-4 no-scrollbar pb-52">
                {step === 1 ? (
                  <div className="space-y-2">
                    {/* 아이디 필드 */}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-7">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <User size={18} className="text-zinc-300" />
                        <span className="font-bold text-zinc-400">아이디</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("username")} placeholder="아이디 입력" />
                        <button 
                          type="button" 
                          onClick={() => checkDuplicate("username")}
                          className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-[12px] transition-all duration-300 ${
                            usernameStatus === 'success' ? 'bg-[#4A6741] text-white' : 'bg-zinc-900 text-white active:scale-95'
                          }`}
                        >
                          {usernameStatus === 'success' ? '확인 완료' : usernameStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>

                    {/* 이메일 필드 (중복확인 하단 배치) */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-7">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 w-32 shrink-0">
                          <Mail size={18} className="text-zinc-300" />
                          <span className="font-bold text-zinc-400">이메일</span>
                        </div>
                        <div className="flex-1 flex items-center gap-1.5">
                          <input {...register("emailId")} className="!w-24 shrink-0" placeholder="이메일" />
                          <span className="text-zinc-300 font-black">@</span>
                          <div className="flex-1 min-w-0">
                            {showCustomDomain ? (
                              <input {...register("customDomain")} autoFocus placeholder="직접 입력" />
                            ) : (
                              <select 
                                {...register("emailDomain")} 
                                className="truncate"
                                onChange={(e) => { if (e.target.value === "직접 입력") setShowCustomDomain(true); }}
                              >
                                {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <button 
                          type="button" 
                          onClick={() => checkDuplicate("email")}
                          className={`px-7 py-2.5 rounded-xl font-bold text-[12px] transition-all duration-300 ${
                            emailStatus === 'success' ? 'bg-[#4A6741] text-white' : 'bg-zinc-900 text-white active:scale-95'
                          }`}
                        >
                          {emailStatus === 'success' ? '확인 완료' : emailStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>

                    {/* 비밀번호 필드 */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-7">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3 w-32 shrink-0">
                          <Lock size={18} className="text-zinc-300" />
                          <span className="font-bold text-zinc-400">비밀번호</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <input 
                            {...register("password")} 
                            type={showPw ? "text" : "password"} 
                            placeholder="8자리 이상 입력" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPw(!showPw)} 
                            className="text-zinc-300 p-1 active:scale-90"
                          >
                            {showPw ? <EyeOff size={20}/> : <Eye size={20}/>}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 shrink-0 w-32 pl-[30px]">확인</span>
                        <input 
                          {...register("passwordConfirm")} 
                          type={showPw ? "text" : "password"} 
                          placeholder="비밀번호 재입력" 
                        />
                      </div>
                      <div className="pl-32 mt-3">
                        {watchAll.passwordConfirm && (
                          <p className={`text-[12px] font-bold ${isPasswordMatch ? 'text-[#4A6741]' : 'text-red-500'}`}>
                            {isPasswordMatch ? "✓ 비밀번호가 일치합니다." : "✕ 비밀번호가 일치하지 않습니다."}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 닉네임 필드 */}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-7">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <RefreshCw size={18} className="text-zinc-300" />
                        <span className="font-bold text-zinc-400">닉네임</span>
                        <button 
                          type="button" 
                          onClick={generateNickname} 
                          className="text-[#4A6741] p-1.5 bg-zinc-50 rounded-full active:rotate-180 transition-transform duration-500"
                        >
                          <RefreshCw size={12}/>
                        </button>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input {...register("nickname")} />
                        <button 
                          type="button" 
                          onClick={() => checkDuplicate("nickname")}
                          className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-[12px] transition-all duration-300 ${
                            nicknameStatus === 'success' ? 'bg-[#4A6741] text-white' : 'bg-zinc-900 text-white'
                          }`}
                        >
                          {nicknameStatus === 'success' ? '확인 완료' : nicknameStatus === 'error' ? '사용 불가' : '중복확인'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-4">
                    {/* 본명, 전화번호, 교회 입력 필드들 */}
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-7">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <User size={18} className="text-zinc-200" />
                        <span className="font-bold text-zinc-400">본명</span>
                      </div>
                      <input {...register("fullName")} placeholder="성함을 입력해주세요 (선택)" />
                    </div>
                    
                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-7">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <Smartphone size={18} className="text-zinc-200" />
                        <span className="font-bold text-zinc-400">전화번호</span>
                      </div>
                      <input {...register("phone")} placeholder="010-0000-0000 (선택)" />
                    </div>

                    <div className="flex items-center justify-between border-b-2 border-zinc-50 py-7">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <Church size={18} className="text-zinc-200" />
                        <span className="font-bold text-zinc-400">소속 교회</span>
                      </div>
                      <input {...register("church")} placeholder="출석 중인 교회 (선택)" />
                    </div>

                    {/* 직분 선택 필드 */}
                    <div className="flex flex-col border-b-2 border-zinc-50 py-7">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 w-32 shrink-0">
                          <Award size={18} className="text-zinc-200" />
                          <span className="font-bold text-zinc-400">직분</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setIsRankModalOpen(true)}
                          className="flex-1 text-left font-bold text-[#4A6741] flex items-center justify-between"
                        >
                          {watch("rank") || "직분을 선택해 주세요"}
                          <ChevronRight size={22} className="text-zinc-200"/>
                        </button>
                      </div>
                      {showCustomRankInput && (
                        <div className="mt-6 pl-32 animate-in fade-in slide-in-from-top-2">
                          <input 
                            {...register("customRank")} 
                            placeholder="직접 입력" 
                            className="border-b border-zinc-200 py-2" 
                          />
                        </div>
                      )}
                    </div>

                    {/* 하단 약관 동의 영역 (바텀시트 내부 버전) */}
                    <div className="pt-14 pb-4">
                      <button 
                        type="button" 
                        onClick={() => setIsAgreedAll(!isAgreedAll)}
                        className="flex items-center justify-center gap-4 w-full py-6 bg-zinc-50 rounded-[28px] group transition-all active:bg-zinc-100"
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isAgreedAll ? 'bg-[#4A6741]' : 'border-2 border-zinc-300 bg-white'}`}>
                          {isAgreedAll && <Check size={16} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="font-bold text-zinc-500 text-[15px]">
                          필수 <Link href="/terms/service"><a className="underline decoration-zinc-300 underline-offset-4 font-bold text-zinc-600 hover:text-[#4A6741]">이용약관</a></Link> 및 <Link href="/terms/privacy"><a className="underline decoration-zinc-300 underline-offset-4 font-bold text-zinc-600 hover:text-[#4A6741]">개인정보 처리방침</a></Link>에 동의
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 하단 고정 액션 버튼 (짤림 방지: pb-24 적용 및 shadow 상단으로) */}
              <div className="absolute bottom-0 left-0 right-0 px-10 pt-8 pb-24 bg-white border-t border-zinc-50 z-[120] shadow-[0_-15px_30px_rgba(0,0,0,0.04)]">
                {step === 1 ? (
                  <button 
                    onClick={() => {
                      if (usernameStatus === 'success' && emailStatus === 'success' && nicknameStatus === 'success' && isPasswordMatch) {
                        setStep(2);
                      } else {
                        setModal({ show: true, title: "입력 확인", msg: "중복 확인 및 비밀번호 일치 여부를 확인해 주세요.", type: "error" });
                      }
                    }}
                    className="w-full h-[72px] bg-zinc-900 text-white rounded-[28px] font-black text-[19px] shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    다음 단계로 넘어가기 <ChevronRight size={22}/>
                  </button>
                ) : (
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(1)} 
                      className="w-32 h-[72px] bg-zinc-100 text-zinc-400 rounded-[28px] font-bold text-[18px] active:scale-[0.98] transition-all"
                    >
                      이전
                    </button>
                    <button 
                      onClick={handleSubmit(onSubmit)} 
                      disabled={isSubmitting}
                      className="flex-1 h-[72px] bg-[#4A6741] text-white rounded-[28px] font-black text-[19px] shadow-xl flex items-center justify-center active:scale-[0.98] transition-all disabled:bg-zinc-200"
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

      {/* 중복 확인 및 알림 팝업 (사용자 지정 디자인) */}
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center px-10 bg-black/60 backdrop-blur-[6px]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-sm p-12 text-center shadow-2xl relative overflow-hidden"
            >
              {modal.type === 'success' && <div className="absolute top-0 left-0 right-0 h-2.5 bg-[#4A6741]" />}
              <div className={`w-24 h-24 rounded-full mx-auto mb-10 flex items-center justify-center ${
                modal.type === 'success' ? 'bg-[#4A6741]/10 text-[#4A6741]' : 'bg-red-50 text-red-500'
              }`}>
                {modal.type === 'success' ? <Check size={48} strokeWidth={3} /> : <X size={48} strokeWidth={3} />}
              </div>
              <h3 className="font-black text-[24px] mb-5 text-zinc-900">{modal.title}</h3>
              <p className="text-zinc-500 mb-12 font-bold text-[17px] leading-relaxed break-keep">
                {modal.msg}
              </p>
              <button 
                onClick={() => {
                  setModal({ ...modal, show: false });
                  if(modal.type === 'success' && modal.title === '가입 완료') setLocation("/auth");
                }}
                className="w-full py-6 bg-zinc-900 text-white rounded-[24px] font-black text-[18px] shadow-lg active:scale-[0.96] transition-all"
              >
                확인
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 직분 선택 전용 모달 */}
      <AnimatePresence>
        {isRankModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setIsRankModalOpen(false)} 
              className="fixed inset-0 bg-black/50 z-[300]" 
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 35, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[50px] z-[310] px-10 pt-14 pb-24 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-12 px-2">
                <h3 className="font-black text-zinc-900 text-[24px]">직분을 선택해 주세요</h3>
                <button onClick={() => setIsRankModalOpen(false)} className="bg-zinc-100 p-2.5 rounded-full text-zinc-400">
                  <X size={28}/>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {ranks.map(r => (
                  <button 
                    key={r} 
                    onClick={() => {
                      setValue("rank", r);
                      setShowCustomRankInput(r === "기타");
                      setIsRankModalOpen(false);
                    }}
                    className={`py-6 rounded-[24px] border-2 font-black text-[16px] transition-all duration-300 ${
                      watch("rank") === r 
                        ? 'border-[#4A6741] bg-[#4A6741] text-white shadow-lg' 
                        : 'border-zinc-50 bg-zinc-50 text-zinc-400 active:border-zinc-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
