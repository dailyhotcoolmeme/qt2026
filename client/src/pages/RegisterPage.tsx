import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];
// 직분 순서 조정 (목사가 뒤로)
const ranks = ["성도", "교사", "청년", "집사", "권사", "장로", "전도사", "목사", "직접 입력"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch } = useForm({ mode: "onChange" });
  
  const [usernameMsg, setUsernameMsg] = useState({ text: "", color: "" });
  const [nicknameMsg, setNicknameMsg] = useState({ text: "", color: "" });
  const [churchSuggestions, setChurchSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [showPw, setShowPw] = useState(false); // 비번 보기 상태
  
  const username = (watch("username") || "").trim();
  const nickname = watch("nickname") || "";
  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";
  const selectedRank = watch("rank");

  // 비밀번호 일치 확인 (안정적인 변수 처리)
  const isPasswordMatch = password.length >= 8 && password === passwordConfirm;
  const showPasswordError = passwordConfirm.length > 0 && password !== passwordConfirm;

  // 닉네임 자동 세팅
  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setNicknameMsg({ text: "자동 추천되었습니다 ✨", color: "text-blue-500" });
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  // 중복 확인 로직 (서버 연동)
  const checkDuplicate = async (field: "username" | "nickname", value: string) => {
    if (!value) return;
    try {
      const { data, error } = await supabase.from("profiles").select(field).eq(field, value).maybeSingle();
      const setMsg = field === "username" ? setUsernameMsg : setNicknameMsg;
      
      if (data) setMsg({ text: "이미 사용 중입니다", color: "text-red-500" });
      else setMsg({ text: "사용 가능합니다!", color: "text-emerald-500" });
    } catch (e) { console.error(e); }
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
    <div className="min-h-screen w-full bg-white flex flex-col px-6 pb-20 overflow-x-hidden">
      <header className="sticky top-0 bg-white z-20 pt-8 pb-4 border-b border-zinc-50">
        <Link href="/auth"><a className="inline-flex items-center text-zinc-400 p-2 -ml-2 mb-2"><ArrowLeft size={22} /></a></Link>
        <h1 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.6}px` }}>회원가입</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col pt-6">
        <p className="text-[#4A6741] font-black mb-4" style={{ fontSize: `${fontSize * 0.8}px` }}>필수 정보 <span className="text-red-500">*</span></p>

        {/* 아이디 */}
        <div className="flex flex-col py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>아이디 <span className="text-red-500">*</span></label>
            <div className="flex-1 flex justify-end items-center gap-2 pl-4 min-w-0">
              <input {...register("username", { required: true })} className="text-right bg-transparent outline-none w-full text-zinc-900" placeholder="영어/숫자 입력" style={{ fontSize: `${fontSize}px` }} />
              <button type="button" onClick={() => checkDuplicate("username", username)} className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-400 shrink-0">중복확인</button>
            </div>
          </div>
          {usernameMsg.text && <p className={`text-[11px] font-bold text-right mt-1 ${usernameMsg.color}`}>{usernameMsg.text}</p>}
        </div>

        {/* 비밀번호 & 눈 아이콘 */}
        <div className="flex flex-col py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>비밀번호 <span className="text-red-500">*</span></label>
            <div className="flex-1 flex items-center justify-end gap-2 pl-4">
              <input {...register("password", { required: true, minLength: 8 })} type={showPw ? "text" : "password"} placeholder="8자 이상" className="text-right bg-transparent outline-none w-full text-zinc-900" style={{ fontSize: `${fontSize}px` }} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-300 px-1">{showPw ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
          </div>
        </div>

        {/* 비밀번호 확인 */}
        <div className="flex flex-col py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>비밀번호 확인 <span className="text-red-500">*</span></label>
            <input {...register("passwordConfirm", { required: true })} type={showPw ? "text" : "password"} placeholder="한번 더 입력" className="text-right bg-transparent outline-none flex-1 text-zinc-900 ml-4" style={{ fontSize: `${fontSize}px` }} />
          </div>
          <div className="h-5 flex justify-end items-center mt-1">
            {showPasswordError && <p className="text-red-500 text-[11px] font-bold flex items-center gap-1"><AlertCircle size={12}/> 일치하지 않습니다.</p>}
            {isPasswordMatch && <p className="text-emerald-500 text-[11px] font-bold flex items-center gap-1"><Check size={12}/> 비밀번호가 일치합니다.</p>}
          </div>
        </div>

        {/* 닉네임 */}
        <div className="flex flex-col py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>닉네임 <span className="text-red-500">*</span></label>
            <div className="flex-1 flex justify-end items-center gap-2 pl-4 min-w-0">
              <input {...register("nickname", { required: true })} className="text-right bg-transparent outline-none w-full text-[#4A6741] font-bold" style={{ fontSize: `${fontSize}px` }} />
              <button type="button" onClick={generateNickname} className="p-1 text-zinc-300 mr-1"><RefreshCw size={18} /></button>
              <button type="button" onClick={() => checkDuplicate("nickname", nickname)} className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-400 shrink-0">중복확인</button>
            </div>
          </div>
          {nicknameMsg.text && <p className={`text-[11px] font-bold text-right mt-1 ${nicknameMsg.color}`}>{nicknameMsg.text}</p>}
        </div>

        <p className="text-zinc-400 font-black mt-12 mb-4" style={{ fontSize: `${fontSize * 0.8}px` }}>선택 정보</p>
        
        <div className="flex items-center justify-between py-4 border-b border-zinc-100">
          <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>본명</label>
          <input {...register("fullName")} placeholder="실명" className="text-right bg-transparent outline-none flex-1 text-zinc-900 ml-4" style={{ fontSize: `${fontSize}px` }} />
        </div>

        {/* 직분 (정렬 및 디자인 수정) */}
        <div className="flex items-center justify-between py-4 border-b border-zinc-100">
          <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>직분</label>
          <div className="flex-1 flex justify-end items-center pl-4">
            {selectedRank === "직접 입력" || showCustomRank ? (
              <div className="flex items-center gap-2 w-full justify-end">
                <input {...register("rank")} autoFocus placeholder="직분 직접 입력" className="text-right bg-transparent outline-none w-full text-[#4A6741] font-bold" style={{ fontSize: `${fontSize}px` }} />
                <button type="button" onClick={() => {setShowCustomRank(false); setValue("rank", "");}} className="text-[10px] text-zinc-400 shrink-0 border px-1.5 py-0.5 rounded">취소</button>
              </div>
            ) : (
              <select {...register("rank")} onChange={(e) => e.target.value === "직접 입력" && setShowCustomRank(true)} className="bg-transparent outline-none text-right text-zinc-900 w-full appearance-none" style={{ fontSize: `${fontSize}px` }}>
                <option value="">선택해주세요</option>
                {ranks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* 교회 검색 */}
        <div className="relative flex flex-col py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <label className="text-zinc-500 font-bold shrink-0" style={{ fontSize: `${fontSize * 0.9}px` }}>소속 교회</label>
            <input {...register("church")} placeholder="교회 이름" className="text-right bg-transparent outline-none flex-1 text-zinc-900 ml-4" style={{ fontSize: `${fontSize}px` }} />
          </div>
          {churchSuggestions.length > 0 && (
            <div className="absolute right-0 top-full mt-1 bg-white shadow-xl border border-zinc-100 rounded-xl z-30 w-52 overflow-hidden">
              {churchSuggestions.map(name => (
                <button key={name} type="button" onClick={() => {setValue("church", name); setChurchSuggestions([]);}} className="w-full px-4 py-3 text-left text-xs text-zinc-600 hover:bg-zinc-50 border-b last:border-none">{name}</button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 mb-10 px-2">
          <motion.button 
            whileTap={{ scale: 0.96 }}
            disabled={isSubmitting || !isPasswordMatch}
            type="submit"
            className={`w-full h-16 rounded-[24px] font-black transition-all ${isSubmitting || !isPasswordMatch ? 'bg-zinc-100 text-zinc-300' : 'bg-[#4A6741] text-white shadow-xl shadow-green-900/10'}`}
            style={{ fontSize: `${fontSize * 1.1}px` }}
          >
            가입 완료
          </motion.button>
        </div>
      </form>
    </div>
  );
}
