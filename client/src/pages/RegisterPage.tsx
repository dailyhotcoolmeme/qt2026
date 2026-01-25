import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
const ranks = ["성도", "집사", "권사", "장로", "전도사", "목사", "교사", "청년"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
  
  const [usernameMsg, setUsernameMsg] = useState({ text: "", color: "" });
  const [nicknameMsg, setNicknameMsg] = useState({ text: "", color: "" });
  const [churchSuggestions, setChurchSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const username = (watch("username") || "").trim();
  const nickname = watch("nickname") || "";
  const church = watch("church") || "";
  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";

  // 1. 교회 유사 이름 찾기 (간이 검색 로직)
  useEffect(() => {
    if (church.length >= 2) {
      const fetchChurches = async () => {
        const { data } = await supabase.from('profiles').select('church').ilike('church', `%${church}%`).limit(3);
        if (data) setChurchSuggestions(Array.from(new Set(data.map(i => i.church))));
      };
      fetchChurches();
    } else {
      setChurchSuggestions([]);
    }
  }, [church]);

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameMsg({ text: "사용 가능한 멋진 닉네임입니다!", color: "text-emerald-500" });
  }, [setValue]);

  const checkDuplicate = async (field: "username" | "nickname", value: string) => {
    if (!value) return;
    try {
      const { data } = await supabase.from("profiles").select(field).eq(field, value).maybeSingle();
      const setMsg = field === "username" ? setUsernameMsg : setNicknameMsg;
      if (data) setMsg({ text: "이미 사용 중입니다", color: "text-red-500" });
      else setMsg({ text: "사용 가능합니다", color: "text-emerald-500" });
    } catch (e) { console.error(e); }
  };

  const onSubmit = async (values: any) => {
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
        
        alert("🎉 가입을 축하드립니다! 환영합니다.");
        window.location.href = "/";
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 공통 입력 행 컴포넌트
  const FormRow = ({ label, children, error, required }: any) => (
    <div className="group flex flex-col gap-2 border-b border-zinc-100 py-4 transition-colors focus-within:border-[#4A6741]">
      <div className="flex items-center justify-between">
        <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="flex-1 flex justify-end items-center gap-2 pl-4">
          {children}
        </div>
      </div>
      {error && <p className="text-red-500 text-[11px] font-bold text-right">{error.message || "필수 입력 항목입니다."}</p>}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-white flex flex-col p-6 overflow-y-auto pb-32">
      <header className="py-8">
        <Link href="/auth">
          <a className="inline-flex items-center text-zinc-400 gap-1 mb-6 hover:text-[#4A6741]">
            <ArrowLeft size={18} />
          </a>
        </Link>
        <h1 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.8}px` }}>
          회원가입
        </h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        {/* 필수 정보 섹션 */}
        <section className="space-y-1 mb-10">
          <p className="text-[#4A6741] font-black mb-4" style={{ fontSize: `${fontSize * 0.8}px` }}>필수 계정 정보</p>
          
          <FormRow label="아이디" required error={errors.username}>
            <input {...register("username", { required: true })} className="text-right bg-transparent outline-none w-full text-zinc-900" placeholder="영어/숫자 입력" style={{ fontSize: `${fontSize}px` }} />
            <button type="button" onClick={() => checkDuplicate("username", username)} className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-400 shrink-0">중복확인</button>
          </FormRow>

          <FormRow label="비밀번호" required error={errors.password}>
            <input {...register("password", { required: true, minLength: 8 })} type="password" placeholder="8자 이상" className="text-right bg-transparent outline-none w-full text-zinc-900" style={{ fontSize: `${fontSize}px` }} />
          </FormRow>

          <FormRow label="닉네임" required error={errors.nickname}>
            <input {...register("nickname", { required: true })} className="text-right bg-transparent outline-none w-full text-[#4A6741] font-bold" style={{ fontSize: `${fontSize}px` }} />
            <button type="button" onClick={generateNickname} className="p-1.5 text-zinc-300 hover:text-[#4A6741] shrink-0"><RefreshCw size={16} /></button>
          </FormRow>
        </section>

        {/* 선택 정보 섹션 (데이터 관리 최적화) */}
        <section className="space-y-1">
          <p className="text-zinc-400 font-black mb-4" style={{ fontSize: `${fontSize * 0.8}px` }}>추가 프로필 (선택)</p>
          
          <FormRow label="본명">
            <input {...register("fullName")} placeholder="실명 입력" className="text-right bg-transparent outline-none w-full text-zinc-900" style={{ fontSize: `${fontSize}px` }} />
          </FormRow>

          <FormRow label="직분">
            <select {...register("rank")} className="bg-transparent outline-none text-right text-zinc-900 w-full appearance-none" style={{ fontSize: `${fontSize}px` }}>
              <option value="">선택해주세요</option>
              {ranks.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </FormRow>

          <FormRow label="교회">
            <div className="relative w-full">
              <input {...register("church")} placeholder="교회 이름 검색" className="text-right bg-transparent outline-none w-full text-zinc-900" style={{ fontSize: `${fontSize}px` }} />
              <AnimatePresence>
                {churchSuggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 top-full mt-2 bg-white shadow-xl border border-zinc-100 rounded-xl z-10 w-48 overflow-hidden">
                    {churchSuggestions.map(name => (
                      <button key={name} type="button" onClick={() => setValue("church", name)} className="w-full px-4 py-3 text-left text-xs text-zinc-600 hover:bg-zinc-50 border-b border-zinc-50 last:border-none">
                        {name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormRow>
        </section>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            disabled={isSubmitting}
            type="submit"
            className={`w-full h-16 rounded-[20px] font-black shadow-2xl transition-all ${isSubmitting ? 'bg-zinc-100' : 'bg-[#4A6741] text-white'}`}
            style={{ fontSize: `${fontSize * 1.1}px` }}
          >
            {isSubmitting ? "가입 중..." : "가입 완료"}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
