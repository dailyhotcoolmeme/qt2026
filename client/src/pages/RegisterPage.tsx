import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const { register, handleSubmit, setValue, watch } = useForm();
  
  const [usernameMsg, setUsernameMsg] = useState({ text: "", color: "" });
  const [nicknameMsg, setNicknameMsg] = useState({ text: "", color: "" });
  const [lastRecommendedNickname, setLastRecommendedNickname] = useState(""); 
  
  const username = (watch("username") || "").trim();
  const nickname = watch("nickname") || "";
  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";

  const isPasswordMatch = password.length >= 8 && password === passwordConfirm;
  const showPasswordError = passwordConfirm.length > 0 && password !== passwordConfirm;
  const isUsernameValid = /^[A-Za-z0-9]{2,}$/.test(username);
  const isNicknameChanged = nickname !== lastRecommendedNickname;

  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setLastRecommendedNickname(nick);
    setNicknameMsg({ text: "추천된 닉네임입니다 ✨", color: "text-blue-500" });
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  const checkDuplicate = async (field: "username" | "nickname", value: string) => {
    const setMsg = field === "username" ? setUsernameMsg : setNicknameMsg;
    if (field === "username" && !isUsernameValid) {
      return setMsg({ text: "영어 2글자 이상 입력해주세요.", color: "text-red-500" });
    }
    try {
      const { data } = await supabase.from("profiles").select(field).eq(field, value).maybeSingle();
      if (data) setMsg({ text: "이미 사용 중입니다.", color: "text-red-500" });
      else setMsg({ text: "사용 가능합니다!", color: "text-[#4A6741]" });
    } catch (e) { console.error(e); }
  };

  const onSubmit = async (values: any) => {
    if (!isPasswordMatch || !isUsernameValid) return;
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${values.username}@church.com`,
        password: values.password,
        options: {
          data: {
            name: values.fullName,
            title: values.rank || "성도",
            nickname: values.nickname
          }
        }
      });
      if (authError) throw authError;

      if (authData.user) {
        await supabase.from('profiles').insert([{
          id: authData.user.id,
          username: values.username,
          nickname: values.nickname,
          full_name: values.fullName,
          church: values.church,
          rank: values.rank || "성도",
        }]);

        await supabase.auth.signInWithPassword({
          email: `${values.username}@church.com`,
          password: values.password,
        });

        window.location.href = "/";
      }
    } catch (error: any) { alert(error.message); }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F8] flex flex-col p-6 overflow-y-auto">
      {/* 뒤로가기 */}
      <Link href="/auth">
        <a className="mt-4 mb-8 flex items-center text-zinc-400 font-bold gap-1 transition-colors hover:text-[#4A6741]" style={{ fontSize: `${fontSize * 0.9}px` }}>
          <ArrowLeft size={18}/> 돌아가기
        </a>
      </Link>

      <div className="max-w-[450px] mx-auto w-full space-y-10 pb-20">
        <header className="space-y-2">
          <h1 className="font-black text-zinc-900 tracking-tighter" style={{ fontSize: `${fontSize * 1.8}px` }}>회원가입</h1>
          <p className="text-zinc-400 font-medium" style={{ fontSize: `${fontSize * 0.9}px` }}>중보 기도의 여정을 함께 시작해요.</p>
        </header>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* 1. 계정 정보 섹션 */}
          <div className="space-y-5">
            <h3 className="text-[#4A6741] font-black border-b border-zinc-100 pb-2" style={{ fontSize: `${fontSize * 0.85}px` }}>계정 정보</h3>
            
            <div className="space-y-2">
              <label className="text-zinc-500 font-bold ml-1" style={{ fontSize: `${fontSize * 0.8}px` }}>아이디</label>
              <div className="flex gap-2">
                <input {...register("username")} className="flex-1 h-14 bg-white rounded-2xl px-5 shadow-sm border-none focus:ring-2 focus:ring-[#4A6741] outline-none" placeholder="영어/숫자 2글자 이상" style={{ fontSize: `${fontSize}px` }} />
                <button type="button" onClick={() => checkDuplicate("username", username)} className="h-14 px-5 bg-white text-[#4A6741] border border-[#4A6741] rounded-2xl font-bold transition-all active:scale-95 shrink-0" style={{ fontSize: `${fontSize * 0.85}px` }}>중복확인</button>
              </div>
              {usernameMsg.text && <p className={`text-xs ml-2 font-bold ${usernameMsg.color}`}>{usernameMsg.text}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-zinc-500 font-bold ml-1" style={{ fontSize: `${fontSize * 0.8}px` }}>비밀번호</label>
                <input {...register("password")} type="password" placeholder="8자 이상" className="w-full h-14 bg-white rounded-2xl px-5 shadow-sm border-none focus:ring-2 focus:ring-[#4A6741] outline-none" style={{ fontSize: `${fontSize}px` }} />
              </div>
              <div className="space-y-2">
                <label className="text-zinc-500 font-bold ml-1" style={{ fontSize: `${fontSize * 0.8}px` }}>확인</label>
                <input {...register("passwordConfirm")} type="password" placeholder="비밀번호 확인" className={`w-full h-14 bg-white rounded-2xl px-5 shadow-sm border-none focus:ring-2 ${showPasswordError ? 'ring-2 ring-red-400' : 'focus:ring-[#4A6741]'} outline-none`} style={{ fontSize: `${fontSize}px` }} />
              </div>
            </div>
          </div>

          {/* 2. 중보 모임 필수 정보 섹션 */}
          <div className="space-y-5 bg-white/50 p-5 rounded-[24px] border border-white">
            <h3 className="text-[#4A6741] font-black" style={{ fontSize: `${fontSize * 0.85}px` }}>중보 모임 정보 <span className="text-xs font-normal text-zinc-400 ml-1">(모임 시 표시됩니다)</span></h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-zinc-500 font-bold" style={{ fontSize: `${fontSize * 0.8}px` }}>활동 닉네임 ✨</label>
                <button type="button" onClick={generateNickname} className="text-[#4A6741] flex items-center gap-1 font-black opacity-70 hover:opacity-100" style={{ fontSize: `${fontSize * 0.75}px` }}>
                  <RefreshCw size={14}/> 추천받기
                </button>
              </div>
              <div className="flex gap-2">
                <input {...register("nickname")} className="flex-1 h-14 bg-white rounded-2xl px-5 shadow-sm border-none font-bold text-[#4A6741] focus:ring-2 focus:ring-[#4A6741] outline-none" style={{ fontSize: `${fontSize}px` }} />
                <button 
                  type="button" 
                  disabled={!isNicknameChanged}
                  onClick={() => checkDuplicate("nickname", nickname)} 
                  className={`h-14 px-5 rounded-2xl font-bold transition-all active:scale-95 shrink-0 ${isNicknameChanged ? 'bg-[#4A6741] text-white shadow-md' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
                  style={{ fontSize: `${fontSize * 0.85}px` }}
                >
                  중복확인
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-zinc-500 font-bold ml-1" style={{ fontSize: `${fontSize * 0.8}px` }}>본명</label>
                <input {...register("fullName")} placeholder="예: 홍길동" className="w-full h-14 bg-white rounded-2xl px-5 shadow-sm border-none focus:ring-2 focus:ring-[#4A6741] outline-none" style={{ fontSize: `${fontSize}px` }} />
              </div>
              <div className="space-y-2">
                <label className="text-zinc-500 font-bold ml-1" style={{ fontSize: `${fontSize * 0.8}px` }}>직분</label>
                <input {...register("rank")} placeholder="예: 성도, 집사" className="w-full h-14 bg-white rounded-2xl px-5 shadow-sm border-none focus:ring-2 focus:ring-[#4A6741] outline-none" style={{ fontSize: `${fontSize}px` }} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-zinc-500 font-bold ml-1" style={{ fontSize: `${fontSize * 0.8}px` }}>소속 교회</label>
              <input {...register("church")} placeholder="교회명을 입력해주세요" className="w-full h-14 bg-white rounded-2xl px-5 shadow-sm border-none focus:ring-2 focus:ring-[#4A6741] outline-none" style={{ fontSize: `${fontSize}px` }} />
            </div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.98 }}
            disabled={!isPasswordMatch || !isUsernameValid} 
            className={`w-full h-16 font-black rounded-[24px] shadow-xl transition-all ${isPasswordMatch && isUsernameValid ? 'bg-[#4A6741] text-white shadow-green-900/10' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`} 
            type="submit"
            style={{ fontSize: `${fontSize * 1.1}px` }}
          >
            가입 완료하고 시작하기
          </motion.button>
        </form>
      </div>
    </div>
  );
}
