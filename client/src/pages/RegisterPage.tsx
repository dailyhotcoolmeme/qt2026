import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase"; 
import { useLocation, Link } from "wouter";
import { RefreshCw, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const adjectives = ["은혜로운", "신실한", "지혜로운", "거룩한", "빛나는", "강건한"];
const nouns = ["예배자", "증인", "제자", "파수꾼", "등대", "밀알"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register, handleSubmit, setValue, watch } = useForm();
  
  const [usernameMsg, setUsernameMsg] = useState({ text: "", color: "" });
  const [nicknameMsg, setNicknameMsg] = useState({ text: "", color: "" });
  const [lastRecommendedNickname, setLastRecommendedNickname] = useState(""); 
  
  const username = (watch("username") || "").trim();
  const nickname = watch("nickname") || "";
  const password = watch("password") || "";
  const passwordConfirm = watch("passwordConfirm") || "";

  // 유효성 검사 로직
  const isPasswordMatch = password.length >= 8 && password === passwordConfirm;
  const showPasswordError = passwordConfirm.length > 0 && password !== passwordConfirm;
  const isUsernameValid = /^[A-Za-z0-9]{2,}$/.test(username);
  const isNicknameChanged = nickname !== lastRecommendedNickname;

  // 닉네임 추천 로직 (문구 수정 반영)
  const generateNickname = useCallback(() => {
    const nick = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 899 + 100)}`;
    setValue("nickname", nick);
    setLastRecommendedNickname(nick);
    setNicknameMsg({ text: "추천된 닉네임은 바로 사용 가능합니다 ✨", color: "text-blue-500" });
  }, [setValue]);

  useEffect(() => { generateNickname(); }, [generateNickname]);

  const checkDuplicate = async (field: "username" | "nickname", value: string) => {
    const setMsg = field === "username" ? setUsernameMsg : setNicknameMsg;
    
    if (field === "username") {
      if (!isUsernameValid) {
        return setMsg({ text: "영어 2글자 이상만 가능합니다. (한글/공백 불가)", color: "text-red-500" });
      }
    }

    try {
      const { data } = await supabase.from("profiles").select(field).eq(field, value).maybeSingle();
      if (data) setMsg({ text: "이미 사용 중입니다.", color: "text-red-500" });
      else setMsg({ text: "사용 가능합니다!", color: "text-blue-500" });
    } catch (e) { console.error(e); }
  };

  const onSubmit = async (values: any) => {
    if (!isPasswordMatch || !isUsernameValid) return;
    try {
      // ✅ [수정] 디자인 영향 없음: 회원가입 시 이름, 직분, 닉네임을 메타데이터로 함께 전송
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${values.username}@church.com`,
        password: values.password,
        options: {
          data: {
            name: values.fullName,     // 게시판의 user_name으로 연결됨
            title: values.rank || "성도", // 게시판의 user_title로 연결됨
            nickname: values.nickname  // 게시판의 user_nickname으로 연결됨
          }
        }
      });
      if (authError) throw authError;

      if (authData.user) {
        // 2. 프로필 저장 (기존 로직 유지)
        await supabase.from('profiles').insert([{
          id: authData.user.id,
          username: values.username,
          nickname: values.nickname,
          full_name: values.fullName,
          church: values.church,
          rank: values.rank || "성도",
        }]);

        // 3. 즉시 로그인 세션 생성 (자물쇠 현상 방지)
        await supabase.auth.signInWithPassword({
          email: `${values.username}@church.com`,
          password: values.password,
        });

        // 4. 메인으로 강제 새로고침 이동
        window.location.href = "/";
      }
    } catch (error: any) { alert(error.message); }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col p-6 animate-in fade-in duration-500 font-sans">
      <Link href="/auth">
        <a className="mb-6 flex items-center text-gray-400 font-bold gap-2">
          <ArrowLeft size={20}/> 로그인으로 돌아가기
        </a>
      </Link>

      <div className="max-w-[450px] mx-auto w-full space-y-8 pb-10">
        <h1 className="text-3xl font-black text-gray-900">회원가입</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 아이디 영역 */}
          <div className="space-y-2 font-bold">
            <Label className="text-gray-600">아이디</Label>
            <div className="flex gap-2">
              <Input {...register("username")} className="h-14 bg-gray-50 border-none rounded-2xl px-5" placeholder="영어로 2글자 이상 입력" />
              <Button type="button" onClick={() => checkDuplicate("username", username)} className="h-14 px-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">중복확인</Button>
            </div>
            {usernameMsg.text && <p className={`text-xs ml-2 font-bold ${usernameMsg.color}`}>{usernameMsg.text}</p>}
          </div>

          {/* 비밀번호 영역 */}
          <div className="grid grid-cols-2 gap-4 font-bold">
            <div className="space-y-2">
              <Label className="text-gray-600">비밀번호</Label>
              <Input {...register("password")} type="password" placeholder="8자 이상" className="h-14 bg-gray-50 border-none rounded-2xl px-5" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600">확인</Label>
              <Input {...register("passwordConfirm")} type="password" placeholder="한번 더" className={`h-14 bg-gray-50 border-none rounded-2xl px-5 ${showPasswordError ? 'ring-2 ring-red-500' : ''}`} />
              <div className="min-h-[20px] pt-1">
                {showPasswordError && <p className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertCircle size={12}/> 일치하지 않습니다.</p>}
                {isPasswordMatch && <p className="text-[10px] font-bold text-blue-500 flex items-center gap-1"><CheckCircle2 size={12}/> 비밀번호가 일치합니다.</p>}
              </div>
            </div>
          </div>

          {/* 닉네임 영역 */}
          <div className="space-y-2 font-bold">
            <div className="flex justify-between items-center">
              <Label className="text-[#7180B9]">닉네임 ✨</Label>
              <button type="button" onClick={generateNickname} className="text-xs text-gray-400 flex items-center gap-1 font-black">
                <RefreshCw size={14}/> 다른 닉네임 추천받기
              </button>
            </div>
            <div className="flex gap-2">
              <Input {...register("nickname")} className="h-14 bg-gray-50 border-none rounded-2xl px-5 font-bold text-[#7180B9]" />
              <Button 
                type="button" 
                disabled={!isNicknameChanged}
                onClick={() => checkDuplicate("nickname", nickname)} 
                className={`h-14 px-4 rounded-2xl font-bold shrink-0 transition-all ${isNicknameChanged ? 'bg-[#7180B9] text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
              >
                중복확인
              </Button>
            </div>
            {nicknameMsg.text && <p className={`text-xs ml-2 font-bold ${nicknameMsg.color}`}>{nicknameMsg.text}</p>}
          </div>

          {/* 선택 입력 정보 영역 */}
          <div className="pt-6 space-y-4 border-t border-gray-100 font-bold">
            <p className="text-xs text-gray-400 ml-1">선택 입력 정보 (선택사항)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs">이름</Label>
                <Input {...register("fullName")} placeholder="본명" className="h-14 bg-gray-50 border-none rounded-2xl px-5" />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs">직분</Label>
                <Input {...register("rank")} placeholder="예: 성도, 집사" className="h-14 bg-gray-50 border-none rounded-2xl px-5" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-500 text-xs">섬기시는 교회</Label>
              <Input {...register("church")} placeholder="교회명을 입력해주세요" className="h-14 bg-gray-50 border-none rounded-2xl px-5" />
            </div>
          </div>

          <Button 
            disabled={!isPasswordMatch || !isUsernameValid} 
            className={`w-full h-16 text-xl font-black rounded-2xl shadow-xl mt-6 transition-all ${isPasswordMatch && isUsernameValid ? 'bg-[#7180B9] text-white shadow-blue-100' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} 
            type="submit"
          >
            가입 완료하고 시작하기
          </Button>
        </form>
      </div>
    </div>
  );
}
