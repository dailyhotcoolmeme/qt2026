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

  const handleKakaoLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
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
      setLocation("/");
    } catch (error: any) {
      alert("로그인 실패: " + error.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-[400px] space-y-12">
        
        {/* 헤더 부분: 정갈한 톤앤매너 */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">환영합니다!</h1>
          <p className="text-gray-400 font-bold">오늘도 말씀으로 하루를 시작하세요.</p>
        </div>

        <div className="space-y-6">
          {/* 1. 카카오 로그인 (최상단 배치) */}
          <button 
            type="button"
            onClick={handleKakaoLogin}
            className="w-full h-14 bg-[#FEE500] text-[#3C1E1E] text-lg font-black rounded-sm shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-5 h-5" alt="kakao" />
            카카오 로그인
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-300 font-bold tracking-widest">OR</span>
            </div>
          </div>

          {/* 2. 일반 로그인 폼 */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 ml-1">아이디</Label>
              <Input 
                {...form.register("username")} 
                className="h-14 bg-gray-50 border-none rounded-sm text-base px-5" 
                placeholder="아이디를 입력하세요" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 ml-1">비밀번호</Label>
              <Input 
                {...form.register("password")} 
                type="password" 
                className="h-14 bg-gray-50 border-none rounded-sm text-base px-5" 
                placeholder="비밀번호를 입력하세요" 
              />
            </div>
            
            <Button className="w-full h-14 bg-[#7180B9] text-white text-lg font-black rounded-sm shadow-md mt-2" type="submit">
              로그인하기
            </Button>
          </form>
        </div>

        {/* 하단 버튼 그룹: 깔끔한 정리 */}
        <div className="flex flex-col items-center gap-6 pt-4">
          <Link href="/register">
            <a className="text-sm text-gray-400 font-bold underline underline-offset-4 hover:text-[#7180B9]">
              회원가입이 필요하신가요?
            </a>
          </Link>

          {/* 3. 닫기 버튼 (사용자 요청사항: 하단 배치, 디자인 통일) */}
          <button 
            onClick={() => setLocation("/")}
            className="w-full h-14 bg-white border border-gray-200 text-gray-400 text-lg font-bold rounded-sm hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
