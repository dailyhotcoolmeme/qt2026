import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
// 직분 순서 정렬 및 '직접 입력' 추가
const ranks = ["목사", "전도사", "장로", "권사", "집사", "청년", "교사", "성도", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    mode: "onChange" // 입력 시 즉시 유효성 검사
  });
  
  const [usernameMsg, setUsernameMsg] = useState({ text: "", color: "" });
  const [nicknameMsg, setNicknameMsg] = useState({ text: "", color: "" });
  const [churchSuggestions, setChurchSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  
  const username = (watch("username") || "").trim();
  const nickname = watch("nickname") || "";
  const church = watch("church") || "";
  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";
  const selectedRank = watch("rank");

  // 1. 비밀번호 일치 여부 확인
  const isPasswordMatch = password && password === passwordConfirm;
  const showPasswordError = passwordConfirm.length > 0 && password !== passwordConfirm;

  // 2. 직분 '직접 입력' 모드 전환
  useEffect(() => {
    if (selectedRank === "직접 입력") {
      setShowCustomRank(true);
      setValue("rank", ""); // 입력값 초기화
    }
  }, [selectedRank, setValue]);

  // 3. 교회 검색 로직
  useEffect(() => {
    if (church && church.length >= 2) {
      const fetchChurches = async () => {
        const { data } = await supabase.from('profiles').select('church').ilike('church', `%${church}%`).limit(3);
        if (data) setChurchSuggestions(Array.from(new Set(data.filter(i => i.church).map(i => i.church))));
      };
      fetchChurches();
    } else { setChurchSuggestions([]); }
  }, [church]);

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameMsg({ text: "사용 가능한 닉네임입니다 ✨", color: "text-emerald-500" });
  }, [setValue]);

  const checkDuplicate = async (field: "username" | "nickname", value: string) => {
    if (!value) return;
    const { data } = await supabase.from("profiles").select(field).eq(field, value).maybeSingle();
    const setMsg = field === "username" ? setUsernameMsg : setNicknameMsg;
    if (data) setMsg({ text: "이미 사용 중입니다", color: "text-red-500" });
    else setMsg({ text: "사용 가능합니다", color: "text-emerald-500" });
  };

  const onSubmit = async (values: any) => {
    if (!isPasswordMatch) return;
    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${values.username}@church.com`,
        password: values.password,
        options: { data: { name: values.fullName, title: values.rank, nickname: values.nickname } }
      });
      if (authError) throw authError;

      if (authData.user) {
        await supabase.from('profiles').insert([{
          id: authData.user.id,
          username: values.username,
          nickname: values.nickname,
          full_name: values.fullName,
          church: values.church,
          rank: values.rank,
        }]);
        alert("🎉 회원가입이 완료되었습니다!");
        window.location.href = "/";
      }
    } catch (error: any) { alert(error.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col px-6">
      {/* 상단바: 고정하여 짤림 방지 */}
      <header className="sticky top-0 bg-white z-20 pt-8 pb-4 border-b border-zinc-50">
        <Link href="/auth">
          <a className="inline-flex items-center text-zinc-400 p-2 -ml-2 mb-2">
            <ArrowLeft size={22} />
          </a>
        </Link>
        <h1 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.6}px` }}>회원가입</h1>
      </header>

      {/* 폼 영역: 키보드에 가려지지 않도록 충분한 하단 패딩 부여 */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col pb-40">
        
        {/* 입력 행 (키보드 튕김 방지를 위해 컴포넌트 내부 직접 구현) */}
        <div className="mt-6 space-y-2">
          <p className="text-[#4A6741] font-black mb-4 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>필수 정보</p>
          
          {/* 아이디 */}
          <div className="flex flex-col gap-2 py-4 border-b border-zinc-100 focus-within:border-[#4A6741] transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>아이디 *</label>
              <div className="flex-1 flex justify-end items-center gap-2 pl-4">
                <input {...register("username", { required: true })} className="text-right bg-transparent outline-none w-full text-zinc-900" placeholder="영어/숫자 입력" style={{ fontSize: `${fontSize}px` }} />
                <button type="button" onClick={() => checkDuplicate("username", username)} className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-400 shrink-0 active:bg-zinc-50">중복확인</button>
              </div>
            </div>
            {usernameMsg.text && <p className={`text-[11px] font-bold text-right ${usernameMsg.color}`}>{usernameMsg.text}</p>}
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-2 py-4 border-b border-zinc-100 focus-within:border-[#4A6741] transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>비밀번호 *</label>
              <input {...register("password", { required: true, minLength: 8 })} type="password" placeholder="8자 이상" className="text-right bg-transparent outline-none flex-1 text-zinc-900 ml-4" style={{ fontSize: `${fontSize}px` }} />
            </div>
          </div>

          {/* 비밀번호 확인 */}
          <div className="flex flex-col gap-2 py-4 border-b border-zinc-100 focus-within:border-[#4A6741] transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>비밀번호 확인 *</label>
              <input {...register("passwordConfirm", { required: true })} type="password" placeholder="동일하게 입력" className="text-right bg-transparent outline-none flex-1 text-zinc-900 ml-4" style={{ fontSize: `${fontSize}px` }} />
            </div>
            {showPasswordError && <p className="text-red-500 text-[11px] font-bold text-right flex items-center justify-end gap-1"><AlertCircle size={12}/> 일치하지 않습니다.</p>}
            {isPasswordMatch && <p className="text-emerald-500 text-[11px] font-bold text-right flex items-center justify-end gap-1"><Check size={12}/> 확인되었습니다.</p>}
          </div>

          {/* 닉네임 */}
          <div className="flex flex-col gap-2 py-4 border-b border-zinc-100 focus-within:border-[#4A6741] transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>닉네임 *</label>
              <div className="flex-1 flex justify-end items-center gap-2 pl-4">
                <input {...register("nickname", { required: true })} className="text-right bg-transparent outline-none w-full text-[#4A6741] font-bold" style={{ fontSize: `${fontSize}px` }} />
                <button type="button" onClick={generateNickname} className="p-1.5 text-zinc-300 hover:text-[#4A6741] shrink-0"><RefreshCw size={18} /></button>
              </div>
            </div>
            {nicknameMsg.text && <p className={`text-[11px] font-bold text-right ${nicknameMsg.color}`}>{nicknameMsg.text}</p>}
          </div>
        </div>

        {/* 선택 정보 섹션 */}
        <div className="mt-12 space-y-2">
          <p className="text-zinc-400 font-black mb-4 px-1" style={{ fontSize: `${fontSize * 0.8}px` }}>추가 정보 (선택)</p>
          
          <div className="flex items-center justify-between py-4 border-b border-zinc-100">
            <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>본명</label>
            <input {...register("fullName")} placeholder="실명" className="text-right bg-transparent outline-none flex-1 text-zinc-900 ml-4" style={{ fontSize: `${fontSize}px` }} />
          </div>

          {/* 직분 선택 (디자인 개선) */}
          <div className="flex flex-col py-4 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>직분</label>
              {!showCustomRank ? (
                <select {...register("rank")} className="bg-transparent outline-none text-right text-zinc-900 flex-1 ml-4 appearance-none font-medium" style={{ fontSize: `${fontSize}px` }}>
                  <option value="">선택해주세요</option>
                  {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <div className="flex-1 flex items-center gap-2 ml-4">
                  <input {...register("rank")} autoFocus placeholder="직분 직접 입력" className="text-right bg-transparent outline-none flex-1 text-[#4A6741] font-bold" style={{ fontSize: `${fontSize}px` }} />
                  <button type="button" onClick={() => {setShowCustomRank(false); setValue("rank", "");}} className="text-[10px] text-zinc-400 border border-zinc-200 px-2 py-1 rounded-md">취소</button>
                </div>
              )}
            </div>
          </div>

          {/* 교회 검색 */}
          <div className="relative flex flex-col py-4 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>소속 교회</label>
              <input {...register("church")} placeholder="교회 검색" className="text-right bg-transparent outline-none flex-1 text-zinc-900 ml-4" style={{ fontSize: `${fontSize}px` }} />
            </div>
            <AnimatePresence>
              {churchSuggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-full mt-1 bg-white shadow-2xl border border-zinc-100 rounded-2xl z-30 w-56 overflow-hidden">
                  {churchSuggestions.map(name => (
                    <button key={name} type="button" onClick={() => {setValue("church", name); setChurchSuggestions([]);}} className="w-full px-5 py-4 text-left text-sm text-zinc-600 hover:bg-zinc-50 border-b border-zinc-50 last:border-none">
                      {name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 가입 완료 버튼: 하단 고정 해제 및 마진 확보로 짤림 방지 */}
        <div className="mt-16 mb-20 px-2">
          <motion.button 
            whileTap={{ scale: 0.96 }}
            disabled={isSubmitting || !isPasswordMatch || !isUsernameValid}
            type="submit"
            className={`w-full h-16 rounded-[24px] font-black shadow-xl transition-all ${isSubmitting || !isPasswordMatch ? 'bg-zinc-100 text-zinc-300' : 'bg-[#4A6741] text-white shadow-green-900/10'}`}
            style={{ fontSize: `${fontSize * 1.1}px` }}
          >
            {isSubmitting ? "가입 처리 중..." : "가입 완료"}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
