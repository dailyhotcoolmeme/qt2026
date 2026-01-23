import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const form = useForm({
    defaultValues: { username: "", password: "" }
  });

  // 1. 카카오 로그인 실행 함수
  const handleKakaoLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          // [수정] Hash(#) 방식에서는 href 대신 origin을 사용해야 404를 방지합니다.
          // 인증 후 메인으로 오면, 각 페이지의 리스너가 모달을 닫고 상태를 유지합니다.
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      alert("카카오 로그인 실패: " + error.message);
    }
  };

  const onSubmit = async (values: any) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${values.username}@church.com`,
        password: values.password
      });
      if (error) throw error;

      // [확인] 여기에 setLocation("/")이 없는 것이 맞습니다.
      // 로그인이 성공하면 ReadingPage.tsx 등 호출한 곳의 
      // onAuthStateChange 리스너가 감지하여 모달을 닫습니다.

    } catch (error: any) {
      alert("로그인 실패: " + error.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-white p-6 pt-20">
      <div className="w-full max-w-[400px] space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">환영합니다!</h1>
          <p className="text-gray-400 font-bold">오늘도 말씀으로 하루를 시작하세요.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-500 ml-1">아이디</Label>
            <Input 
              {...form.register("username")} 
              className="h-16 bg-gray-50 border-none rounded-2xl text-lg px-6 focus:ring-2 focus:ring-[#7180B9]" 
              placeholder="아이디 입력" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-500 ml-1">비밀번호</Label>
            <Input 
              {...form.register("password")} 
              type="password" 
              className="h-16 bg-gray-50 border-none rounded-2xl text-lg px-6 focus:ring-2 focus:ring-[#7180B9]" 
              placeholder="비밀번호 입력" 
            />
          </div>
          
          <Button 
            className="w-full h-16 bg-[#7180B9] text-white text-xl font-black rounded-2xl shadow-xl mt-4 active:scale-[0.98] transition-transform" 
            type="submit"
          >
            로그인하기
          </Button>

          <button 
            type="button"
            onClick={handleKakaoLogin}
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] text-xl font-black rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <img 
              src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" 
              className="w-6 h-6" 
              alt="kakao" 
            />
            카카오 로그인
          </button>

          <div className="pt-8 flex flex-col items-center gap-4 border-t border-gray-100">
            <p className="text-sm text-gray-400 font-bold">처음 방문하셨나요?</p>
            <Link href="/register" className="w-full">
              <a className="w-full h-16 flex items-center justify-center border-2 border-[#7180B9] text-[#7180B9] text-xl font-black rounded-2xl hover:bg-blue-50 transition-colors shadow-sm">
                회원가입 하러 가기
              </a>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
