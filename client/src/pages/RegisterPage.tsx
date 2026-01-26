import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff, Sparkles, Mail, User, Lock, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

// 상수 데이터 (전체 유지)
const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "직접 입력"];
const emailDomains = ["naver.com", "gmail.com", "daum.net", "hanmail.net", "kakao.com", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  
  // React Hook Form 설정
  const { register, handleSubmit, setValue, watch, getValues } = useForm({
    mode: "onChange",
    defaultValues: {
      username: "",
      emailId: "",
      emailDomain: "",
      customDomain: "",
      password: "",
      passwordConfirm: "",
      nickname: "",
      fullName: "",
      phone: "",
      rank: "",
      church: ""
    }
  });
  
  // 상태 관리 (필드별 상태값 분리하여 유지)
  const [usernameStatus, setUsernameStatus] = useState<'none' | 'success' | 'error'>('none');
  const [emailStatus, setEmailStatus] = useState<'none' | 'success' | 'error'>('none');
  const [nicknameStatus, setNicknameStatus] = useState<'none' | 'success' | 'error'>('none');
  
  const [usernameMsg, setUsernameMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [nicknameMsg, setNicknameMsg] = useState("");
  
  const [modal, setModal] = useState({ show: false, title: "", msg: "", type: "error" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // 실시간 값 감시
  const watchAll = watch();
  const isPasswordMatch = watchAll.password && watchAll.password.length >= 8 && watchAll.password === watchAll.passwordConfirm;

  // 닉네임 자동 생성 함수
  const generateNickname = useCallback(() => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 899 + 100);
    const nick = `${adj}${noun}${num}`;
    
    setValue("nickname", nick);
    setNicknameStatus('success');
    setNicknameMsg("멋진 이름이네요! 그대로 사용하셔도 됩니다 ✨");
  }, [setValue]);

  useEffect(() => {
    generateNickname();
  }, [generateNickname]);

  // 중복 확인 로직 (이메일 비동기 버그 수정 완료)
  const checkDuplicate = async (field: "username" | "nickname" | "email") => {
    const values = getValues();
    let value = "";
    
    if (field === "username") value = values.username?.trim();
    if (field === "nickname") value = values.nickname?.trim();
    if (field === "email") {
      const domain = showCustomDomain ? values.customDomain : values.emailDomain;
      if (!values.emailId || !domain) {
        setModal({ show: true, title: "알림", msg: "이메일 주소를 완성한 후 확인해주세요.", type: "error" });
        return;
      }
      value = `${values.emailId}@${domain}`;
    }

    if (!value) return;

    try {
      const { data, error } = await supabase.from("profiles").select("id").eq(field, value).maybeSingle();
      if (error) throw error;
      
      const isAvailable = !data;
      if (field === "username") {
        setUsernameStatus(isAvailable ? 'success' : 'error');
        setUsernameMsg(isAvailable ? "사용 가능한 아이디입니다!" : "이미 사용 중인 정보입니다 😢");
      } else if (field === "nickname") {
        setNicknameStatus(isAvailable ? 'success' : 'error');
        setNicknameMsg(isAvailable ? "사용 가능한 정보입니다!" : "이미 사용 중인 정보입니다 😢");
      } else if (field === "email") {
        setEmailStatus(isAvailable ? 'success' : 'error');
        setEmailMsg(isAvailable ? "사용 가능한 이메일입니다!" : "이미 가입된 정보입니다 😢");
      }
    } catch (e) {
      setModal({ show: true, title: "오류", msg: "서버 연결에 실패했습니다.", type: "error" });
    }
  };

  // 회원가입 전송
  const onSubmit = async (values: any) => {
    if (usernameStatus !== 'success' || emailStatus !== 'success' || nicknameStatus !== 'success') {
      setModal({ show: true, title: "확인 필요", msg: "모든 중복 확인을 완료해주세요.", type: "error" });
      return;
    }
    if (!isPasswordMatch) {
      setModal({ show: true, title: "확인 필요", msg: "비밀번호가 일치하지 않습니다.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalEmail = `${values.emailId}@${showCustomDomain ? values.customDomain : values.emailDomain}`;
      
      const { data, error } = await supabase.auth.signUp({
        email: finalEmail,
        password: values.password,
        options: {
          data: {
            username: values.username,
            nickname: values.nickname,
            full_name: values.fullName || "",
            phone: values.phone || "",
            rank: values.rank || "",
            church: values.church || "",
            display_name: values.nickname
          }
        }
      });

      if (error) throw error;
      
      setModal({ 
        show: true, 
        title: "축하합니다!", 
        msg: "회원가입이 정상적으로 완료되었습니다!", 
        type: "success" 
      });
    } catch (error: any) {
      setModal({ show: true, title: "가입 실패", msg: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FCFDFB] flex flex-col px-6 pb-24 overflow-x-hidden">
      {/* 커스텀 팝업 모달 */}
      <AnimatePresence>
        {modal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl text-center"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.type === 'success' ? 'bg-[#4A6741]/10 text-[#4A6741]' : 'bg-red-50 text-red-500'}`}>
                {modal.type === 'success' ? <Check size={28}/> : <AlertCircle size={28} />}
              </div>
              <h3 className="font-black text-zinc-900 mb-2" style={{ fontSize: `${fontSize * 1.1}px` }}>{modal.title}</h3>
              <p className="text-zinc-500 font-medium mb-6 whitespace-pre-wrap">{modal.msg}</p>
              <button 
                onClick={() => {
                  setModal({ ...modal, show: false });
                  if (modal.type === 'success') setLocation("/");
                }} 
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
              >확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="pt-8 pb-4 shrink-0">
        <Link href="/auth">
          <a className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-zinc-100 mb-4 text-zinc-400">
            <ArrowLeft size={20} />
          </a>
        </Link>
        <h1 className="font-black text-zinc-900 tracking-tight" style={{ fontSize: `${fontSize * 1.8}px` }}>회원가입</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <h2 className="font-bold text-zinc-400 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>꼭 필요한 정보</h2>

        {/* 아이디 섹션 (빨간 테두리 로직 복구) */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${
          usernameStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : 
          usernameStatus === 'error' ? 'border-red-500 bg-red-50/30' : 'border-zinc-100 bg-white'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px] uppercase tracking-wider"><User size={14}/> 아이디</label>
            <span className="font-bold text-[10px]" style={{ color: usernameStatus === 'success' ? '#4A6741' : '#ef4444' }}>{usernameMsg}</span>
          </div>
          <div className="flex items-center gap-2 overflow-hidden">
            <input {...register("username")} className="flex-1 min-w-0 bg-transparent outline-none font-black text-zinc-900" placeholder="영문/숫자 입력" style={{ fontSize: `${fontSize * 1.1}px` }} />
            <button type="button" onClick={() => checkDuplicate("username")} className="shrink-0 px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold text-[11px] active:scale-95 transition-all">중복확인</button>
          </div>
        </div>

        {/* 이메일 섹션 (화면 이탈 방지) */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${
          emailStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : 
          emailStatus === 'error' ? 'border-red-500 bg-red-50/30' : 'border-zinc-100 bg-white'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px] uppercase tracking-wider"><Mail size={14}/> 이메일 (비밀번호 찾기용)</label>
            <span className="font-bold text-[10px]" style={{ color: emailStatus === 'success' ? '#4A6741' : '#ef4444' }}>{emailMsg}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input {...register("emailId")} className="w-[45%] min-w-0 bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none" placeholder="아이디" />
            <span className="text-zinc-400 font-bold shrink-0">@</span>
            <div className="flex-1 relative overflow-hidden">
              {showCustomDomain ? (
                <div className="relative">
                  <input {...register("customDomain")} autoFocus className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none border border-[#4A6741]/20" placeholder="입력" />
                  <button type="button" onClick={() => {setShowCustomDomain(false); setValue("customDomain", "");}} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300"><X size={14}/></button>
                </div>
              ) : (
                <div className="relative">
                  <select {...register("emailDomain")} onChange={(e) => e.target.value === "직접 입력" && setShowCustomDomain(true)} className="w-full bg-zinc-50 rounded-xl px-4 py-3 font-bold outline-none appearance-none pr-8">
                    <option value="">선택</option>
                    {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={() => checkDuplicate("email")} className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-500 font-bold text-[12px] border border-zinc-200 active:bg-zinc-200 transition-all">이메일 중복확인</button>
        </div>

        {/* 비밀번호 섹션 (빨간 테두리 피드백 포함) */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${
          isPasswordMatch ? 'border-[#4A6741] bg-[#4A6741]/5' : 
          (watchAll.passwordConfirm && !isPasswordMatch) ? 'border-red-500 bg-red-50/30' : 'border-zinc-100 bg-white'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px] uppercase tracking-wider"><Lock size={14}/> 비밀번호</label>
            {isPasswordMatch && <span className="font-bold text-[#4A6741] text-[10px]">✓ 비밀번호가 일치합니다</span>}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-50 pb-2 overflow-hidden">
              <input {...register("password")} type={showPw ? "text" : "password"} placeholder="8자 이상 입력" className="flex-1 min-w-0 bg-transparent outline-none font-bold text-zinc-900" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 hover:text-zinc-500 transition-colors">
                {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            <input {...register("passwordConfirm")} type={showPw ? "text" : "password"} placeholder="비밀번호를 한 번 더 입력해 주세요" className="w-full min-w-0 bg-transparent outline-none font-bold text-zinc-900" />
          </div>
        </div>

        {/* 닉네임 섹션 */}
        <div className={`rounded-3xl p-5 border-2 shadow-sm transition-all duration-300 ${
          nicknameStatus === 'success' ? 'border-[#4A6741] bg-[#4A6741]/5' : 
          nicknameStatus === 'error' ? 'border-red-500 bg-red-50/30' : 'border-zinc-100 bg-white'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-[#4A6741] flex items-center gap-1 text-[11px] uppercase tracking-wider"><Sparkles size={14}/> 닉네임</label>
            <button type="button" onClick={generateNickname} className="text-zinc-400 text-[10px] font-bold flex items-center gap-1 hover:text-zinc-600 transition-colors">
              <RefreshCw size={10}/> 다른추천
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-hidden">
            <input {...register("nickname")} className="flex-1 min-w-0 bg-transparent outline-none font-black text-[#4A6741]" style={{ fontSize: `${fontSize * 1.3}px` }} />
            <button type="button" onClick={() => checkDuplicate("nickname")} className="shrink-0 px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-[11px] active:scale-95 transition-all">중복확인</button>
          </div>
          {nicknameMsg && <p className="text-[10px] font-bold mt-2" style={{ color: nicknameStatus === 'success' ? '#4A6741' : '#ef4444' }}>{nicknameMsg}</p>}
        </div>

        <h2 className="font-bold text-zinc-400 mt-10 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>선택 입력</h2>
        
        {/* 선택 입력 항목 (레이아웃 이탈 방지 + 정렬 완벽 복구) */}
        <div className="bg-white rounded-[32px] border-2 border-zinc-50 shadow-sm overflow-hidden divide-y divide-zinc-50">
          {[
            { id: "fullName", label: "본명", placeholder: "실명 입력" },
            { id: "phone", label: "전화번호", placeholder: "010-0000-0000" },
            { id: "rank", label: "직분", type: "select" },
            { id: "church", label: "소속 교회", placeholder: "교회 이름 입력" }
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between px-6 py-5 min-h-[68px] gap-4">
              <span className="font-bold text-zinc-400 text-[12px] w-28 shrink-0">{item.label}</span>
              <div className="flex-1 flex justify-end overflow-hidden">
                {item.id === "rank" ? (
                  <div className="w-full flex justify-end">
                    {showCustomRank ? (
                      <div className="flex items-center gap-2 w-full justify-end">
                        <input {...register("rank")} autoFocus placeholder="직접 입력" className="text-right outline-none font-bold text-[#4A6741] bg-transparent w-full" />
                        <button type="button" onClick={() => {setShowCustomRank(false); setValue("rank", "");}} className="text-zinc-300"><X size={14}/></button>
                      </div>
                    ) : (
                      <select {...register("rank")} onChange={(e) => e.target.value === "직접 입력" && setShowCustomRank(true)} className="max-w-full text-right outline-none font-bold text-zinc-800 bg-transparent appearance-none cursor-pointer">
                        <option value="">선택</option>
                        {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                  </div>
                ) : (
                  <input 
                    {...register(item.id)} 
                    placeholder={item.placeholder} 
                    className="w-full text-right outline-none font-bold text-zinc-800 placeholder:text-zinc-200 bg-transparent" 
                    onChange={item.id === "phone" ? (e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
                      setValue("phone", val);
                    } : undefined}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          disabled={isSubmitting} 
          type="submit" 
          className={`w-full h-18 py-5 rounded-[28px] font-black text-white mt-10 shadow-xl transition-all ${isSubmitting ? 'bg-zinc-300 shadow-none scale-100' : 'bg-[#4A6741] active:scale-[0.97] hover:brightness-105 shadow-[#4A6741]/20'}`}
          style={{ fontSize: `${fontSize * 1.1}px` }}
        >
          {isSubmitting ? "가입 처리 중..." : "가입하기"}
        </button>
      </form>
    </div>
  );
}
