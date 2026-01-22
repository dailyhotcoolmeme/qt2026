import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { supabase } from "../lib/supabase"; 
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [showClassicLogin, setShowClassicLogin] = React.useState(false); // 기존 로그인 폼 숨김 상태 관리

  const form = useForm({
    defaultValues: { username: "", password: "" }
  });

  // 1. 카카오 로그인 실행 함수
  const handleKakaoLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          // 로그인 후 바로 /main 페이지로 리다이렉트
          redirectTo: `${window.location.origin}/main`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      alert("카카오 로그인 실패: " + error.message);
    }
  };

  // 2. 기존 이메일 로그인 함수
  const onSubmit = async (values: any) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${values.username}@church.com`,
        password: values.password
      });
      if (error) throw error;
      setLocation("/main");
    } catch (error: any) {
      alert("로그인 실패: " + error.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-[400px] space-y-12">
        
        {/* 헤더: 따뜻한 환영 인사 */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-black text-gray-900 leading-tight">
            당신만을 위한<br />신앙 기록 공간
          </h1>
          <p className="text-gray-400 font-bold">
            오늘도 나를 돌보는 시간을 가져보세요.
          </p>
        </div>

        <div className="space-y-4">
          {/* 메인 버튼 1: 카카오 로그인 */}
          <button 
            type="button"
            onClick={handleKakaoLogin}
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] text-lg font-black rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <img 
              src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" 
              className="w-6 h-6" 
              alt="kakao" 
            />
            카카오로 시작하기
          </button>

          {/* 메인 버튼 2: 둘러보기 (사용자님의 핵심 전략) */}
          <button 
            type="button"
            onClick={() => setLocation("/main")}
            className="w-full h-16 bg-white border-2 border-gray-100 text-gray-500 text-lg font-black rounded-2xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          >
            로그인 없이 둘러보기
          </button>
        </div>

        {/* 하단: 기존 로그인 방식 (필요할 때만 펼치기) */}
        <div className="pt-6 flex flex-col items-center">
          {!showClassicLogin ? (
            <button 
              onClick={() => setShowClassicLogin(true)}
              className="text-sm text-gray-300 underline font-medium"
            >
              기존 아이디로 로그인하기
            </button>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 ml-1">아이디</Label>
                <Input {...form.register("username")} className="h-14 bg-gray-50 border-none rounded-xl" placeholder="아이디 입력" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 ml-1">비밀번호</Label>
                <Input {...form.register("password")} type="password" className="h-14 bg-gray-50 border-none rounded-xl" placeholder="비밀번호 입력" />
              </div>
              <Button className="w-full h-14 bg-gray-900 text-white rounded-xl font-bold" type="submit">
                로그인
              </Button>
              <button 
                onClick={() => setShowClassicLogin(false)}
                className="w-full text-xs text-gray-300 py-2"
              >
                닫기
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
